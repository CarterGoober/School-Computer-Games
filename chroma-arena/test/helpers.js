import { WebSocket } from 'ws';
import { DEFAULT_LOADOUT, STARTER_ITEMS } from '../shared/catalog.js';

export function makeAccount(overrides = {}) {
  return {
    id: overrides.id || `acct-${Math.random().toString(36).slice(2, 10)}`,
    name: overrides.name || 'Test Runner',
    guest: false,
    xp: 0,
    stardust: 0,
    owned: [...STARTER_ITEMS],
    loadout: { ...DEFAULT_LOADOUT },
    level: 1,
    stats: { kills: 0, deaths: 0, assists: 0, heals: 0, damage: 0, matches: 0, wins: 0, shots: 0 },
    ...overrides
  };
}

export function openSocket(port) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

export function inbox(socket) {
  const queue = [];
  const waiters = [];
  socket.on('message', (data) => {
    let message;
    try { message = JSON.parse(data.toString()); } catch { return; }
    const index = waiters.findIndex((waiter) => waiter.predicate(message));
    if (index !== -1) {
      const waiter = waiters.splice(index, 1)[0];
      waiter.resolve(message);
      return;
    }
    queue.push(message);
  });

  return {
    send(message) {
      socket.send(JSON.stringify(message));
    },
    next(type, timeout = 4000) {
      return this.nextWhere((message) => message.t === type, timeout, type);
    },
    nextWhere(predicate, timeout = 4000, label = 'message') {
      const index = queue.findIndex(predicate);
      if (index !== -1) return Promise.resolve(queue.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { type: label, predicate, resolve: null, timer: null };
        waiter.timer = setTimeout(() => {
          const position = waiters.indexOf(waiter);
          if (position !== -1) waiters.splice(position, 1);
          reject(new Error(`Timed out waiting for "${label}"`));
        }, timeout);
        waiter.resolve = (message) => { clearTimeout(waiter.timer); resolve(message); };
        waiters.push(waiter);
      });
    },
    drain() {
      queue.length = 0;
    }
  };
}

export async function waitFor(predicate, timeout = 3000, interval = 25) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timed out waiting for condition');
}
