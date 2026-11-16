// Chroma Clash client entry point: session, lobby wiring, input prediction,
// match lifecycle and HUD updates. The server remains authoritative.

import { Net } from './net.js';
import { Controls } from './input.js';
import { SceneView } from './view.js';
import { UI } from './ui.js';
import { Sfx } from './audio.js';
import { MAP } from '../../shared/map.js';
import { GUNS } from '../../shared/catalog.js';
import { stepMovement } from '../../shared/movement.js';
import { INPUT_SEND_HZ } from '../../shared/protocol.js';

const canvas = document.getElementById('scene');
const net = new Net();
const sfx = new Sfx();

let view = null;
let controls = null;
let profile = null;
let catalog = [];
let match = null;
let loadout = null;
let selfId = null;
let local = null;
let latestSnapshot = null;
let running = false;
let paused = false;
let alive = false;
let suppressPause = false;
let resumedDuringReconnect = false;
let queuedSize = 0;
let lastSelfHealth = 100;
let respawnDeadline = 0;
let lastFireAt = 0;
let pendingJump = false;
let inputAccumulator = 0;
let reconnectTimer = null;
let recoveringSession = false;

let sensitivity = 1;
try {
  const saved = Number.parseFloat(localStorage.getItem('chroma-sensitivity') || '');
  if (Number.isFinite(saved) && saved >= 0.6 && saved <= 2.4) sensitivity = saved;
} catch { /* storage disabled */ }

const ui = new UI({
  onSound: (name) => sfx.play(name),
  onQueue: (size) => queue(size),
  onCancelQueue: () => {
    net.send({ t: 'cancel' });
    queuedSize = 0;
    ui.clearQueue();
  },
  onBuy: (itemId) => {
    if (!net.ready) return ui.toast('Still connecting to the arena.');
    net.send({ t: 'buy', itemId });
  },
  onLoadout: (next) => {
    if (!net.ready) return;
    net.send({ t: 'loadout', loadout: next });
    sfx.play('click');
  },
  onAuth: (data) => handleAuth(data),
  onLogout: () => newGuest(),
  onResume: () => resumeMatch(),
  onLeave: () => leaveMatch(),
  onContinue: () => {
    ui.hideResult();
    ui.showLobby();
    view?.syncPlayers([], 1, null);
    refreshProfile();
  },
  onRetry: () => connectAndEnter(),
  onSensitivity: (value) => {
    sensitivity = Math.min(2.4, Math.max(0.6, Number(value) || 1));
    if (controls) controls.sensitivity = sensitivity;
    try { localStorage.setItem('chroma-sensitivity', String(sensitivity)); } catch { /* noop */ }
  },
  onRequestLock: () => controls?.requestLock()
});

try {
  view = new SceneView(canvas);
} catch (error) {
  console.error('[chroma] WebGL unavailable', error);
  document.getElementById('lobby').hidden = true;
  ui.connecting(
    'This arena needs WebGL',
    'Chroma Clash renders its 3D arena in your browser. Enable hardware acceleration or try a current Chrome, Edge, Firefox or Safari.',
    false
  );
}

if (view) {
  controls = new Controls(canvas);
  controls.sensitivity = sensitivity;
  ui.setSensitivity(sensitivity);
  ui.setTouchNote(window.matchMedia('(pointer: coarse)').matches);

  controls.on('fire', () => tryFire());
  controls.on('melee', () => {
    if (!running || paused || !alive) return;
    net.send({ t: 'melee', yaw: controls.yaw });
    sfx.play('melee');
  });
  controls.on('heal', () => {
    if (!running || paused || !alive) return;
    net.send({ t: 'heal' });
  });
  controls.on('reload', () => {
    if (!running || paused || !alive) return;
    net.send({ t: 'reload' });
  });
  controls.on('scoreboard', (show) => {
    if (!running) return;
    ui.toggleScoreboard(show, latestSnapshot?.players || match?.players || [], selfId);
  });
  controls.on('lockchange', (locked) => {
    if (locked) {
      paused = false;
      ui.showPause(false);
      ui.setLockPrompt(false);
    } else if (running && !suppressPause) {
      paused = true;
      ui.showPause(true);
      ui.setLockPrompt(false);
    }
  });

  window.addEventListener('pointerdown', () => sfx.ensure(), { once: true });
  window.addEventListener('keydown', () => sfx.ensure(), { once: true });

  ui.showLobby();
  ui.setStatus('CONNECTING');
  connectAndEnter();
  requestAnimationFrame(frame);
}

// ---------- networking ----------

function describeError(error) {
  const message = error?.message || String(error);
  if (/fetch|network|failed to fetch|load failed|websocket/i.test(message)) {
    return `Could not reach the arena server at ${net.base}. If this page is hosted statically, set window.CHROMA_SERVER in chroma/config.js to the deployed game server.`;
  }
  return message;
}

