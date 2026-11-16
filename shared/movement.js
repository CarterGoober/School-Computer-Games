// Shared deterministic movement. The server runs this at a fixed 30 Hz and the
// browser runs the same function for local prediction, so both agree on walls,
// steps and gravity. The server always owns the final position.

import { MAP } from './map.js';

export const PLAYER_RADIUS = 0.42;
export const PLAYER_HEIGHT = 1.7;
export const STEP_HEIGHT = 0.55;
export const GRAVITY = 26;
export const WALK_SPEED = 6.3;
export const SPRINT_SPEED = 8.2;
export const JUMP_SPEED = 8.0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function spawnAt(point) {
  return {
    x: point.x, y: point.y || 0, z: point.z,
    vy: 0, grounded: true,
    yaw: point.yaw || 0, pitch: 0
  };
}

function verticalOverlap(state, box) {
  const feet = state.y;
  const allowance = state.grounded ? STEP_HEIGHT : 0.12;
  const head = feet + PLAYER_HEIGHT;
  const top = box.y + box.h;
  return top > feet + allowance && box.y < head - 0.02;
}

function resolveHorizontal(state, boxes, axis, direction) {
  const radius = PLAYER_RADIUS;
  for (const box of boxes) {
    if (!verticalOverlap(state, box)) continue;
    const minX = box.x - box.w / 2 - radius;
    const maxX = box.x + box.w / 2 + radius;
    const minZ = box.z - box.d / 2 - radius;
    const maxZ = box.z + box.d / 2 + radius;
    if (state.x <= minX || state.x >= maxX || state.z <= minZ || state.z >= maxZ) continue;
    if (axis === 'x') {
      if (direction > 0) state.x = minX;
      else if (direction < 0) state.x = maxX;
      else state.x = state.x < box.x ? minX : maxX;
    }
    if (axis === 'z') {
      if (direction > 0) state.z = minZ;
      else if (direction < 0) state.z = maxZ;
      else state.z = state.z < box.z ? minZ : maxZ;
    }
  }
}

function supportHeight(state, boxes) {
  const allowance = state.grounded ? STEP_HEIGHT : 0.06;
  let support = 0;
  for (const box of boxes) {
    const top = box.y + box.h;
    const withinX = Math.abs(state.x - box.x) <= box.w / 2 + PLAYER_RADIUS * 0.72;
    const withinZ = Math.abs(state.z - box.z) <= box.d / 2 + PLAYER_RADIUS * 0.72;
    if (!withinX || !withinZ) continue;
    if (top <= state.y + allowance && top >= state.y - 0.8) support = Math.max(support, top);
  }
  return support;
}

export function stepMovement(state, input, dt, map = MAP) {
  const delta = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  if (delta === 0) return state;

  const fwd = clamp(Number(input.fwd) || 0, -1, 1);
  const strafe = clamp(Number(input.strafe) || 0, -1, 1);
  const length = Math.hypot(fwd, strafe) || 1;
  const normFwd = fwd / Math.max(1, length);
  const normStrafe = strafe / Math.max(1, length);
  const yaw = Number.isFinite(input.yaw) ? input.yaw : state.yaw;
  const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;

  // Camera yaw 0 faces -Z; right is +X.
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const vx = (-sin * normFwd + cos * normStrafe) * speed;
  const vz = (-cos * normFwd - sin * normStrafe) * speed;

  if (input.jump && state.grounded) {
    state.vy = JUMP_SPEED;
    state.grounded = false;
  }

  state.x += vx * delta;
  state.z += vz * delta;
  resolveHorizontal(state, map.boxes, 'x', vx);
  resolveHorizontal(state, map.boxes, 'z', vz);
  state.x = clamp(state.x, -map.bounds, map.bounds);
  state.z = clamp(state.z, -map.bounds, map.bounds);

  state.vy -= GRAVITY * delta;
  state.y += state.vy * delta;

  const support = supportHeight(state, map.boxes);
  if (state.vy <= 0 && state.y <= support) {
    state.y = support;
    state.vy = 0;
    state.grounded = true;
  } else {
    state.grounded = false;
  }

  if (state.y < 0) {
    state.y = 0;
    state.vy = 0;
    state.grounded = true;
  }

  state.yaw = yaw;
  state.pitch = clamp(Number(input.pitch) || 0, -1.45, 1.45);
  return state;
}

export function aimDirection(yaw, pitch) {
  const cosPitch = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosPitch,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cosPitch
  };
}

export function eyePosition(player) {
  return { x: player.x, y: player.y + MAP.eyeHeight, z: player.z };
}
