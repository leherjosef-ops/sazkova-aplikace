import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTip } from '../.test-build/settle.ts';
import { candidates, selectTips, compatible, implies } from '../.test-build/markets.ts';
import { fairOdds } from '../.test-build/poisson.ts';

test('vyhodnocení nových typů sázek', () => {
  assert.equal(evaluateTip('Remíza', 1, 1), 'WON');
  assert.equal(evaluateTip('Remíza', 2, 1), 'LOST');
  assert.equal(evaluateTip('Výhra Arsenal (hosté)', 0, 1), 'WON');
  assert.equal(evaluateTip('Výhra Arsenal (hosté)', 1, 1), 'LOST');
  assert.equal(evaluateTip('Výhra Chelsea', 2, 0), 'WON');
  assert.equal(evaluateTip('Chelsea neprohraje (1X)', 1, 1), 'WON');
  assert.equal(evaluateTip('Chelsea neprohraje (1X)', 0, 1), 'LOST');
  assert.equal(evaluateTip('Arsenal neprohraje (X2)', 0, 1), 'WON');
  assert.equal(evaluateTip('Nebude remíza (12)', 0, 0), 'LOST');
  assert.equal(evaluateTip('Celkem gólů: Více než 1.5 gólů', 1, 1), 'WON');
  assert.equal(evaluateTip('Celkem gólů: Více než 3.5 gólů', 2, 1), 'LOST');
  assert.equal(evaluateTip('Celkem gólů: Méně než 2.5 gólů', 1, 1), 'WON');
  assert.equal(evaluateTip('Celkem gólů: Méně než 3.5 gólů', 2, 2), 'LOST');
  assert.equal(evaluateTip('Oba týmy dají gól (NE)', 1, 0), 'WON');
  assert.equal(evaluateTip('Oba týmy dají gól (NE)', 1, 1), 'LOST');
  // týmy s „Výhra" v názvu hostů se nespletou s domácími
  assert.equal(evaluateTip('Výhra Real Madrid (hosté)', 2, 0), 'LOST');
});

test('protichůdné a zbytečné dvojice', () => {
  assert.ok(!compatible('Celkem gólů: Více než 2.5 gólů', 'Celkem gólů: Méně než 2.5 gólů'));
  assert.ok(!compatible('Výhra A', 'B neprohraje (X2)'));
  assert.ok(implies('Výhra A', 'A neprohraje (1X)'));
  assert.ok(compatible('Výhra A', 'Celkem gólů: Více než 1.5 gólů'));
});

test('výběr tipů: kurz aspoň 1,30, šance aspoň 35 %, jeden z každé skupiny, nic protichůdného', () => {
  const p = { homeWin: 0.55, draw: 0.25, awayWin: 0.2, btts: 0.5, over15: 0.78, over25: 0.52, over35: 0.28, lambdaHome: 1.7, lambdaAway: 1 };
  const list = candidates(p, 'A', 'B').map((c) => ({ ...c, chance: c.prob, odds: fairOdds(c.prob) }));
  const sel = selectTips(list);
  assert.equal(sel.length, 3);
  assert.deepEqual(new Set(sel.map((t) => t.group)).size, 3);
  for (const t of sel) { assert.ok(t.odds >= 1.3); assert.ok(t.chance >= 0.35); }
  for (const a of sel) for (const b of sel) if (a !== b) assert.ok(compatible(a.name, b.name));
  // 1X má 80 % (kurz 1,25 < 1,30) → nesmí projít; nejpravděpodobnější povolený výsledek je „nebude remíza" (75 %, 1,33)
  assert.ok(!sel.some((t) => t.key === '1X'));
  assert.ok(sel.some((t) => t.key === '12'));
  // přísnější hranice kurzu pustí výhru domácích
  assert.ok(selectTips(list, { minOdds: 1.5 }).some((t) => t.key === 'home'));
});
