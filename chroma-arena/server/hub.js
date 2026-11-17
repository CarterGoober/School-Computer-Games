// Connection lifecycle, matchmaking queues and account-scoped messages.
// The hub is deliberately independent of the HTTP server so tests can drive it
// with fake sockets or by importing the match engine directly.

import { randomUUID } from 'node:crypto';
import {
  QUEUE_SIZES, MAX_CLIENTS, RECONNECT_GRACE_MS, TEAM_NAMES
} from '../shared/protocol.js';
import { ITEMS, publicProfile, shopListing, GAME_NAME, TAGLINE, CURRENCY, levelForXp } from '../shared/catalog.js';
import { verifyToken } from './auth.js';
import { Match } from './match.js';
import { formMatch, planTeams } from './matchmaking.js';

const AUTH_WINDOW_MS = 60000;
const AUTH_ATTEMPTS_PER_WINDOW = 20;
const MAX_MESSAGES_PER_SECOND = 200;

export class Hub {
  constructor(options) {
    this.store = options.store;
    this.secret = options.secret;
    this.botsEnabled = options.botsEnabled !== false;
    this.botFillDelayMs = options.botFillDelayMs ?? 6000;
    this.now = options.now || (() => Date.now());

    this.connections = new Map();
    this.byAccount = new Map();
    this.queues = new Map(QUEUE_SIZES.map((size) => [size, []]));
    this.matches = new Map();
    this.matchByAccount = new Map();
    this.authAttempts = new Map();
    this.sequence = 0;

    this.pumpTimer = setInterval(() => this.pumpQueues(), 500);
    this.pumpTimer.unref?.();
  }

  onlineCount() {
    let count = 0;
    for (const conn of this.connections.values()) if (conn.accountId) count += 1;
    return count;
  }

  queueCounts() {
    return Object.fromEntries([...this.queues].map(([size, queue]) => [size, queue.length]));
  }

  safeSend(conn, message) {
    if (!conn || !conn.socket || conn.socket.readyState !== 1) return;
    try {
      conn.socket.send(JSON.stringify(message));
    } catch {
      // A closing socket is handled by its close event.
    }
  }

  sendById(connId, message) {
    this.safeSend(this.connections.get(connId), message);
  }

  closeConn(conn, reason) {
    if (!conn || !conn.socket) return;
    conn.accountId = null;
    try { conn.socket.close(1008, reason); } catch { /* already closed */ }
  }

  handleSocket(socket, request) {
    if (this.connections.size >= MAX_CLIENTS) {
      try { socket.close(1013, 'Arena is full'); } catch { /* noop */ }
      return;
    }
    const conn = {
      id: `c${++this.sequence}`,
      socket,
      request,
      ip: request?.socket?.remoteAddress || 'unknown',
      accountId: null,
      authed: false,
      match: null,
      queueSize: 0,
      messageWindowStart: Date.now(),
      messageCount: 0
    };
    this.connections.set(conn.id, conn);
    this.safeSend(conn, {
      t: 'hello',
      game: GAME_NAME,
      tagline: TAGLINE,
      protocol: 1,
      queueSizes: QUEUE_SIZES
    });

    const authTimer = setTimeout(() => {
      if (!conn.authed) this.closeConn(conn, 'Authentication timeout');
    }, 10000);
    authTimer.unref?.();

    socket.on('message', (data) => this.receive(conn, data));
    socket.on('close', () => this.handleClose(conn));
    socket.on('error', () => this.handleClose(conn));
  }

  receive(conn, data) {
    const now = Date.now();
    if (now - conn.messageWindowStart > 1000) {
      conn.messageWindowStart = now;
      conn.messageCount = 0;
    }
    conn.messageCount += 1;
    if (conn.messageCount > MAX_MESSAGES_PER_SECOND) {
      this.closeConn(conn, 'Too many messages');
      return;
    }
    const text = typeof data === 'string' ? data : data.toString('utf8');
    if (text.length > 8192) {
      this.closeConn(conn, 'Message too large');
      return;
    }
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (!message || typeof message.t !== 'string') return;

    if (message.t === 'ping') {
      this.safeSend(conn, { t: 'pong', at: Date.now() });
      return;
    }
    if (message.t === 'auth') {
      this.handleAuth(conn, message);
      return;
    }
    if (!conn.authed) {
      this.safeSend(conn, { t: 'error', code: 'AUTH', message: 'Sign in first.' });
      return;
    }
    if (message.t === 'queue') this.handleQueue(conn, message);
    else if (message.t === 'cancel') this.handleCancel(conn);
    else if (message.t === 'leave') this.handleLeave(conn);
    else if (message.t === 'loadout') this.handleLoadout(conn, message);
    else if (message.t === 'buy') this.handleBuy(conn, message);
    else this.handleMatchMessage(conn, message);
  }

