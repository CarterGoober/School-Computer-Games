// Server-side account and progression storage. Everything that can unlock an
// item, change a loadout or award currency happens here, never in the browser.
// The default store is an atomically written JSON file; see docs/DEPLOYMENT.md
// for moving to Postgres/Supabase for a larger audience.

import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_LOADOUT, STARTER_ITEMS, validLoadout, levelForXp
} from '../shared/catalog.js';
import { AuthError, hashPassword, validatePassword, validateUsername, verifyPassword } from './auth.js';

const MAX_ACCOUNTS = 50000;

function freshStats() {
  return { kills: 0, deaths: 0, assists: 0, heals: 0, damage: 0, matches: 0, wins: 0, shots: 0 };
}

function freshAccount({ id = randomUUID(), name, usernameKey = null, guest = true, salt = null, hash = null }) {
  return {
    id,
    name,
    usernameKey,
    guest,
    salt,
    hash,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    xp: 0,
    stardust: 0,
    owned: [...STARTER_ITEMS],
    loadout: { ...DEFAULT_LOADOUT },
    stats: freshStats()
  };
}

function guestName() {
  return `Runner-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function normalizeAccount(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
  const account = freshAccount({
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name ? raw.name.slice(0, 16) : guestName(),
    usernameKey: typeof raw.usernameKey === 'string' ? raw.usernameKey : null,
    guest: raw.guest !== false,
    salt: typeof raw.salt === 'string' ? raw.salt : null,
    hash: typeof raw.hash === 'string' ? raw.hash : null
  });
  account.createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : account.createdAt;
  account.lastSeenAt = typeof raw.lastSeenAt === 'string' ? raw.lastSeenAt : account.lastSeenAt;
  account.xp = Number.isFinite(raw.xp) && raw.xp >= 0 ? Math.floor(raw.xp) : 0;
  account.stardust = Number.isFinite(raw.stardust) && raw.stardust >= 0 ? Math.floor(raw.stardust) : 0;
  account.owned = [...new Set([
    ...STARTER_ITEMS,
    ...(Array.isArray(raw.owned) ? raw.owned.filter((id) => typeof id === 'string') : [])
  ])].slice(0, 64);
  account.loadout = validLoadout(raw.loadout, account);
  if (raw.stats && typeof raw.stats === 'object') {
    for (const key of Object.keys(account.stats)) {
      if (Number.isFinite(raw.stats[key]) && raw.stats[key] >= 0) {
        account.stats[key] = Math.floor(raw.stats[key]);
      }
    }
  }
  return account;
}

export class Store {
  constructor(file, options = {}) {
    this.file = file;
    this.accounts = new Map();
    this.usernameIndex = new Map();
    this.ready = false;
    this.flushChain = Promise.resolve();
    this.now = options.now || (() => Date.now());
  }

  async init() {
    try {
      await mkdir(path.dirname(this.file), { recursive: true });
      const raw = JSON.parse(await readFile(this.file, 'utf8'));
      if (raw && raw.version === 1 && raw.accounts && typeof raw.accounts === 'object') {
        for (const candidate of Object.values(raw.accounts)) {
          const account = normalizeAccount(candidate);
          if (!account) continue;
          this.accounts.set(account.id, account);
          if (account.usernameKey) this.usernameIndex.set(account.usernameKey, account.id);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        // A corrupt store is preserved rather than overwritten silently.
        const backup = `${this.file}.corrupt-${Date.now()}`;
        try { await rename(this.file, backup); } catch { /* best effort */ }
        console.error(`[store] could not read ${this.file}; moved it aside and started empty`);
      }
    }
    this.ready = true;
    return this;
  }

  get(accountId) {
    return this.accounts.get(accountId) || null;
  }

  findByUsername(key) {
    const id = this.usernameIndex.get(key);
    return id ? this.accounts.get(id) : null;
  }

  isNameTaken(key, exceptId = null) {
    const existing = this.findByUsername(key);
    return Boolean(existing && existing.id !== exceptId);
  }

  createGuest() {
    if (this.accounts.size >= MAX_ACCOUNTS) throw new AuthError('FULL', 'The arena is full. Try again later.');
    const account = freshAccount({ name: guestName() });
    this.accounts.set(account.id, account);
    this.persist();
    return account;
  }

  async createAccount(username, password) {
    const { name, key } = validateUsername(username);
    validatePassword(password);
    if (this.isNameTaken(key)) throw new AuthError('NAME_TAKEN', 'That runner name is taken.');
    if (this.accounts.size >= MAX_ACCOUNTS) throw new AuthError('FULL', 'The arena is full. Try again later.');
    const { salt, hash } = await hashPassword(password);
    if(this.isNameTaken(key))throw new AuthError('NAME_TAKEN','That runner name is taken.');
    const account = freshAccount({ name, usernameKey: key, guest: false, salt, hash });
    this.accounts.set(account.id, account);
    this.usernameIndex.set(key, account.id);
    this.persist();
    return account;
  }

  async upgradeGuest(accountId, username, password) {
    const account = this.get(accountId);
    if (!account) throw new AuthError('NO_ACCOUNT', 'Session expired. Reload to continue.');
    if (!account.guest) throw new AuthError('ALREADY_LINKED', 'This profile already has an account. Log in instead.');
    const { name, key } = validateUsername(username);
    validatePassword(password);
    if (this.isNameTaken(key)) throw new AuthError('NAME_TAKEN', 'That runner name is taken.');
    const { salt, hash } = await hashPassword(password);
    if(this.isNameTaken(key,accountId))throw new AuthError('NAME_TAKEN','That runner name is taken.');
    account.name = name;
    account.usernameKey = key;
    account.guest = false;
    account.salt = salt;
    account.hash = hash;
    this.usernameIndex.set(key, account.id);
    this.persist();
    return account;
  }

  async login(username, password) {
    const { key } = validateUsername(username);
    const account = this.findByUsername(key);
    // Always run a hash comparison so unknown names and wrong passwords take
    // comparable time and cannot be trivially enumerated.
    const salt = account?.salt || '00000000000000000000000000000000';
    const hash = account?.hash || '00'.repeat(64);
    const valid = await verifyPassword(password, salt, hash);
    if (!account || !valid) throw new AuthError('BAD_LOGIN', 'Name or password is incorrect.');
    account.lastSeenAt = new Date().toISOString();
    this.persist();
    return account;
  }

  touch(accountId) {
    const account = this.get(accountId);
    if (!account) return null;
    account.lastSeenAt = new Date().toISOString();
    this.persist();
    return account;
  }

  buy(accountId, itemId, items) {
    const account = this.get(accountId);
    if (!account) return { ok: false, code: 'NO_ACCOUNT', error: 'Session expired.' };
    const item = items[itemId];
    if (!item) return { ok: false, code: 'NO_ITEM', error: 'That item does not exist.' };
    if (account.owned.includes(itemId)) return { ok: false, code: 'OWNED', error: 'You already own that.' };
    if (levelForXp(account.xp) < item.level) {
      return { ok: false, code: 'LEVEL', error: `Reach level ${item.level} to unlock this.` };
    }
    if (account.stardust < item.price) {
      return { ok: false, code: 'FUNDS', error: `You need ${item.price - account.stardust} more Stardust.` };
    }
    account.stardust -= item.price;
    account.owned.push(itemId);
    this.persist();
    return { ok: true, account };
  }

  setLoadout(accountId, loadout) {
    const account = this.get(accountId);
    if (!account) return { ok: false, code: 'NO_ACCOUNT', error: 'Session expired.' };
    account.loadout = validLoadout(loadout, account);
    this.persist();
    return { ok: true, account };
  }

  recordMatch(accountId, result) {
    const account = this.get(accountId);
    if (!account) return null;
    const xp = Math.max(0, Math.floor(result.xp || 0));
    const stardust = Math.max(0, Math.floor(result.stardust || 0));
    account.xp += xp;
    account.stardust += stardust;
    account.stats.matches += 1;
    if (result.won) account.stats.wins += 1;
    for (const key of ['kills', 'deaths', 'assists', 'heals', 'damage', 'shots']) {
      const value = result.stats?.[key];
      if (Number.isFinite(value) && value > 0) account.stats[key] += Math.floor(value);
    }
    account.lastSeenAt = new Date().toISOString();
    this.persist();
    return account;
  }

  persist() {
    const snapshot = {
      version: 1,
      accounts: Object.fromEntries([...this.accounts].map(([id, account]) => [id, account]))
    };
    this.flushChain = this.flushChain.then(async () => {
      const temp = `${this.file}.${process.pid}.tmp`;
      await mkdir(path.dirname(this.file), { recursive: true });
      await writeFile(temp, JSON.stringify(snapshot), 'utf8');
      await rename(temp, this.file);
    }).catch((error) => {
      console.error('[store] write failed:', error.message);
    });
    return this.flushChain;
  }

  async flush() {
    await this.flushChain;
  }
}
