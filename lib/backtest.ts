import { buildLeagueModel, predictMatch, type FinishedMatch, type ModelOptions } from './poisson';

export interface BtRecord {
  p: [number, number, number]; // P(domácí), P(remíza), P(hosté) podle modelu
  base: [number, number, number]; // naivní odhad: jen podle četností výsledků v soutěži před zápasem
  outcome: 0 | 1 | 2;
}

// Postupné ověření: každý zápas se předpovídá jen z těch, které se odehrály PŘED ním.
export function runBacktest(matches: FinishedMatch[], opts: ModelOptions, minTrain = 40): BtRecord[] {
  const sorted = [...matches].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  const out: BtRecord[] = [];
  let h = 0, d = 0, a = 0;

  sorted.forEach((m, i) => {
    const outcome: 0 | 1 | 2 = m.homeGoals > m.awayGoals ? 0 : m.homeGoals === m.awayGoals ? 1 : 2;
    if (i >= minTrain) {
      const model = buildLeagueModel(sorted.slice(0, i), { ...opts, asOf: m.time });
      const p = predictMatch(model, m.homeId, m.awayId);
      out.push({ p: [p.homeWin, p.draw, p.awayWin], base: [h / i, d / i, a / i], outcome });
    }
    if (outcome === 0) h++; else if (outcome === 1) d++; else a++;
  });
  return out;
}

const pick = (p: number[]) => p.indexOf(Math.max(...p));

export function summarize(records: BtRecord[], key: 'p' | 'base' = 'p') {
  const n = records.length;
  if (!n) return { n: 0, accuracy: 0, brier: 0, logLoss: 0 };
  let hit = 0, brier = 0, ll = 0;
  for (const r of records) {
    const p = r[key];
    if (pick(p) === r.outcome) hit++;
    brier += p.reduce((s, x, k) => s + (x - (k === r.outcome ? 1 : 0)) ** 2, 0);
    ll += -Math.log(Math.max(p[r.outcome], 1e-6));
  }
  return { n, accuracy: hit / n, brier: brier / n, logLoss: ll / n };
}

// Kalibrace: když model řekne „40 %", stane se to opravdu zhruba ve 40 % případů?
export function calibration(records: BtRecord[], bins = 10) {
  const acc = Array.from({ length: bins }, () => ({ sum: 0, hit: 0, n: 0 }));
  for (const r of records) {
    r.p.forEach((p, k) => {
      const b = Math.min(bins - 1, Math.floor(p * bins));
      acc[b].sum += p; acc[b].n++; if (k === r.outcome) acc[b].hit++;
    });
  }
  return acc
    .map((x, i) => ({ bin: i, predicted: x.n ? x.sum / x.n : 0, actual: x.n ? x.hit / x.n : 0, count: x.n }))
    .filter((x) => x.count >= 5);
}
