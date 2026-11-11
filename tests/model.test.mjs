import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeagueModel, predictMatch, scoreMatrix, BASIC_MODEL, FULL_MODEL, MLE_MODEL } from '../.test-build/poisson.ts';
import { runBacktest, summarize, calibration } from '../.test-build/backtest.ts';

const DAY = 86400000;

// deterministický generátor, aby test vycházel pokaždé stejně
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function poisson(r, l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }

function simulatedLeague(teams = 16, rounds = 4) {
  const r = rng(7);
  const atk = Array.from({ length: teams }, () => 0.6 + r());
  const def = Array.from({ length: teams }, () => 0.6 + r());
  const t0 = Date.now() - 300 * DAY;
  const out = []; let d = 0;
  for (let k = 0; k < rounds; k++) for (let i = 0; i < teams; i++) for (let j = 0; j < teams; j++) if (i !== j) {
    out.push({ homeId: i, awayId: j, homeGoals: poisson(r, 1.45 * atk[i] * def[j]), awayGoals: poisson(r, 1.15 * atk[j] * def[i]), time: t0 + (d++) * DAY / 6 });
  }
  return out;
}

const tiny = () => {
  const ms = []; const t0 = Date.now() - 100 * DAY;
  for (let i = 0; i < 30; i++) {
    ms.push({ homeId: 1, awayId: 2 + (i % 3), homeGoals: 3, awayGoals: 0, time: t0 + i * DAY });
    ms.push({ homeId: 2 + (i % 3), awayId: 1, homeGoals: 0, awayGoals: 2, time: t0 + i * DAY });
    ms.push({ homeId: 2, awayId: 3, homeGoals: 1, awayGoals: 1, time: t0 + i * DAY });
  }
  return ms;
};

test('pravděpodobnosti výsledku dávají dohromady 1 (obě verze modelu)', () => {
  for (const o of [BASIC_MODEL, FULL_MODEL]) {
    const p = predictMatch(buildLeagueModel(tiny(), o), 1, 2);
    assert.ok(Math.abs(p.homeWin + p.draw + p.awayWin - 1) < 1e-9);
    assert.ok(p.btts > 0 && p.btts < 1 && p.over25 > 0 && p.over25 < 1);
  }
});

test('silný tým doma proti slabému je jasný favorit', () => {
  assert.ok(predictMatch(buildLeagueModel(tiny()), 1, 2).homeWin > 0.7);
});

test('bez dat se předpovídá průměr soutěže (domácí mírný favorit)', () => {
  const p = predictMatch(buildLeagueModel([]), 1, 2);
  assert.ok(p.homeWin > p.awayWin && p.homeWin < 0.6);
});

test('novější zápasy mají větší váhu než staré', () => {
  const now = Date.now();
  const old = Array.from({ length: 25 }, (_, i) => ({ homeId: 1, awayId: 2, homeGoals: 4, awayGoals: 0, time: now - (300 + i) * DAY }));
  const recent = Array.from({ length: 25 }, (_, i) => ({ homeId: 1, awayId: 2, homeGoals: 0, awayGoals: 3, time: now - (1 + i) * DAY }));
  const decayed = predictMatch(buildLeagueModel([...old, ...recent], FULL_MODEL), 1, 2);
  const flat = predictMatch(buildLeagueModel([...old, ...recent], { ...FULL_MODEL, halfLifeDays: null }), 1, 2);
  assert.ok(decayed.awayWin > flat.awayWin);
});

test('Dixon–Coles přidá remízy 0:0 a 1:1 a ubere 1:0 a 0:1', () => {
  const a = scoreMatrix(1.4, 1.1, 5, 0), b = scoreMatrix(1.4, 1.1, 5, -0.08);
  assert.ok(b[0][0] > a[0][0] && b[1][1] > a[1][1]);
  assert.ok(b[1][0] < a[1][0] && b[0][1] < a[0][1]);
});

test('matice skóre je rozdělení pravděpodobnosti', () => {
  const sum = scoreMatrix(1.4, 1.1, 10, -0.08).flat().reduce((x, y) => x + y, 0);
  assert.ok(sum > 0.98 && sum < 1.02);
});

test('zpětné ověření: model porazí naivní odhad na simulované lize a nepoužívá budoucnost', () => {
  const ms = simulatedLeague();
  const rec = runBacktest(ms, FULL_MODEL);
  assert.equal(rec.length, ms.length - 40);
  const m = summarize(rec), base = summarize(rec, 'base');
  assert.ok(m.logLoss < base.logLoss, `model ${m.logLoss} vs naivní ${base.logLoss}`);
  assert.ok(m.accuracy > base.accuracy);
});

test('kalibrace: šance modelu se zhruba shodují se skutečností', () => {
  const cal = calibration(runBacktest(simulatedLeague(), BASIC_MODEL)).filter((x) => x.count >= 100);
  assert.ok(cal.length >= 3);
  for (const x of cal) assert.ok(Math.abs(x.predicted - x.actual) < 0.12, `${x.predicted} vs ${x.actual}`);
});

test('nový model (síla soupeřů): pozná silný a slabý tým a nováčka bere jako průměr', () => {
  const ms = simulatedLeague(12, 3);
  const m = buildLeagueModel(ms, MLE_MODEL);
  assert.ok(m.mle, 'model se má odhadnout');
  const p = predictMatch(m, 0, 1);
  assert.ok(Math.abs(p.homeWin + p.draw + p.awayWin - 1) < 1e-9);
  // domácí výhoda kladná, jako v simulaci (1.45 vs 1.15)
  assert.ok(m.mle.home > 0);
  // neznámý tým (nováček) má sílu 0 = průměr
  const q = predictMatch(m, 999, 998);
  assert.ok(Math.abs(q.lambdaHome - Math.exp(m.mle.c + m.mle.home)) < 1e-9);
});

test('nový model v backtestu porazí naivní odhad', () => {
  const r = runBacktest(simulatedLeague(16, 4), MLE_MODEL);
  assert.ok(summarize(r).logLoss < summarize(r, 'base').logLoss);
});
