import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server-auth';
import { isVipRequest, freeMatchIds } from '@/lib/access';
import { buildLeagueModel, predictMatch, scoreMatrix, toFinishedMatches, activeModelOptions } from '@/lib/poisson';

async function fd(path: string, revalidate: number) {
  try {
    const res = await fetch(`https://api.football-data.org/v4${path}`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '' },
      next: { revalidate },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const score = (m: any) => ({ hg: m.score?.fullTime?.home, ag: m.score?.fullTime?.away });
const isDone = (m: any) => m.status === 'FINISHED' && typeof score(m).hg === 'number' && typeof score(m).ag === 'number';

function teamForm(finished: any[], teamId: number) {
  const mine = finished
    .filter((m) => m.homeTeam?.id === teamId || m.awayTeam?.id === teamId)
    .sort((a, b) => +new Date(b.utcDate) - +new Date(a.utcDate));

  const all = mine.map((m) => {
    const home = m.homeTeam.id === teamId;
    const { hg, ag } = score(m);
    const gf = home ? hg : ag;
    const ga = home ? ag : hg;
    return {
      date: m.utcDate,
      opponent: (home ? m.awayTeam : m.homeTeam).shortName || (home ? m.awayTeam : m.homeTeam).name,
      home,
      gf,
      ga,
      result: gf > ga ? 'W' : gf === ga ? 'D' : 'L',
    };
  });

  const n = all.length || 1;
  return {
    last5: all.slice(0, 5),
    games: all.length,
    avgFor: Math.round((all.reduce((a, x) => a + x.gf, 0) / n) * 100) / 100,
    avgAgainst: Math.round((all.reduce((a, x) => a + x.ga, 0) / n) * 100) / 100,
  };
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^\d+$/.test(id)) return NextResponse.json({ success: false, error: 'Neplatné ID zápasu.' }, { status: 400 });
  // Rozbor je placený obsah: bez VIP jen u zápasů zdarma
  if (!(await isVipRequest(req))) {
    let allowed = false;
    try {
      const { data } = await adminClient().from('tips_cache').select('payload').eq('key', 'tips:v3').maybeSingle();
      const now = Date.now();
      const upcoming = ((data?.payload as any)?.data || []).filter((m: any) => !m.utcDate || new Date(m.utcDate).getTime() > now);
      allowed = freeMatchIds(upcoming).has(id);
    } catch {}
    if (!allowed) return NextResponse.json({ success: false, error: 'Rozbor tohoto zápasu je dostupný pro členy VIP.' }, { status: 403 });
  }
  if (!process.env.FOOTBALL_DATA_API_KEY) return NextResponse.json({ success: false, error: 'Chybí FOOTBALL_DATA_API_KEY.' }, { status: 500 });

  const match = await fd(`/matches/${id}`, 3600);
  const code = match?.competition?.code;
  const homeId = match?.homeTeam?.id;
  const awayId = match?.awayTeam?.id;
  if (!code || !homeId || !awayId) return NextResponse.json({ success: false, error: 'Zápas se nepodařilo načíst.' }, { status: 502 });

  // Soutěž je stejná jako pro výpočet tipů → data jsou v cache, nestojí další požadavek
  const [comp, h2hRes] = await Promise.all([fd(`/competitions/${code}/matches`, 3600), fd(`/matches/${id}/head2head?limit=10`, 21600)]);
  const compMatches: any[] = comp?.matches || [];
  const finished = compMatches.filter(isDone);

  const model = buildLeagueModel(toFinishedMatches(compMatches), activeModelOptions());
  const p = predictMatch(model, homeId, awayId);
  const matrix = scoreMatrix(p.lambdaHome, p.lambdaAway, 5, model.rho);

  const top: { home: number; away: number; prob: number }[] = [];
  matrix.forEach((row, i) => row.forEach((prob, j) => top.push({ home: i, away: j, prob })));
  top.sort((a, b) => b.prob - a.prob);

  // Vzájemné zápasy: preferujeme endpoint head2head, jinak zápasy z aktuální sezóny soutěže
  let h2hMatches: any[] = (h2hRes?.matches || []).filter(isDone);
  let h2hSource = 'head2head';
  if (h2hMatches.length === 0) {
    h2hSource = 'sezona';
    h2hMatches = finished.filter(
      (m) => [homeId, awayId].includes(m.homeTeam?.id) && [homeId, awayId].includes(m.awayTeam?.id)
    );
  }
  h2hMatches.sort((a, b) => +new Date(b.utcDate) - +new Date(a.utcDate));

  let homeWins = 0, draws = 0, awayWins = 0, goals = 0;
  const h2hList = h2hMatches.slice(0, 10).map((m) => {
    const { hg, ag } = score(m);
    const homeIsOurHome = m.homeTeam.id === homeId;
    const ourHomeGoals = homeIsOurHome ? hg : ag;
    const ourAwayGoals = homeIsOurHome ? ag : hg;
    if (ourHomeGoals > ourAwayGoals) homeWins++;
    else if (ourHomeGoals === ourAwayGoals) draws++;
    else awayWins++;
    goals += hg + ag;
    return {
      date: m.utcDate,
      home: m.homeTeam.shortName || m.homeTeam.name,
      away: m.awayTeam.shortName || m.awayTeam.name,
      hg,
      ag,
      competition: m.competition?.name || '',
    };
  });

  return NextResponse.json({
    success: true,
    homeName: match.homeTeam.shortName || match.homeTeam.name,
    awayName: match.awayTeam.shortName || match.awayTeam.name,
    model: {
      lambdaHome: Math.round(p.lambdaHome * 100) / 100,
      lambdaAway: Math.round(p.lambdaAway * 100) / 100,
      homeWin: p.homeWin, draw: p.draw, awayWin: p.awayWin, btts: p.btts, over25: p.over25,
      sample: model.sampleSize,
      leagueAvgHome: Math.round(model.avgHome * 100) / 100,
      leagueAvgAway: Math.round(model.avgAway * 100) / 100,
    },
    matrix,
    topScores: top.slice(0, 4),
    form: { home: teamForm(finished, homeId), away: teamForm(finished, awayId) },
    h2h: {
      source: h2hSource,
      total: h2hList.length,
      homeWins, draws, awayWins,
      avgGoals: h2hList.length ? Math.round((goals / h2hList.length) * 100) / 100 : null,
      matches: h2hList,
    },
  });
}
