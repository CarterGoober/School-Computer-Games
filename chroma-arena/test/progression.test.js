import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { Store } from '../server/store.js';
import {
  AuthError, issueToken, verifyToken, hashPassword, verifyPassword
} from '../server/auth.js';
import { ITEMS, DEFAULT_LOADOUT } from '../shared/catalog.js';

const SECRET = 'test-secret-'.padEnd(40, 'x');

async function withStore(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'chroma-store-'));
  const store = await new Store(path.join(dir, 'accounts.json')).init();
  try {
    await run(store, path.join(dir, 'accounts.json'));
  } finally {
    await store.flush();
    await rm(dir, { recursive: true, force: true });
  }
}

test('guests start with the starter kit and persist between loads', async () => {
  await withStore(async (store, file) => {
    const guest = store.createGuest();
    assert.equal(guest.guest, true);
    assert.deepEqual(guest.owned.sort(), ['citrus', 'foamBat', 'juiceBox', 'popPistol'].sort());
    assert.deepEqual(guest.loadout, DEFAULT_LOADOUT);
    await store.flush();

    const reloaded = await new Store(file).init();
    const again = reloaded.get(guest.id);
    assert.ok(again);
    assert.equal(again.name, guest.name);
    assert.equal(again.guest, true);
  });
});

test('runner names are unique case-insensitively and passwords are hashed', async () => {
  await withStore(async (store) => {
    const account = await store.createAccount('Nova_7', 'hunter2hunter2');
    assert.equal(account.guest, false);
    assert.notEqual(account.hash, 'hunter2hunter2');
    assert.equal(account.hash.length, 128);
    assert.equal(account.salt.length, 32);

    await assert.rejects(
      store.createAccount('nova_7', 'anotherpassword'),
      (error) => error instanceof AuthError && error.code === 'NAME_TAKEN'
    );
    await assert.rejects(
      store.login('Nova_7', 'wrongpassword'),
      (error) => error instanceof AuthError && error.code === 'BAD_LOGIN'
    );
    const loggedIn = await store.login('nova_7', 'hunter2hunter2');
    assert.equal(loggedIn.id, account.id);
  });
});

test('guests can be upgraded to a saved account without losing progress', async () => {
  await withStore(async (store) => {
    const guest = store.createGuest();
    guest.xp = 420;
    guest.stardust = 77;
    guest.owned.push('mint');
    const upgraded = await store.upgradeGuest(guest.id, 'Keeper', 'longpassword');
    assert.equal(upgraded.guest, false);
    assert.equal(upgraded.xp, 420);
    assert.equal(upgraded.stardust, 77);
    assert.ok(upgraded.owned.includes('mint'));
    assert.equal(store.findByUsername('keeper').id, guest.id);
  });
});

test('purchases enforce level, funds and ownership', async () => {
  await withStore(async (store) => {
    const account = await store.createAccount('Shopper', 'longpassword');
    account.stardust = 1000;

    const locked = store.buy(account.id, 'glacierLance', ITEMS);
    assert.equal(locked.ok, false);
    assert.equal(locked.code, 'LEVEL');

    account.xp = 600; // level 3
    const bought = store.buy(account.id, 'bubbleSmg', ITEMS);
    assert.equal(bought.ok, true, 'level 2 item is available at level 3');
    assert.equal(account.stardust, 650);
    assert.ok(account.owned.includes('bubbleSmg'));

    const duplicate = store.buy(account.id, 'bubbleSmg', ITEMS);
    assert.equal(duplicate.code, 'OWNED');

    account.xp = 2000; // level 5
    const poor = store.buy(account.id, 'glacierLance', ITEMS);
    assert.equal(poor.ok, false);
    assert.equal(poor.code, 'FUNDS');
    assert.equal(account.owned.includes('glacierLance'), false);
  });
});

test('loadout edits are validated against ownership', async () => {
  await withStore(async (store) => {
    const account = await store.createAccount('Fitter', 'longpassword');
    account.owned.push('mint');
    const saved = store.setLoadout(account.id, { ...DEFAULT_LOADOUT, style: 'mint' });
    assert.equal(saved.ok, true);
    assert.equal(account.loadout.style, 'mint');

    store.setLoadout(account.id, { ...DEFAULT_LOADOUT, style: 'chrome', gun: 'glacierLance' });
    assert.equal(account.loadout.gun, 'popPistol', 'unowned gun falls back');
    assert.equal(account.loadout.style, 'citrus', 'unowned style falls back');
  });
});

test('match results add xp, stardust and lifetime stats', async () => {
  await withStore(async (store) => {
    const account = await store.createAccount('Climber', 'longpassword');
    const updated = store.recordMatch(account.id, {
      xp: 260, stardust: 64, won: true,
      stats: { kills: 5, deaths: 2, assists: 1, heals: 2, damage: 700, shots: 40 }
    });
    assert.equal(updated.xp, 260);
    assert.equal(updated.stardust, 64);
    assert.equal(updated.stats.matches, 1);
    assert.equal(updated.stats.wins, 1);
    assert.equal(updated.stats.kills, 5);
  });
});

test('session tokens cannot be forged or extended', () => {
  const token = issueToken(SECRET, 'account-1');
  const payload = verifyToken(SECRET, token);
  assert.equal(payload.sub, 'account-1');

  assert.equal(verifyToken(SECRET, `${token.slice(0, -2)}xx`), null);
  assert.equal(verifyToken('a-different-secret-that-is-long-enough', token), null);
  assert.equal(verifyToken(SECRET, issueToken(SECRET, 'account-2', -1000)), null);
  assert.equal(verifyToken(SECRET, 'not-a-token'), null);
});

test('password hashing verifies only the right password', async () => {
  const { salt, hash } = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', salt, hash), true);
  assert.equal(await verifyPassword('wrong horse battery', salt, hash), false);
  assert.equal(await verifyPassword('anything', 'bad', 'bad'), false);
});