async function connectAndEnter() {
  ui.connecting('Connecting…', 'Waking up the arena.');
  try {
    const token = await net.ensureSession();
    await net.connect(token);
    ui.hideConnecting();
  } catch (error) {
    ui.setStatus('OFFLINE', 'bad');
    ui.connecting('Arena offline', describeError(error), true);
  }
}

net.on('ready', (message) => {
  profile = message.profile;
  catalog = message.catalog || catalog;
  ui.setStatus('ONLINE');
  ui.setPopulation(message.queues);
  ui.renderProfile(profile, catalog);
  ui.hideConnecting();
  if (!match) {
    queuedSize = 0;
    ui.clearQueue();
  }
  if (running) {
    setTimeout(() => {
      if (running && !resumedDuringReconnect) {
        returnToLobby('That match ended while you were away.');
      }
    }, 900);
  }
});

net.on('hello', () => ui.setStatus('CONNECTING'));

net.on('queued', (message) => {
  queuedSize = message.size;
  ui.renderQueued(message);
  sfx.play('queue');
});

net.on('queueLeft', () => {
  queuedSize = 0;
  ui.clearQueue();
});

net.on('queues', (message) => ui.setPopulation(message.counts));

net.on('matchStart', (message) => beginMatch(message, false));
net.on('matchResume', (message) => beginMatch(message, true));

net.on('state', (message) => {
  if (!running || !local) return;
  latestSnapshot = message;
  const self = message.players.find((player) => player.id === selfId);
  if (!self) return;

  const wasAlive = alive;
  alive = Boolean(self.alive && self.connected);
  if (!alive) {
    if (wasAlive) {
      respawnDeadline = performance.now() + 3000;
      ui.setRespawn(3);
    }
    const seconds = Math.max(0, (respawnDeadline - performance.now()) / 1000);
    ui.setRespawn(seconds);
  } else {
    ui.setRespawn(null);
    if (!wasAlive) {
      local.x = self.x;
      local.y = self.y;
      local.z = self.z;
      local.vy = 0;
      local.grounded = true;
    }
  }

  const error = Math.hypot(self.x - local.x, self.z - local.z);
  if (error > 2.4 || Math.abs(self.y - local.y) > 2.5) {
    local.x = self.x;
    local.y = self.y;
    local.z = self.z;
    local.vy = 0;
    local.grounded = true;
  } else {
    local.x += (self.x - local.x) * 0.12;
    local.z += (self.z - local.z) * 0.12;
    local.y += (self.y - local.y) * 0.2;
  }

  if (self.health < lastSelfHealth - 0.5) {
    ui.damageFlash();
    sfx.play('hurt');
  }
  lastSelfHealth = self.health;
  ui.updateHUD(message, self, loadout);
});

net.on('matchEnd', (message) => {
  if (!match || message.matchId !== match.matchId) return;
  const previousLevel = profile?.level ?? 1;
  if (message.profile) profile = message.profile;
  running = false;
  paused = false;
  alive = false;
  suppressPause = true;
  controls?.enable(false);
  controls?.releaseLock();
  setTimeout(() => { suppressPause = false; }, 400);
  ui.setLockPrompt(false);
  ui.showPause(false);
  ui.setRespawn(null);
  ui.showResult({
    ...message,
    size: match.size,
    profile: message.profile ? { ...message.profile, previousLevel } : null
  });
  if (message.profile) ui.renderProfile(message.profile, catalog);
  sfx.play(message.you?.won ? 'kill' : 'death');
  match = null;
  local = null;
  latestSnapshot = null;
  selfId = null;
  ui.toggleScoreboard(false);
  view?.syncPlayers([], 1, null);
  refreshProfile();
});

net.on('fx', (fx) => handleFx(fx));

net.on('leftMatch', () => {
  if (running) returnToLobby('You left the match.');
});

net.on('error', (message) => {
  ui.toast(message.message || 'The arena refused that action.');
});

net.on('shopResult', (message) => {
  if (message.profile) {
    profile = message.profile;
    catalog = message.catalog || catalog;
    ui.renderProfile(profile, catalog);
  }
  ui.toast(message.message || 'Shop updated.');
  sfx.play(message.ok ? 'heal' : 'empty');
});

net.on('profile', (message) => {
  if (message.profile) {
    profile = message.profile;
    catalog = message.catalog || catalog;
    ui.renderProfile(profile, catalog);
  }
});

