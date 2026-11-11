import { NextResponse } from 'next/server';
import {
  buildLeagueModel,
  predictMatch,
  fairOdds,
  pct,
  toFinishedMatches,
  activeModelOptions,
} from '@/lib/poisson';
import { adminClient } from '@/lib/server-auth';
import { getLeagueEvents, getBttsYes, findEvent, oddsConfig, getQuota, type MarketPrice } from '@/lib/odds';

const TARGET_COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'DED', 'PPL', 'BSA', 'ELC'];
const SURE_BET_THRESHOLD = 0.65;

async function fetchCompetition(code: string, apiKey: string): Promise<any[]> {
  try {
    const res = await fetch(`https://api.football-data.org/v4/competitions/${code}/matches`, {
      headers: { 'X-Auth-Token': apiKey },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`football-data ${code}: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.matches || [];
  } catch (err) {
    console.error(`Chyba při stahování ligy ${code}:`, err);
    return [];
  }
}

const GAP_WARNING = 0.1; // model a trh se liší o víc než 10 p. b. → nedůvěřovat

const fmtEdge = (e: number) => `${e > 0 ? '+' : ''}${(e * 100).toFixed(1)}%`;

function makeTip(name: string, modelProb: number, market?: MarketPrice | null) {
  if (!market) {
    // Bez kurzu sázkovky: férový kurz modelu, value nelze spočítat
    return {
      name,
      probability: pct(modelProb),
      bookmakerOdds: fairOdds(modelProb),
      oddsSource: 'model' as const,
      value: null as string | null,
      isSureBet: modelProb >= SURE_BET_THRESHOLD,
      gapWarning: false,
      valueSuspicious: false,
    };
  }
  // Model je jednoduchý, trh zná víc → pro value i „jistotu" použijeme průměr obou
  const blended = (modelProb + market.prob) / 2;
  const gapWarning = Math.abs(modelProb - market.prob) > GAP_WARNING;
  const edge = blended * market.best - 1;
  // Neobvykle vysoké value nebo kurz jedné sázkovky výrazně nad ostatními bývá zastaralý kurz nebo chyba, ne příležitost
  const outlier = market.all.length >= 3 && market.best > market.all[1].price * 1.12;
  const valueSuspicious = edge >= 0.1 || outlier;
  return {
    name,
    probability: pct(modelProb),
    marketProbability: pct(market.prob),
    bookmakerOdds: market.best,
    bookmaker: market.bestBook,
    oddsList: market.all,
    oddsSource: 'bookmaker' as const,
    value: fmtEdge(edge),
    isSureBet: blended >= SURE_BET_THRESHOLD && !gapWarning,
    gapWarning,
    valueSuspicious,
  };
}

function buildTips(
  home: string,
  p: ReturnType<typeof predictMatch>,
  m: { home?: MarketPrice; over25?: MarketPrice; btts?: MarketPrice | null }
) {
  return [
    makeTip(`Výhra ${home}`, p.homeWin, m.home),
    makeTip('Celkem gólů: Více než 2.5 gólů', p.over25, m.over25),
    makeTip('Oba týmy dají gól (ANO)', p.btts, m.btts),
  ];
}

async function compute() {
  try {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Chybí FOOTBALL_DATA_API_KEY – bez dat o zápasech nelze model spočítat.',
      });
    }

    const perCompetition = await Promise.all(
      TARGET_COMPETITIONS.map(async (code) => ({
        code,
        matches: await fetchCompetition(code, apiKey),
      }))
    );

    const now = Date.now();
    const futureLimit = now + 14 * 24 * 60 * 60 * 1000;
    const cfg = oddsConfig();
    const bttsLimit = now + cfg.bttsDays * 24 * 60 * 60 * 1000;
    const processed: any[] = [];
    const bttsJobs: Promise<void>[] = [];

    // Kurzy sázkovek (volitelné – bez ODDS_API_KEY aplikace ukáže kurzy modelu)
    const oddsByComp = new Map<string, Awaited<ReturnType<typeof getLeagueEvents>>>();
    await Promise.all(
      perCompetition.map(async ({ code }) => {
        oddsByComp.set(code, await getLeagueEvents(code));
      })
    );

    for (const { code, matches } of perCompetition) {
      if (matches.length === 0) continue;

      // Model se učí z odehraných zápasů téže soutěže
      const model = buildLeagueModel(toFinishedMatches(matches), activeModelOptions());
      const oddsEvents = oddsByComp.get(code) || [];

      for (const match of matches) {
        if (!match.utcDate) continue;
        if (match.status !== 'SCHEDULED' && match.status !== 'TIMED') continue;
        if (!match.homeTeam?.id || !match.awayTeam?.id) continue; // ještě neurčené týmy (play-off apod.)

        const t = new Date(match.utcDate).getTime();
        if (t < now || t > futureLimit) continue;

        const home = match.homeTeam.name || 'Domácí';
        const away = match.awayTeam.name || 'Hosté';
        const prediction = predictMatch(model, match.homeTeam.id, match.awayTeam.id);
        const ev = findEvent(oddsEvents, home, away, match.utcDate);

        const markets: { home?: MarketPrice; over25?: MarketPrice; btts?: MarketPrice | null } = {
          home: ev?.home1x2,
          over25: ev?.over25,
          btts: null,
        };

        const row: any = {
          id: match.id,
          home_team: home,
          away_team: away,
          league: match.competition?.name || 'Fotbalová liga',
          match_date: new Date(match.utcDate).toLocaleString('cs-CZ', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Prague',
          }),
          utcDate: match.utcDate,
          status: 'NS',
          score: null,
          expectedGoals: {
            home: Math.round(prediction.lambdaHome * 100) / 100,
            away: Math.round(prediction.lambdaAway * 100) / 100,
          },
          modelSample: model.sampleSize,
          tips: buildTips(home, prediction, markets),
        };
        processed.push(row);

        // „Oba týmy dají gól" se stahuje po zápasech (1 kredit/zápas) → jen nejbližší dny
        if (ev && cfg.bttsDays > 0 && t <= bttsLimit) {
          bttsJobs.push(
            getBttsYes(ev.sportKey, ev.id).then((btts) => {
              markets.btts = btts;
              row.tips = buildTips(home, prediction, markets);
            })
          );
        }
      }
    }
    await Promise.all(bttsJobs);

    processed.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

    return NextResponse.json({
      success: true,
      data: processed,
      oddsEnabled: Boolean(cfg.key),
      oddsQuota: getQuota(),
    });
  } catch (err: any) {
    console.error('Chyba v calculate-poisson:', err);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}

// ---------- cache v databázi ----------
// Spočítané tipy (včetně stažených kurzů) se na TIPS_CACHE_MINUTES ukládají do tabulky tips_cache.
// Díky tomu každé otevření stránky nevolá football-data.org ani The Odds API. Když tabulka neexistuje
// nebo je databáze nedostupná, route funguje dál bez cache.
const CACHE_KEY = 'tips:v2';

export async function GET() {
  const minutes = Math.max(0, Number(process.env.TIPS_CACHE_MINUTES ?? 60));
  const canCache = minutes > 0 && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (canCache) {
    try {
      const { data } = await adminClient().from('tips_cache').select('payload, updated_at').eq('key', CACHE_KEY).maybeSingle();
      if (data && Date.now() - new Date(data.updated_at).getTime() < minutes * 60000) {
        // zápasy, které už začaly, z nabídky vyřadíme
        const now = Date.now();
        const payload: any = data.payload;
        payload.data = (payload.data || []).filter((m: any) => !m.utcDate || new Date(m.utcDate).getTime() > now);
        return NextResponse.json({ ...payload, cached: true, cachedAt: data.updated_at });
      }
    } catch {}
  }

  const res = await compute();
  if (canCache && res.ok) {
    try {
      const payload = await res.clone().json();
      if (payload?.success && Array.isArray(payload.data) && payload.data.length > 0) {
        await adminClient().from('tips_cache').upsert({ key: CACHE_KEY, payload, updated_at: new Date().toISOString() });
      }
    } catch {}
  }
  return res;
}
