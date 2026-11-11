import { NextResponse } from 'next/server';
import { BASIC_MODEL, FULL_MODEL, MLE_MODEL, MLE_PENALTY, toFinishedMatches, activeModelProfile } from '@/lib/poisson';
import { runBacktest, summarize, summarizePicks, calibration, type BtRecord } from '@/lib/backtest';

export const maxDuration = 60;
const COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'DED', 'PPL', 'BSA', 'ELC'];

async function fetchComp(code: string, key: string): Promise<any[]> {
  try {
    // stejná adresa i revalidate jako v calculate-poisson → data jsou v cache
    const res = await fetch(`https://api.football-data.org/v4/competitions/${code}/matches`, {
      headers: { 'X-Auth-Token': key },
      next: { revalidate: 3600 },
    });
    return res.ok ? (await res.json()).matches || [] : [];
  } catch { return []; }
}

export async function GET() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return NextResponse.json({ success: false, error: 'Chybí FOOTBALL_DATA_API_KEY.' }, { status: 500 });

  const all = await Promise.all(COMPETITIONS.map(async (code) => ({ code, matches: await fetchComp(code, key) })));

  const active = activeModelProfile();
  // Ladění nového modelu: jak silně táhnout týmy k průměru. Výsledky se vrací v poli tuning.
  const TUNE = [MLE_PENALTY / 2, MLE_PENALTY * 2];
  const recs: Record<string, BtRecord[]> = { full: [], basic: [], mle: [] };
  const tune: Record<string, BtRecord[]> = Object.fromEntries(TUNE.map((x) => [String(x), []]));
  const perLeague: any[] = [];

  for (const { code, matches } of all) {
    const finished = toFinishedMatches(matches);
    if (finished.length < 60) continue;
    const r = { full: runBacktest(finished, FULL_MODEL), basic: runBacktest(finished, BASIC_MODEL), mle: runBacktest(finished, MLE_MODEL) };
    (Object.keys(r) as (keyof typeof r)[]).forEach((k) => recs[k].push(...r[k]));
    TUNE.forEach((x) => tune[String(x)].push(...runBacktest(finished, { ...MLE_MODEL, penalty: x })));
    perLeague.push({
      code, n: r.basic.length,
      full: summarize(r.full), basic: summarize(r.basic), mle: summarize(r.mle),
      model: summarize(r[active]), baseline: summarize(r.basic, 'base'),
    });
  }

  if (recs.basic.length === 0) {
    return NextResponse.json({ success: false, error: 'Zatím není dost odehraných zápasů pro ověření modelu.' });
  }

  return NextResponse.json({
    success: true,
    active,
    total: { n: recs.basic.length, full: summarize(recs.full), basic: summarize(recs.basic), mle: summarize(recs.mle), baseline: summarize(recs.basic, 'base') },
    tuning: [{ penalty: MLE_PENALTY, ...summarize(recs.mle) }, ...TUNE.map((x) => ({ penalty: x, ...summarize(tune[String(x)]) }))],
    picks: summarizePicks(recs[active]),
    calibration: calibration(recs[active]),
    leagues: perLeague,
  });
}
