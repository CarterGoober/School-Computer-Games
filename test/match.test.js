import test from 'node:test';
import assert from 'node:assert/strict';
import { Match } from '../server/match.js';
import { makeAccount } from './helpers.js';

function build(options = {}) {
  const messages = [];
  const ended = [];
  const alpha = makeAccount({ id: 'alpha', name: 'Alpha' });
  const beta = makeAccount({ id: 'beta', name: 'Beta' });
  const match = new Match({
    size: options.size ?? 1,
    seated: options.seated ?? [{ connId: 'conn-a', account: alpha, team: 0 }],
    botCounts: options.botCounts ?? [0, 1],
    emit: (connId, message) => messages.push({ connId, message }),
    onEnd: (finished) => ended.push(finished),
    now: () => Date.now()
  });
  match.running = true;
  match.updateBot = () => {};
  const human = match.playerFor(alpha.id);
  const enemy = match.players.find((player) => player.team !== human.team);
  return { match, messages, ended, alpha, beta, human, enemy };
}

function faceOff(match, human, enemy) {
  match.time = 2;
  human.x = 0; human.y = 0; human.z = 10;
  enemy.x = 0; enemy.y = 0; enemy.z = 6;
  human.spawnProtectedUntil = 0;
  enemy.spawnProtectedUntil = 0;
  human.health = 100;
  enemy.health = 100;
}

test('a server shot applies headshot damage and respects the fire interval', () => {
  const { match, human, enemy, messages } = build();
  faceOff(match, human, enemy);

  assert.equal(match.fire(human, 0, 0), true);
  assert.equal(enemy.health, 55);
  assert.equal(human.mag, 11);
  assert.equal(match.fire(human, 0, 0), false, 'firing faster than the weapon interval is rejected');

  match.time += 0.3;
  assert.equal(match.fire(human, 0, 0), true);
  assert.equal(enemy.health, 10);

  const hit = messages.find((entry) => entry.message.kind === 'hit');
  assert.ok(hit);
  assert.equal(hit.message.head, true);
  assert.ok(messages.some((entry) => entry.message.kind === 'shot'));
});

test('hits on teammates are impossible and do not stop the bullet', () => {
  const { match, human, enemy } = build();
  faceOff(match, human, enemy);
  const teammate = { ...enemy, id: 99, team: human.team, x: 0, z: 8, health: 100 };
  match.players.push(teammate);

  match.fire(human, 0, 0);
  assert.equal(teammate.health, 100);
  assert.equal(enemy.health, 55);
});

test('kills award the team point and the victim respawns after the timer', () => {
  const { match, human, enemy } = build();
  faceOff(match, human, enemy);

  for (let shot = 0; shot < 3; shot += 1) {
    match.fire(human, 0, 0);
    match.time += 0.3;
  }
  assert.equal(enemy.alive, false);
  assert.equal(enemy.deaths, 1);
  assert.equal(human.kills, 1);
  assert.deepEqual(match.score, [1, 0]);

  const respawnAt = enemy.respawnAt;
  assert.ok(respawnAt > match.time);
  match.time = respawnAt;
  match.tick(1 / 30);
  assert.equal(enemy.alive, true);
  assert.equal(enemy.health, 100);
  assert.equal(enemy.mag, match.players.find((player) => player.id === enemy.id).loadout.gun === 'bubbleSmg' ? 34 : 12);
});

test('healing restores health, spends charges, clamps at 100 and obeys cooldown', () => {
  const { match, human, enemy } = build();
  faceOff(match, human, enemy);
  human.health = 25;
  human.healCharges = 2;

  assert.equal(match.heal(human), true);
  assert.equal(human.health, 70);
  assert.equal(human.healCharges, 1);
  assert.equal(match.heal(human), false, 'cooldown still running');
  assert.equal(human.health, 70);

  match.time += 9.2;
  assert.equal(match.heal(human), true);
  assert.equal(human.health, 100);
  assert.equal(human.healCharges, 0);
  assert.equal(match.heal(human), false, 'no charges left');
});