net.on('authError', async (message) => {
  if (recoveringSession) {
    ui.connecting('Session expired', message.message || 'Reload the page to start a new runner.', true);
    return;
  }
  recoveringSession = true;
  net.clearToken();
  try {
    await connectAndEnter();
  } finally {
    recoveringSession = false;
  }
});

net.on('closed', (info) => {
  if (info.intentional) return;
  ui.setStatus('OFFLINE', 'bad');
  if (running) {
    paused = true;
    suppressPause = true;
    controls?.clearHeld();
    ui.showPause(false);
    ui.setLockPrompt(false);
    ui.connecting('Reconnecting…', 'Holding your spot in the match for a few seconds.');
    attemptReconnect(0);
  } else {
    ui.connecting('Disconnected', 'The arena server closed the connection.', true);
  }
});

function attemptReconnect(attempt) {
  clearTimeout(reconnectTimer);
  if (attempt >= 5) {
    ui.connecting(
      'Connection lost',
      'The arena is unreachable. Check your connection, then try again.',
      true
    );
    return;
  }
  reconnectTimer = setTimeout(async () => {
    try {
      resumedDuringReconnect = false;
      await net.connect(net.token);
      ui.hideConnecting();
      paused = false;
      ui.setLockPrompt(true);
    } catch {
      attemptReconnect(attempt + 1);
    }
  }, Math.min(4000, 500 * 1.8 ** attempt));
}

// ---------- lobby actions ----------

function queue(size) {
  if (!net.ready) return ui.toast('Still connecting to the arena.');
  net.send({ t: 'queue', size });
}

async function handleAuth({ mode, username, password }) {
  ui.authBusy(true);
  ui.authError('');
  try {
    const data = mode === 'login'
      ? await net.login(username, password)
      : await net.register(username, password);
    ui.authBusy(false);
    ui.closeAuth();
    ui.toast(mode === 'login' ? `Welcome back, ${data.profile.name}.` : 'Progress saved. You can log in from anywhere.');
    await net.connect(data.token);
  } catch (error) {
    ui.authBusy(false);
    ui.authError(error.message);
  }
}

async function newGuest() {
  net.close();
  net.clearToken();
  profile = null;
  catalog = [];
  queuedSize = 0;
  ui.clearQueue();
  ui.showLobby();
  await connectAndEnter();
}

async function refreshProfile() {
  if (!net.ready || !net.token) return;
  try {
    const data = await net.request('/api/profile', { token: net.token });
    profile = data.profile;
    catalog = data.catalog || catalog;
    ui.renderProfile(profile, catalog);
  } catch { /* offline; keep the last known profile */ }
}

// ---------- match lifecycle ----------

function beginMatch(message, resumed) {
  match = message;
  selfId = message.you;
  loadout = message.loadout;
  const self = message.players.find((player) => player.id === selfId);
  if (!self) return;
  local = {
    x: self.x, y: self.y, z: self.z, vy: 0, grounded: true,
    yaw: self.yaw, pitch: self.pitch
  };
  running = true;
  paused = false;
  alive = Boolean(self.alive);
  resumedDuringReconnect = resumed;
  lastSelfHealth = self.health;
  respawnDeadline = 0;
  latestSnapshot = null;
  queuedSize = 0;
  pendingJump = false;
  lastFireAt = 0;
  inputAccumulator = 0;
  controls?.setAim(self.yaw, self.pitch);
  controls?.enable(true);
  view?.setLoadout(loadout, selfId);
  view?.syncPlayers(message.players, 0.4, selfId);
  ui.showMatch(message);
  ui.clearQueue();
  ui.updateHUD({
    score: message.score || [0, 0],
    timeLeft: message.timeLeft ?? message.duration ?? 240,
    players: message.players
  }, self, loadout);
  ui.setLockPrompt(!controls?.locked);
  ui.setRespawn(null);
  ui.setStatus('IN MATCH');
  sfx.play('start');
  if (resumed) ui.toast('Reconnected. Back in the match.');
}

function leaveMatch() {
  if (!match) returnToLobby();
  else {
    suppressPause = true;
    net.send({ t: 'leave' });
    returnToLobby('You left the match.');
    setTimeout(() => { suppressPause = false; }, 400);
  }
}

function returnToLobby(message) {
  running = false;
  paused = false;
  alive = false;
  match = null;
  local = null;
  latestSnapshot = null;
  selfId = null;
  ui.setStatus(net.ready ? 'ONLINE' : 'OFFLINE', net.ready ? 'ok' : 'bad');
  controls?.enable(false);
  ui.showPause(false);
  ui.setLockPrompt(false);
  ui.setRespawn(null);
  ui.hideResult();
  ui.showLobby();
  ui.clearQueue();
  ui.toggleScoreboard(false);
  view?.syncPlayers([], 1, null);
  if (message) ui.toast(message);
  refreshProfile();
}

