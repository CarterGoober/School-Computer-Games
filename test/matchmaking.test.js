import test from 'node:test';
import assert from 'node:assert/strict';
import { formMatch, planTeams, pickBotNames } from '../server/matchmaking.js';

function entry(id, joinedAt = 0) {
  return { connId: id, accountId: `acct-${id}`, joinedAt };
}

test('real players start a 1v1 immediately', () => {
  const queue = [entry('a', 0), entry('b', 10)];
  const taken = formMatch(queue, 1, { now: 50, botFillDelayMs: 5000, botsEnabled: true });
  assert.equal(taken.length, 2);
  assert.deepEqual(taken.map((item) => item.connId), ['a', 'b']);
  assert.equal(queue.length, 0);
});

test('a lone player waits for the bot delay, then gets a match', () => {
  const queue = [entry('solo', 1000)];
  assert.equal(formMatch(queue, 1, { now: 3000, botFillDelayMs: 5000, botsEnabled: true }), null);
  const taken = formMatch(queue, 1, { now: 6001, botFillDelayMs: 5000, botsEnabled: true });
  assert.equal(taken.length, 1);
});

test('bots cannot backfill when the server disables them', () => {
  const queue = [entry('solo', 0), entry('pair', 0)];
  assert.equal(formMatch(queue, 5, { now: 100000, botFillDelayMs: 0, botsEnabled: false }), null);
  assert.equal(queue.length, 2, 'queue is left intact');
});

test('a full 5v5 takes exactly ten players and leaves the rest queued', () => {
  const queue = Array.from({ length: 12 }, (_, index) => entry(`p${index}`, index));
  const taken = formMatch(queue, 5, { now: 20, botFillDelayMs: 0, botsEnabled: true });
  assert.equal(taken.length, 10);
  assert.equal(queue.length, 2);
});

test('teams balance humans and report bot backfill per side', () => {
  const solo = planTeams([{ connId: 'a', account: { id: 'a' } }], 5);
  assert.equal(solo.seated[0].team, 0);
  assert.deepEqual(solo.botCounts, [4, 5]);

  const three = planTeams([{ connId: 'a' }, { connId: 'b' }, { connId: 'c' }], 2);
  assert.deepEqual(three.seated.map((human) => human.team), [0, 1, 0]);
  assert.deepEqual(three.botCounts, [0, 1]);

  const four = planTeams([{ connId: 'a' }, { connId: 'b' }, { connId: 'c' }, { connId: 'd' }], 2);
  assert.deepEqual(four.botCounts, [0, 0]);
});

test('bot names are unique and padded when needed', () => {
  const names = pickBotNames(12, new Set(['Mochi']));
  assert.equal(new Set(names).size, 12);
  assert(!names.includes('Mochi'));
});