test('reload refills the magazine only after the reload time', () => {
  const { match, human, enemy } = build();
  faceOff(match, human, enemy);
  human.mag = 3;
  assert.equal(match.reload(human), true);
  assert.equal(human.reloadEndsAt > match.time, true);
  assert.equal(match.fire(human, 0, 0), false, 'cannot fire mid-reload');
  human.reloadEndsAt = match.time - 0.01;
  match.tick(0.05);
  assert.equal(human.mag, 12);
});

test('empty magazines and full-health healing are rejected', () => {
  const { match, human, enemy, messages } = build();
  faceOff(match, human, enemy);
  human.mag = 0;
  assert.equal(match.fire(human, 0, 0), false);
  assert.ok(messages.some((entry) => entry.message.kind === 'empty'));
  assert.equal(match.heal(human), false);
});

test('disconnecting in 2v2 keeps the match alive and the runner can reconnect', () => {
  const alpha = makeAccount({ id: 'alpha', name: 'Alpha' });
  const beta = makeAccount({ id: 'beta', name: 'Beta' });
  const match = new Match({
    size: 2,
    seated: [
      { connId: 'conn-a', account: alpha, team: 0 },
      { connId: 'conn-b', account: beta, team: 0 }
    ],
    botCounts: [0, 2],
    emit: () => {},
    onEnd: () => {},
    now: () => Date.now()
  });
  match.running = true;
  match.updateBot = () => {};

  assert.equal(match.disconnect('alpha'), true);
  assert.equal(match.playerFor('alpha').connected, false);
  assert.equal(match.running, true, 'a teammate is still connected');

  const resumed = match.reconnect('alpha', 'conn-a2');
  assert.ok(resumed);
  assert.equal(resumed.connected, true);
  assert.equal(resumed.connId, 'conn-a2');
  assert.equal(resumed.alive, true);

  match.disconnect('beta');
  assert.equal(match.running, true, 'alpha is still connected');
  match.disconnect('alpha');
  assert.equal(match.running, false);
  assert.equal(match.reason, 'abandon');
});

test('a 1v1 ends when the only human disconnects', () => {
  const { match, ended } = build();
  match.disconnect('alpha');
  assert.equal(match.running, false);
  assert.equal(match.reason, 'abandon');
  assert.equal(ended.length, 1);
});

test('match end computes server rewards only for human runners', () => {
  const { match, human, enemy, ended } = build();
  faceOff(match, human, enemy);
  human.kills = 4;
  human.assists = 1;
  human.heals = 2;
  human.damage = 380;
  match.score = [7, 3];

  match.end('score');
  assert.equal(ended.length, 1);
  assert.equal(match.winnerTeam, 0);
  assert.equal(match.results.length, 1, 'bots earn nothing');
  const result = match.results[0];
  assert.equal(result.accountId, 'alpha');
  assert.equal(result.won, true);
  assert.equal(result.xp, 40 + 4 * 20 + 1 * 8 + 2 * 6 + 150 + 38);
  assert.ok(result.stardust > 0);
});

test('the time limit ends the match', () => {
  const { match, ended } = build();
  match.time = 239.99;
  match.tick(0.05);
  assert.equal(match.running, false);
  assert.equal(match.reason, 'time');
  assert.equal(ended.length, 1);
});

test('snapshots expose only the fields the HUD needs', () => {
  const { match } = build();
  const snapshot = match.snapshot();
  const player = snapshot.players[0];
  for (const field of ['id', 'name', 'team', 'x', 'y', 'z', 'health', 'alive', 'kills', 'mag', 'reloading']) {
    assert.ok(field in player, `missing ${field}`);
  }
  assert.equal(snapshot.t, 'state');
  assert.equal(typeof snapshot.timeLeft, 'number');
});