  authAllowed(ip) {
    const now = Date.now();
    const entry = this.authAttempts.get(ip);
    if (!entry || now - entry.start > AUTH_WINDOW_MS) {
      this.authAttempts.set(ip, { start: now, count: 1 });
      return true;
    }
    entry.count += 1;
    if (entry.count > AUTH_ATTEMPTS_PER_WINDOW) return false;
    return true;
  }

  handleAuth(conn, message) {
    if (!this.authAllowed(conn.ip)) {
      this.safeSend(conn, { t: 'authError', code: 'RATE', message: 'Too many attempts. Wait a minute.' });
      this.closeConn(conn, 'Auth rate limit');
      return;
    }
    const payload = verifyToken(this.secret, message.token);
    const account = payload ? this.store.get(payload.sub) : null;
    if (!account) {
      this.safeSend(conn, { t: 'authError', code: 'TOKEN', message: 'Session expired. Reloading your runner.' });
      return;
    }

    const previous = this.byAccount.get(account.id);
    if (previous && previous !== conn) {
      previous.accountId = null;
      this.removeFromQueue(previous);
      this.closeConn(previous, 'Session replaced');
    }

    conn.accountId = account.id;
    conn.authed = true;
    this.byAccount.set(account.id, conn);
    this.store.touch(account.id);
    this.safeSend(conn, {
      t: 'ready',
      profile: publicProfile(account),
      game: { name: GAME_NAME, tagline: TAGLINE, currency: CURRENCY, map: 'Sundae Square' },
      queueSizes: QUEUE_SIZES,
      queues: this.queueCounts(),
      catalog: shopListing(account)
    });

    const entry = this.matchByAccount.get(account.id);
    if (entry && entry.match.running) {
      const player = entry.match.reconnect(account.id, conn.id);
      if (player) {
        conn.match = entry.match;
        this.safeSend(conn, entry.match.resumePayload(player));
        this.broadcastQueueCounts();
        return;
      }
      this.matchByAccount.delete(account.id);
    }
  }

  handleQueue(conn, message) {
    if (conn.match) {
      this.safeSend(conn, { t: 'error', code: 'IN_MATCH', message: 'You are already in a match.' });
      return;
    }
    const size = Number(message.size);
    if (!QUEUE_SIZES.includes(size)) {
      this.safeSend(conn, { t: 'error', code: 'BAD_SIZE', message: 'Choose 1v1, 2v2 or 5v5.' });
      return;
    }
    this.removeFromQueue(conn);
    this.queues.get(size).push({ connId: conn.id, accountId: conn.accountId, joinedAt: this.now() });
    conn.queueSize = size;
    const queue = this.queues.get(size);
    this.safeSend(conn, {
      t: 'queued', size, position: queue.length, queueLength: queue.length,
      botFillDelayMs: this.botsEnabled ? this.botFillDelayMs : null
    });
    this.broadcastQueueCounts();
  }

  handleCancel(conn) {
    if (this.removeFromQueue(conn)) {
      this.safeSend(conn, { t: 'queueLeft' });
      this.broadcastQueueCounts();
    }
  }

  removeFromQueue(conn) {
    if (!conn.queueSize) return false;
    const queue = this.queues.get(conn.queueSize);
    const index = queue ? queue.findIndex((entry) => entry.connId === conn.id) : -1;
    if (index !== -1) queue.splice(index, 1);
    conn.queueSize = 0;
    return index !== -1;
  }

  broadcastQueueCounts() {
    const message = { t: 'queues', counts: this.queueCounts() };
    for (const conn of this.connections.values()) {
      if (conn.authed && !conn.match) this.safeSend(conn, message);
    }
  }

  pumpQueues() {
    for (const size of QUEUE_SIZES) {
      const queue = this.queues.get(size);
      let guard = 0;
      while (queue.length > 0 && guard++ < 20) {
        const entries = formMatch(queue, size, {
          now: this.now(),
          botFillDelayMs: this.botFillDelayMs,
          botsEnabled: this.botsEnabled
        });
        if (!entries) break;

        const valid = entries.filter((entry) => {
          const conn = this.connections.get(entry.connId);
          return conn && conn.accountId && !conn.match;
        });
        for (const entry of entries) {
          if (!valid.includes(entry)) {
            const conn = this.connections.get(entry.connId);
            if (conn) conn.queueSize = 0;
          }
        }
        if (valid.length === 0) continue;
        if (!this.botsEnabled && valid.length < size * 2) {
          for (const entry of valid) {
            queue.unshift(entry);
            const conn = this.connections.get(entry.connId);
            if (conn) conn.queueSize = size;
          }
          break;
        }
        this.startMatch(size, valid);
      }
    }
  }

