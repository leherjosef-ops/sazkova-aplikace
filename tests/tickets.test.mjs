import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTip, settleAccumulator, ticketProfit } from '../.test-build/settle.ts';
import { aggregate, sameTeam } from '../.test-build/odds.ts';

test('vyhodnocení jednotlivých tipů', () => {
  assert.equal(evaluateTip('Výhra Arsenal', 2, 1), 'WON');
  assert.equal(evaluateTip('Výhra Arsenal', 1, 1), 'LOST');
  assert.equal(evaluateTip('Oba týmy dají gól (ANO)', 1, 0), 'LOST');
  assert.equal(evaluateTip('Oba týmy dají gól (ANO)', 2, 2), 'WON');
  assert.equal(evaluateTip('Celkem gólů: Více než 2.5 gólů', 2, 1), 'WON');
  assert.equal(evaluateTip('Celkem gólů: Více než 2.5 gólů', 1, 1), 'LOST');
  assert.equal(evaluateTip('Celkem rohů: Více než 9.5', 2, 1), 'VOID');
});

const legs = [{ match_id: '1', tip_name: 'a', odds: 2 }, { match_id: '2', tip_name: 'b', odds: 1.5 }, { match_id: '3', tip_name: 'c', odds: 3 }];

test('akumulátor: jedna prohra = prohra, i když se jiné zápasy ještě nehrály', () => {
  assert.deepEqual(settleAccumulator(legs, ['LOST', null, null]).status, 'LOST');
});
test('akumulátor: čeká se, dokud nejsou všechny zápasy hotové', () => {
  assert.equal(settleAccumulator(legs, ['WON', null, 'WON']).status, null);
});
test('akumulátor: všechno vyšlo → součin kurzů', () => {
  const r = settleAccumulator(legs, ['WON', 'WON', 'WON']);
  assert.equal(r.status, 'WON'); assert.equal(r.effectiveOdds, 9);
});
test('akumulátor: neplatný zápas se bere s kurzem 1', () => {
  const r = settleAccumulator(legs, ['WON', 'VOID', 'WON']);
  assert.equal(r.status, 'WON'); assert.equal(r.effectiveOdds, 6);
  assert.equal(settleAccumulator(legs, ['VOID', 'VOID', 'VOID']).status, 'VOID');
});

test('zisk a ztráta z tiketu', () => {
  assert.equal(ticketProfit({ status: 'WON', odds: 2.5, stake: 200 }), 300);
  assert.equal(ticketProfit({ status: 'LOST', odds: 2.5, stake: 200 }), -200);
  assert.equal(ticketProfit({ status: 'WON', odds: 5, settled_odds: 2, stake: 100 }), 100);
  assert.equal(ticketProfit({ status: 'VOID', odds: 2, stake: 100 }), 0);
  assert.equal(ticketProfit({ status: 'PENDING', odds: 2, stake: 100 }), null);
  assert.equal(ticketProfit({ status: 'LOST', odds: 2 }, 100), -100); // bez částky modelová sázka
});

test('párování týmů: stejné město neznamená stejný tým', () => {
  assert.ok(sameTeam('Manchester City FC', 'Manchester City'));
  assert.ok(!sameTeam('Manchester United FC', 'Manchester City FC'));
  assert.ok(sameTeam('FC Bayern München', 'Bayern Munich'));
});

test('odstranění marže: tržní šance dají součet 1 a vrátí se nejlepší kurz i seznam sázkovek', () => {
  const bks = [
    { title: 'A', markets: [{ key: 'h2h', outcomes: [{ name: 'X', price: 2.0 }, { name: 'Draw', price: 3.5 }, { name: 'Y', price: 4.0 }] }] },
    { title: 'B', markets: [{ key: 'h2h', outcomes: [{ name: 'X', price: 2.1 }, { name: 'Draw', price: 3.4 }, { name: 'Y', price: 3.8 }] }] },
  ];
  const r = aggregate(bks, 'h2h', ['home', 'draw', 'away'], (o) => (o.name === 'Draw' ? 'draw' : o.name === 'X' ? 'home' : 'away'));
  assert.ok(Math.abs(r.home.prob + r.draw.prob + r.away.prob - 1) < 1e-9);
  assert.equal(r.home.best, 2.1); assert.equal(r.home.bestBook, 'B');
  assert.deepEqual(r.home.all.map((o) => o.book), ['B', 'A']);
});

test('burza (exchange) se počítá do šance trhu, ale nenabízí se jako nejlepší kurz', () => {
  const mk = (key, x, d, y) => ({ key, title: key, markets: [{ key: 'h2h', outcomes: [{ name: 'X', price: x }, { name: 'Draw', price: d }, { name: 'Y', price: y }] }] });
  const pick = (o) => (o.name === 'Draw' ? 'draw' : o.name === 'X' ? 'home' : 'away');
  const r = aggregate([mk('book_a', 2.0, 3.5, 4.0), mk('betfair_ex_eu', 11, 3.6, 4.2)], 'h2h', ['home', 'draw', 'away'], pick);
  assert.equal(r.home.best, 2.0);
  assert.equal(r.home.bestBook, 'book_a');
  assert.ok(!r.home.all.some((o) => o.book === 'betfair_ex_eu'));
  assert.equal(aggregate([mk('betfair_ex_eu', 2, 3.5, 4)], 'h2h', ['home', 'draw', 'away'], pick), null);
});
