// Shared hit detection used by the authoritative server and by tests. A shot is
// a ray against player hitboxes and arena geometry; the nearest surface wins.

import { MAP } from './map.js';
import { aimDirection } from './movement.js';

export const HITBOX = {
  radius: 0.38,
  headRadius: 0.26,
  bodyMin: 0.05,
  bodyMax: 1.42,
  headMin: 1.42,
  headMax: 1.78
};

export function rayAabb(ox, oy, oz, dx, dy, dz, minX, minY, minZ, maxX, maxY, maxZ) {
  let tmin = 0;
  let tmax = Infinity;
  const axes = [
    [ox, dx, minX, maxX],
    [oy, dy, minY, maxY],
    [oz, dz, minZ, maxZ]
  ];
  for (const [origin, direction, min, max] of axes) {
    if (Math.abs(direction) < 1e-9) {
      if (origin < min || origin > max) return Infinity;
      continue;
    }
    let t1 = (min - origin) / direction;
    let t2 = (max - origin) / direction;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmax >= 0 ? Math.max(0, tmin) : Infinity;
}

export function castWorld(origin, direction, maxDistance = 200, map = MAP) {
  let nearest = maxDistance;
  let hitBox = null;
  for (const box of map.boxes) {
    const t = rayAabb(
      origin.x, origin.y, origin.z,
      direction.x, direction.y, direction.z,
      box.x - box.w / 2, box.y, box.z - box.d / 2,
      box.x + box.w / 2, box.y + box.h, box.z + box.d / 2
    );
    if (t < nearest) {
      nearest = t;
      hitBox = box;
    }
  }
  return { distance: nearest, box: hitBox };
}

function playerHit(player, origin, direction, maxDistance) {
  const body = rayAabb(
    origin.x, origin.y, origin.z,
    direction.x, direction.y, direction.z,
    player.x - HITBOX.radius, player.y + HITBOX.bodyMin, player.z - HITBOX.radius,
    player.x + HITBOX.radius, player.y + HITBOX.bodyMax, player.z + HITBOX.radius
  );
  const head = rayAabb(
    origin.x, origin.y, origin.z,
    direction.x, direction.y, direction.z,
    player.x - HITBOX.headRadius, player.y + HITBOX.headMin, player.z - HITBOX.headRadius,
    player.x + HITBOX.headRadius, player.y + HITBOX.headMax, player.z + HITBOX.headRadius
  );
  const best = Math.min(body, head);
  if (best > maxDistance) return null;
  return { distance: best, head: head <= body };
}

export function damageAtDistance(weapon, distance) {
  const start = weapon.falloffStart ?? 0;
  const range = Math.max(weapon.range, start + 0.001);
  const min = weapon.falloffMin ?? 1;
  const ratio = Math.min(1, Math.max(0, (distance - start) / (range - start)));
  return weapon.damage * (1 - (1 - min) * ratio);
}

export function shotDirections(weapon, yaw, pitch, rng = Math.random) {
  const count = Math.max(1, weapon.pellets || 1);
  const dirs = [];
  for (let i = 0; i < count; i += 1) {
    const spread = weapon.spread || 0;
    const offsetYaw = count === 1 && spread === 0 ? 0 : (rng() * 2 - 1) * spread;
    const offsetPitch = count === 1 && spread === 0 ? 0 : (rng() * 2 - 1) * spread;
    dirs.push(aimDirection(yaw + offsetYaw, pitch + offsetPitch));
  }
  return dirs;
}

export function resolveShot({ origin, direction, weapon, players, shooter, map = MAP }) {
  const maxDistance = weapon.range;
  const wall = castWorld(origin, direction, maxDistance, map);
  let target = null;
  let targetHit = null;
  for (const player of players) {
    if (player === shooter || !player.alive || player.connected === false) continue;
    if (player.team === shooter.team) continue;
    const hit = playerHit(player, origin, direction, maxDistance);
    if (!hit) continue;
    if (hit.distance < wall.distance && (!targetHit || hit.distance < targetHit.distance)) {
      target = player;
      targetHit = hit;
    }
  }

  if (target && targetHit) {
    const base = damageAtDistance(weapon, targetHit.distance);
    const damage = base * (targetHit.head ? (weapon.headshot || 1.5) : 1);
    return {
      hit: 'player', target, head: targetHit.head, distance: targetHit.distance,
      damage: Math.max(1, Math.round(damage)),
      point: {
        x: origin.x + direction.x * targetHit.distance,
        y: origin.y + direction.y * targetHit.distance,
        z: origin.z + direction.z * targetHit.distance
      }
    };
  }

  if (wall.box) {
    return {
      hit: 'world', target: null, head: false, distance: wall.distance, damage: 0,
      point: {
        x: origin.x + direction.x * wall.distance,
        y: origin.y + direction.y * wall.distance,
        z: origin.z + direction.z * wall.distance
      }
    };
  }

  return {
    hit: 'none', target: null, head: false, distance: maxDistance, damage: 0,
    point: {
      x: origin.x + direction.x * maxDistance,
      y: origin.y + direction.y * maxDistance,
      z: origin.z + direction.z * maxDistance
    }
  };
}

export function resolveMelee({ origin, yaw, weapon, players, shooter, map = MAP }) {
  const horizontal = { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
  let best = null;
  for (const player of players) {
    if (player === shooter || !player.alive || player.connected === false) continue;
    if (player.team === shooter.team) continue;
    const dx = player.x - origin.x;
    const dz = player.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance > weapon.range || distance < 0.001) continue;
    if (Math.abs(player.y - shooter.y) > 1.6) continue;
    const dot = (dx / distance) * horizontal.x + (dz / distance) * horizontal.z;
    if (dot < Math.cos(weapon.arc)) continue;
    const toChest = {
      x: player.x - origin.x,
      y: player.y + 1.0 - origin.y,
      z: player.z - origin.z
    };
    const length = Math.hypot(toChest.x, toChest.y, toChest.z) || 1;
    const direction = { x: toChest.x / length, y: toChest.y / length, z: toChest.z / length };
    const wall = castWorld(origin, direction, length, map);
    if (wall.box && wall.distance < length - 0.15) continue;
    if (!best || distance < best.distance) {
      best = {
        target: player,
        distance,
        damage: weapon.damage,
        point: { x: player.x, y: player.y + 1.0, z: player.z }
      };
    }
  }
  return best;
}

export { aimDirection };