  startMatch(size, entries) {
    const conns = entries.map((entry) => this.connections.get(entry.connId))
      .filter((conn) => conn && conn.accountId && !conn.match);
    if (conns.length === 0) return null;

    const humans = conns.map((conn) => ({
      connId: conn.id,
      account: this.store.get(conn.accountId)
    })).filter((human) => human.account);
    if (humans.length === 0) return null;

    const plan = planTeams(humans, size);
    const match = new Match({
      size,
      seated: plan.seated,
      botCounts: plan.botCounts,
      emit: (connId, message) => this.sendById(connId, message),
      onEnd: (finished) => this.finishMatch(finished),
      now: this.now
    });

    this.matches.set(match.id, match);
    for (const human of plan.seated) {
      const conn = this.connections.get(human.connId);
      if (!conn) continue;
      conn.queueSize = 0;
      conn.match = match;
      this.matchByAccount.set(human.account.id, { match, playerId: null });
    }
    for (const player of match.players) {
      if (!player.accountId) continue;
      const entry = this.matchByAccount.get(player.accountId);
      if (entry) entry.playerId = player.id;
    }

    match.start();
    this.broadcastQueueCounts();
    return match;
  }

  handleMatchMessage(conn, message) {
    const match = conn.match;
    if (!match || !match.running) return;
    if (message.t === 'input') match.setInput(conn.accountId, message);
    else if (message.t === 'fire') match.fireFor(conn.accountId, message.yaw, message.pitch);
    else if (message.t === 'melee') match.meleeFor(conn.accountId, message.yaw);
    else if (message.t === 'heal') match.healFor(conn.accountId);
    else if (message.t === 'reload') match.reloadFor(conn.accountId);
  }

  handleLeave(conn) {
    if (!conn.match) return;
    const match = conn.match;
    match.leave(conn.accountId);
    conn.match = null;
    this.matchByAccount.delete(conn.accountId);
    if (match.running) this.safeSend(conn, { t: 'leftMatch' });
    this.broadcastQueueCounts();
  }

  handleLoadout(conn, message) {
    if (conn.match) {
      this.safeSend(conn, { t: 'error', code: 'IN_MATCH', message: 'Finish the match before editing your loadout.' });
      return;
    }
    const result = this.store.setLoadout(conn.accountId, message.loadout);
    if (!result.ok) {
      this.safeSend(conn, { t: 'error', code: result.code, message: result.error });
      return;
    }
    this.safeSend(conn, {
      t: 'profile',
      profile: publicProfile(result.account),
      catalog: shopListing(result.account)
    });
  }

  handleBuy(conn, message) {
    if (conn.match) {
      this.safeSend(conn, { t: 'error', code: 'IN_MATCH', message: 'Finish the match before visiting the shop.' });
      return;
    }
    const result = this.store.buy(conn.accountId, message.itemId, ITEMS);
    if (!result.ok) {
      this.safeSend(conn, {
        t: 'shopResult', ok: false, code: result.code, message: result.error,
        profile: publicProfile(this.store.get(conn.accountId)),
        catalog: shopListing(this.store.get(conn.accountId))
      });
      return;
    }
    this.safeSend(conn, {
      t: 'shopResult', ok: true,
      message: `Unlocked ${ITEMS[message.itemId].name}.`,
      profile: publicProfile(result.account),
      catalog: shopListing(result.account)
    });
  }

  finishMatch(match) {
    if (match.settled) return;
    match.settled = true;
    for (const result of match.results || []) {
      const account = this.store.recordMatch(result.accountId, {
        xp: result.xp,
        stardust: result.stardust,
        won: result.won,
        stats: result.stats
      });
      const conn = this.byAccount.get(result.accountId);
      if (conn && conn.match === match) {
        conn.match = null;
        this.safeSend(conn, {
          t: 'matchEnd',
          matchId: match.id,
          size: match.size,
          reason: match.reason,
          winnerTeam: match.winnerTeam,
          score: [...match.score],
          duration: Math.round(match.time),
          you: {
            playerId: result.playerId,
            name: result.name,
            team: result.team,
            won: result.won,
            xp: result.xp,
            stardust: result.stardust,
            stats: result.stats
          },
          profile: account ? publicProfile(account) : null
        });
      }
      this.matchByAccount.delete(result.accountId);
    }
    for (const [accountId, entry] of [...this.matchByAccount]) {
      if (entry.match === match) this.matchByAccount.delete(accountId);
    }
    this.matches.delete(match.id);
    this.store.flush();
    this.broadcastQueueCounts();
  }

  handleClose(conn) {
    if (conn.closed) return;
    conn.closed = true;
    this.connections.delete(conn.id);
    this.removeFromQueue(conn);
    if (conn.accountId && this.byAccount.get(conn.accountId) === conn) {
      this.byAccount.delete(conn.accountId);
      if (conn.match && conn.match.running) conn.match.disconnect(conn.accountId);
    }
    this.broadcastQueueCounts();
  }

  stop() {
    clearInterval(this.pumpTimer);
    for (const match of this.matches.values()) match.stop();
    for (const conn of [...this.connections.values()]) this.closeConn(conn, 'Server shutting down');
    this.connections.clear();
    this.byAccount.clear();
    for (const queue of this.queues.values()) queue.length = 0;
  }
}
