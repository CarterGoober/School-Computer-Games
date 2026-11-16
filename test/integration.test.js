import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { createGameServer } from '../server/index.js';
import { openSocket, inbox } from './helpers.js';

async function startServer() {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'chroma-server-'));
  const instance = await createGameServer({
    dataDir,
    secret: 'integration-secret-'.padEnd(48, 'y'),
    botFillDelayMs: 0,
    botsEnabled: true
  });
  await new Promise((resolve) => instance.server.listen(0, '127.0.0.1', resolve));
  const port = instance.server.address().port;
  return {
    ...instance,
    port,
    base: `http://127.0.0.1:${port}`,
    async cleanup() {
      await instance.close();
      await rm(dataDir, { recursive: true, force: true });
    }
  };
}

async function api(base, route, options = {}) {
  const response = await fetch(`${base}${route}`, options);
  let body = {};
  try { body = await response.json(); } catch { /* not JSON */ }
  return { response, body };
}

async function session(base) {
  const { response, body } = await api(base, '/api/session', { method: 'POST' });
  assert.equal(response.status, 200);
  return body;
}

async function connectRunner(base, port, token) {
  let activeToken = token;
  if (!activeToken) {
    const created = await session(base);
    activeToken = created.token;
  }
  const socket = await openSocket(port);
  const box = inbox(socket);
  box.send({ t: 'auth', token: activeToken });
  const ready = await box.next('ready');
  return { socket, box, token: activeToken, ready };
}

test('HTTP API, security boundaries and static hosting', async (t) => {
  const server = await startServer();
  t.after(() => server.cleanup());
  const { base } = server;

  const health = await api(base, '/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.game, 'Chroma Clash');
  assert.deepEqual(health.body.queueSizes, [1, 2, 5]);

  const landing = await fetch(`${base}/`);
  assert.equal(landing.status, 200);
  const landingHtml = await landing.text();
  assert.match(landingHtml, /Chroma/i);
  assert.match(landingHtml, /chroma\//);
  assert.match(landing.headers.get('content-security-policy'), /frame-ancestors/);

  const game = await fetch(`${base}/chroma/`);
  assert.equal(game.status, 200);
  const gameHtml = await game.text();
  assert.match(gameHtml, /YOUR RUNNER/);
  assert.match(gameHtml, /dist\/game\.js/);
  assert.match(gameHtml, /config\.js/);

  const bundle = await fetch(`${base}/chroma/dist/game.js`);
  assert.equal(bundle.status, 200);
  assert.match(bundle.headers.get('content-type'), /javascript/);
  assert.match(await bundle.text(), /Chroma Clash|CHROMA/);

  for (const blocked of ['/server/index.js', '/server/store.js', '/package.json', '/.server-data/accounts.json', '/shared/catalog.js', '/test/integration.test.js']) {
    const response = await fetch(`${base}${blocked}`);
    assert.equal(response.status, 404, `${blocked} must not be served`);
  }

  const created = await session(base);
  assert.equal(created.profile.guest, true);
  assert.ok(created.profile.owned.includes('popPistol'));
  assert.ok(created.token.split('.').length === 2);

  const profile = await api(base, '/api/profile', {
    headers: { Authorization: `Bearer ${created.token}` }
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.profile.id, created.profile.id);

  const unauthorized = await api(base, '/api/profile');
  assert.equal(unauthorized.response.status, 401);

  const forged = await api(base, '/api/profile', {
    headers: { Authorization: `Bearer ${created.token.slice(0, -3)}abc` }
  });
  assert.equal(forged.response.status, 401);

  const preflight = await fetch(`${base}/api/session`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST'
    }
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:3000');

  const blockedOrigin = await fetch(`${base}/api/session`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://not-the-garage.example',
      'Access-Control-Request-Method': 'POST'
    }
  });
  assert.equal(blockedOrigin.status, 403);

  const badLogin = await api(base, '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Nobody', password: 'longpassword' })
  });
  assert.equal(badLogin.response.status, 400);
  assert.equal(badLogin.body.code, 'BAD_LOGIN');

  const register = await api(base, '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Integration', password: 'longpassword' })
  });
  assert.equal(register.response.status, 200);
  assert.equal(register.body.profile.name, 'Integration');
  assert.equal(register.body.profile.guest, false);

  const duplicate = await api(base, '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'integration', password: 'longpassword' })
  });
  assert.equal(duplicate.response.status, 400);
  assert.equal(duplicate.body.code, 'NAME_TAKEN');
});

test('two runners matchmake, fight and reconnect through a real WebSocket', async (t) => {
  const server = await startServer();
  const runners = [];
  t.after(async () => {
    for (const runner of runners) {
      try { runner.socket.close(); } catch { /* noop */ }
    }
    await server.cleanup();
  });

  const alpha = await connectRunner(server.base, server.port);
  const beta = await connectRunner(server.base, server.port);
  runners.push(alpha, beta);
  assert.equal(alpha.ready.profile.guest, true);

  alpha.box.send({ t: 'queue', size: 2 });
  const queued = await alpha.box.next('queued');
  assert.equal(queued.size, 2);

  beta.box.send({ t: 'queue', size: 2 });
  await beta.box.next('queued');

  const [startA, startB] = await Promise.all([
    alpha.box.next('matchStart', 8000),
    beta.box.next('matchStart', 8000)
  ]);
  assert.equal(startA.matchId, startB.matchId);
  assert.equal(startA.players.length, 4, '2v2 fills two bot slots');
  assert.notEqual(startA.team, startB.team);

  const state = await alpha.box.next('state');
  assert.equal(state.players.length, 4);
  assert.equal(typeof state.timeLeft, 'number');

  alpha.box.send({ t: 'fire', yaw: 0, pitch: 0 });
  const shot = await beta.box.nextWhere(
    (message) => message.t === 'fx' && message.kind === 'shot' && message.shooter === startA.you,
    5000
  );
  assert.equal(shot.gun, 'popPistol');

  alpha.socket.close();
  const left = await beta.box.nextWhere(
    (message) => message.t === 'fx' && message.kind === 'left' && message.player.id === startA.you,
    6000
  );
  assert.equal(left.reconnectMs > 0, true);

  const resumedRunner = await connectRunner(server.base, server.port, alpha.token);
  runners.push(resumedRunner);
  const resume = await resumedRunner.box.next('matchResume', 6000);
  assert.equal(resume.matchId, startA.matchId);
  assert.equal(resume.you, startA.you);
  assert.equal(resume.players.find((player) => player.id === resume.you).connected, true);
});

test('the shop endpoint refuses purchases without funds and keeps ownership server-side', async (t) => {
  const server = await startServer();
  t.after(() => server.cleanup());
  const created = await session(server.base);

  const buy = await api(server.base, '/api/shop/buy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${created.token}`
    },
    body: JSON.stringify({ itemId: 'bubbleSmg' })
  });
  assert.equal(buy.response.status, 400);
  assert.equal(buy.body.ok, false);
  assert.match(buy.body.error, /Stardust|level/i);

  const forgedBuy = await api(server.base, '/api/shop/buy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer made-up-token'
    },
    body: JSON.stringify({ itemId: 'bubbleSmg' })
  });
  assert.equal(forgedBuy.response.status, 401);
});
