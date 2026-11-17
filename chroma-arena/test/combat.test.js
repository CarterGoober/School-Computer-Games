import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rayAabb, castWorld, resolveShot, resolveMelee, damageAtDistance
} from '../shared/combat.js';
import { GUNS, MELEES } from '../shared/catalog.js';

const flatMap = { boxes: [], bounds: 30 };
const wallMap = {
  boxes: [{ x: 0, z: 5, w: 8, d: 1, h: 3, y: 0 }],
  bounds: 30
};

function player(id, team, x, z) {
  return { id, team, x, y: 0, z, alive: true, connected: true };
}

test('rayAabb returns the entry distance and ignores misses', () => {
  const hit = rayAabb(0, 1, 0, 0, 0, -1, -1, 0, -6, 1, 2, -4);
  assert.equal(hit, 4);
  const miss = rayAabb(0, 4, 0, 0, 0, -1, -1, 0, -6, 1, 2, -4);
  assert.equal(miss, Infinity);
});

test('arena walls block shots', () => {
  const shooter = player(1, 0, 0, 10);
  const target = player(2, 1, 0, 0);
  const blocked = resolveShot({
    origin: { x: 0, y: 1.2, z: 10 },
    direction: { x: 0, y: 0, z: -1 },
    weapon: GUNS.popPistol,
    players: [shooter, target],
    shooter,
    map: wallMap
  });
  assert.equal(blocked.hit, 'world');
  assert.equal(blocked.damage, 0);
});

test('open line of sight registers a headshot with a multiplier', () => {
  const shooter = player(1, 0, 0, 10);
  const target = player(2, 1, 0, 0);
  const shot = resolveShot({
    origin: { x: 0, y: 1.6, z: 10 },
    direction: { x: 0, y: 0, z: -1 },
    weapon: GUNS.popPistol,
    players: [shooter, target],
    shooter,
    map: flatMap
  });
  assert.equal(shot.hit, 'player');
  assert.equal(shot.target.id, 2);
  assert.equal(shot.head, true);
  assert.equal(shot.damage, Math.round(GUNS.popPistol.damage * GUNS.popPistol.headshot));
});

test('friendly fire is not possible and teammates do not absorb bullets', () => {
  const shooter = player(1, 0, 0, 10);
  const teammate = player(2, 0, 0, 5);
  const enemy = player(3, 1, 0, 0);
  const shot = resolveShot({
    origin: { x: 0, y: 1.6, z: 10 },
    direction: { x: 0, y: 0, z: -1 },
    weapon: GUNS.popPistol,
    players: [shooter, teammate, enemy],
    shooter,
    map: flatMap
  });
  assert.equal(shot.target.id, 3);
});

test('damage falls off toward the end of a weapon range', () => {
  const near = damageAtDistance(GUNS.bubbleSmg, 5);
  const far = damageAtDistance(GUNS.bubbleSmg, 50);
  assert(near > far);
  assert.equal(Math.round(near), GUNS.bubbleSmg.damage);
  assert(far >= GUNS.bubbleSmg.damage * GUNS.bubbleSmg.falloffMin - 0.01);
});

test('shotguns produce one ray per pellet with bounded spread', () => {
  const shooter = player(1, 0, 0, 10);
  const target = player(2, 1, 0, 0);
  let hits = 0;
  for (let i = 0; i < 40; i += 1) {
    const shot = resolveShot({
      origin: { x: 0, y: 1.4, z: 4 },
      direction: { x: 0, y: 0, z: -1 },
      weapon: GUNS.citrusScatter,
      players: [shooter, target],
      shooter,
      map: flatMap
    });
    if (shot.hit === 'player') hits += 1;
  }
  assert(hits > 0);
});

test('melee only hits enemies inside range and the forward cone', () => {
  const attacker = player(1, 0, 0, 0);
  const enemy = player(2, 1, 0, -2);
  const behind = player(3, 1, 0, 2);
  const ally = player(4, 0, 0, -1.5);

  const hit = resolveMelee({
    origin: { x: 0, y: 1.6, z: 0 },
    yaw: 0,
    weapon: MELEES.foamBat,
    players: [attacker, enemy, behind, ally],
    shooter: attacker,
    map: flatMap
  });
  assert.equal(hit.target.id, 2);

  const none = resolveMelee({
    origin: { x: 0, y: 1.6, z: 0 },
    yaw: Math.PI,
    weapon: MELEES.foamBat,
    players: [attacker, enemy, ally],
    shooter: attacker,
    map: flatMap
  });
  assert.equal(none, null);
});

test('a wall between players blocks melee', () => {
  const attacker = player(1, 0, 0, 9);
  const enemy = player(2, 1, 0, 3);
  const hit = resolveMelee({
    origin: { x: 0, y: 1.6, z: 9 },
    yaw: 0,
    weapon: MELEES.yardstick,
    players: [attacker, enemy],
    shooter: attacker,
    map: wallMap
  });
  assert.equal(hit, null);
});

test('world cast finds the nearest solid', () => {
  const wall = castWorld({ x: 0, y: 1.5, z: 10 }, { x: 0, y: 0, z: -1 }, 40, wallMap);
  assert.equal(wall.distance, 4.5, 'wall front face at z = 4.5');
  assert.equal(wall.box.z, 5);
});
