// Shared by the browser client and the authoritative Node server.

export const TICK_HZ = 30;
export const SNAPSHOT_HZ = 20;
export const MAX_HEALTH = 100;
export const RESPAWN_SECONDS = 3;
export const MATCH_SECONDS = 240;
export const SCORE_LIMIT = 20;
export const RECONNECT_GRACE_MS = 20000;
export const QUEUE_SIZES = [1, 2, 5];
export const MAX_CLIENTS = 120;
export const INPUT_SEND_HZ = 30;

export const TEAM_NAMES = ['Citrus', 'Berry'];
export const TEAM_COLORS = [0xffa63d, 0xc879ff];

export const MAX_NAME_LENGTH = 16;
export const MIN_PASSWORD_LENGTH = 8;

export const LOADOUT_SLOTS = ['gun', 'melee', 'heal', 'style'];

export function clampNumber(value, min, max, fallback = min) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