function resumeMatch() {
  ui.showPause(false);
  paused = false;
  suppressPause = true;
  controls?.requestLock();
  setTimeout(() => {
    suppressPause = false;
    if (!controls?.locked) ui.setLockPrompt(true);
  }, 300);
}

// ---------- combat ----------

function tryFire() {
  if (!running || paused || !alive || !loadout) return;
  const gun = GUNS[loadout.gun] || GUNS.popPistol;
  const now = performance.now();
  if (now - lastFireAt < gun.interval * 1000) return;
  lastFireAt = now;
  net.send({ t: 'fire', yaw: controls.yaw, pitch: controls.pitch });
  sfx.play(gun.pellets > 1 ? 'shootHeavy' : 'shoot');
  view?.recoilKick();
  view?.muzzleFlash();
}

function handleFx(fx) {
  if (!fx || !latestSnapshot) return;
  if (fx.kind === 'shot') {
    if (fx.shooter !== selfId && fx.tracers?.length) {
      view?.tracer(fx.from, fx.tracers[0]);
      const distance = Math.hypot(fx.from.x - local.x, fx.from.z - local.z);
      if (distance < 28) sfx.play(fx.gun === 'citrusScatter' ? 'shootHeavy' : 'shoot');
    }
  } else if (fx.kind === 'hit') {
    ui.hitMarker(fx.head);
    sfx.play(fx.head ? 'headshot' : 'hit');
  } else if (fx.kind === 'kill') {
    ui.addKill(fx, selfId);
    if (fx.killer?.id === selfId) sfx.play('kill');
    if (fx.victim?.id === selfId) {
      sfx.play('death');
      if (local) view?.deathPuff(local, fx.victim.team);
    } else {
      const victim = latestSnapshot.players.find((player) => player.id === fx.victim?.id);
      if (victim) view?.deathPuff(victim, fx.victim.team);
    }
  } else if (fx.kind === 'hurt') {
    ui.damageFlash();
    sfx.play('hurt');
  } else if (fx.kind === 'heal') {
    view?.healRing(fx.at);
    if (fx.player === selfId) sfx.play('heal');
  } else if (fx.kind === 'melee') {
    if (fx.shooter !== selfId) {
      const distance = Math.hypot(fx.from.x - local.x, fx.from.z - local.z);
      if (distance < 14) sfx.play('melee');
    }
  } else if (fx.kind === 'empty') {
    sfx.play('empty');
    net.send({ t: 'reload' });
  } else if (fx.kind === 'reload') {
    sfx.play('reload');
  } else if (fx.kind === 'healEmpty' || fx.kind === 'healCooldown') {
    sfx.play('empty');
    ui.toast(fx.kind === 'healEmpty' ? 'Your healing item is empty for this life.' : 'That healing item is still recharging.');
  } else if (fx.kind === 'left') {
    ui.addNotice(`${fx.player?.name || 'A runner'} left the match${fx.reconnectMs ? ' — holding their spot' : ''}.`);
  } else if (fx.kind === 'joined') {
    ui.addNotice(`${fx.player?.name || 'A runner'} reconnected.`);
  }
}

// ---------- frame loop ----------

let lastFrame = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  if (!view) return;
  const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
  lastFrame = now;

  if (running && local) {
    const gun = GUNS[loadout?.gun] || GUNS.popPistol;
    if (!paused) {
      const down = controls.down;
      const fwd = (down.forward ? 1 : 0) - (down.back ? 1 : 0);
      const strafe = (down.right ? 1 : 0) - (down.left ? 1 : 0);
      const jump = controls.consumeJump();
      if (alive) {
        stepMovement(local, {
          fwd, strafe, yaw: controls.yaw, pitch: controls.pitch,
          jump, sprint: down.sprint
        }, dt, MAP);
        pendingJump = pendingJump || jump;
      }
      inputAccumulator += dt;
      if (inputAccumulator >= 1 / INPUT_SEND_HZ) {
        inputAccumulator = 0;
        net.send({
          t: 'input', fwd, strafe,
          yaw: controls.yaw, pitch: controls.pitch,
          jump: pendingJump, sprint: down.sprint
        });
        pendingJump = false;
      }
      if (controls.firing && gun.auto && alive) tryFire();
      if (!alive && respawnDeadline) {
        ui.setRespawn(Math.max(0, (respawnDeadline - now) / 1000));
      }
    }
    view.updateCamera(local, controls.yaw, controls.pitch, alive, dt);
    view.syncPlayers(latestSnapshot?.players || match?.players || [], dt, selfId);
  } else {
    view.menuCamera(dt);
    view.syncPlayers([], dt, null);
  }

  view.tick(dt);
  view.render();
}
