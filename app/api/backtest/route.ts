import { NextResponse } from 'next/server';
import { BASIC_MODEL, FULL_MODEL, toFinishedMatches, activeModelProfile } from '@/lib/poisson';
import { runBacktest, summarize, calibration, type BtRecord } from '@/lib/backtest';

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

  const full: BtRecord[] = [];
  const basic: BtRecord[] = [];
  const perLeague: any[] = [];

  for (const { code, matches } of all) {
    const finished = toFinishedMatches(matches);
    if (finished.length < 60) continue;
    const f = runBacktest(finished, FULL_MODEL);
    const b = runBacktest(finished, BASIC_MODEL);
    full.push(...f); basic.push(...b);
    perLeague.push({ code, n: f.length, full: summarize(f), basic: summarize(b), baseline: summarize(f, 'base') });
  }

  if (full.length === 0) {
    return NextResponse.json({ success: false, error: 'Zatím není dost odehraných zápasů pro ověření modelu.' });
  }

  return NextResponse.json({
    success: true,
    active: activeModelProfile(),
    total: { n: full.length, full: summarize(full), basic: summarize(basic), baseline: summarize(full, 'base') },
    calibration: calibration(full),
    leagues: perLeague,
  });
}
