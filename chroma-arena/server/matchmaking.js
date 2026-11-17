// Pure queue helpers. Kept separate from the WebSocket hub so the grouping and
// team-balancing rules can be tested without networking.

export const BOT_NAMES = [
  'Pixel Pip', 'Mochi', 'Bolt', 'Taffy', 'Nova',
  'Ziggy', 'Kiki', 'Dash', 'Puff', 'Rook'
];

/**
 * Pull a group off the front of a queue once it can start.
 * Real players are always preferred; bots only backfill when the oldest
 * waiting player has waited `botFillDelayMs`.
 */
export function formMatch(queue, size, options = {}) {
  const now = options.now ?? Date.now();
  const botFillDelayMs = options.botFillDelayMs ?? 6000;
  const botsEnabled = options.botsEnabled !== false;
  const needed = size * 2;
  if (queue.length === 0) return null;
  if (queue.length < needed) {
    if (!botsEnabled) return null;
    if (now - queue[0].joinedAt < botFillDelayMs) return null;
  }
  return queue.splice(0, Math.min(queue.length, needed));
}

/**
 * Seat humans on alternating teams, then report how many bots each team needs.
 * This guarantees the requested team size even when only one human is waiting.
 */
export function planTeams(humans, size) {
  const counts = [0, 0];
  const seated = humans.slice(0, size * 2).map((human, index) => {
    const team = index % 2;
    counts[team] += 1;
    return { ...human, team };
  });
  return {
    seated,
    botCounts: [Math.max(0, size - counts[0]), Math.max(0, size - counts[1])]
  };
}

export function pickBotNames(count, taken = new Set()) {
  const names = [];
  for (const name of BOT_NAMES) {
    if (names.length >= count) break;
    if (!taken.has(name)) names.push(name);
  }
  let index = 1;
  while (names.length < count) names.push(`Splatter ${index++}`);
  return names;
}
