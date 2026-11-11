// Kurzy sázkovek z The Odds API (https://the-odds-api.com). Používá se jen na kurzy –
// zápasy a výsledky pro model dál jdou z football-data.org.

export const COMP_TO_SPORT: Record<string, string> = {
  PL: 'soccer_epl',
  PD: 'soccer_spain_la_liga',
  SA: 'soccer_italy_serie_a',
  BL1: 'soccer_germany_bundesliga',
  FL1: 'soccer_france_ligue_one',
  CL: 'soccer_uefa_champs_league',
  DED: 'soccer_netherlands_eredivisie',
  PPL: 'soccer_portugal_primeira_liga',
  BSA: 'soccer_brazil_campeonato',
  ELC: 'soccer_efl_champ',
};

const BASE = 'https://api.the-odds-api.com/v4';

export const oddsConfig = () => ({
  key: process.env.ODDS_API_KEY || '',
  // Každá liga stojí kredity → výchozí jen 5 největších. Uprav v .env.local.
  leagues: (process.env.ODDS_API_LEAGUES || 'PL,PD,SA,BL1,FL1').split(',').map((s) => s.trim()).filter(Boolean),
  regions: process.env.ODDS_API_REGIONS || 'eu',
  cacheSeconds: Math.max(1, Number(process.env.ODDS_API_CACHE_HOURS || 24)) * 3600,
  // Trh „oba týmy dají gól" stojí 1 kredit za zápas → jen zápasy v nejbližších N dnech (0 = vypnuto)
  bttsDays: Number(process.env.ODDS_API_BTTS_DAYS ?? 2),
});

export interface MarketPrice {
  best: number; // nejvyšší nabízený kurz
  bestBook: string;
  all: { book: string; price: number }[]; // nabídka jednotlivých sázkovek, nejlepší první
  prob: number; // tržní pravděpodobnost bez marže (průměr přes sázkovky)
}

export interface OddsEvent {
  id: string;
  sportKey: string;
  home: string;
  away: string;
  commence: number;
  home1x2?: MarketPrice;
  draw1x2?: MarketPrice;
  away1x2?: MarketPrice;
  over25?: MarketPrice;
}

// ---------- párování názvů týmů (football-data vs. Odds API) ----------
const NOISE = new Set(['fc', 'cf', 'afc', 'sc', 'ac', 'as', 'ssc', 'ud', 'rc', 'cd', 'fk', 'sv', 'vfl', 'vfb', 'tsg', 'rb', 'us', 'calcio', 'club', 'de', 'the', 'ogc', 'sl', 'ca', 'ec']);

export function normalizeTeam(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w) && !/^\d+$/.test(w))
    .join(' ');
}

const ALIAS: Record<string, string> = { munchen: 'munich', internazionale: 'inter', wolves: 'wolverhampton wanderers', koln: 'cologne' };

function tokens(name: string): Set<string> {
  const n = normalizeTeam(name);
  const full = ALIAS[n] ?? n;
  return new Set(full.split(' ').map((w) => ALIAS[w] ?? w).filter(Boolean));
}

export function sameTeam(a: string, b: string): boolean {
  const x = tokens(a);
  const y = tokens(b);
  if (x.size === 0 || y.size === 0) return false;
  const [small, big] = x.size <= y.size ? [x, y] : [y, x];
  // všechna slova kratšího názvu musí být v delším (Manchester City ≠ Manchester United)
  return [...small].every((w) => big.has(w));
}

// ---------- agregace kurzů přes sázkovky ----------
export function aggregate(
  bookmakers: any[],
  marketKey: string,
  ids: string[],
  pick: (o: any) => string | null
): Record<string, MarketPrice> | null {
  const sums: Record<string, number> = {};
  const best: Record<string, { price: number; book: string }> = {};
  const all: Record<string, { book: string; price: number }[]> = {};
  let books = 0;

  for (const bk of bookmakers || []) {
    const market = (bk.markets || []).find((m: any) => m.key === marketKey);
    if (!market) continue;
    const price: Record<string, number> = {};
    for (const o of market.outcomes || []) {
      const id = pick(o);
      if (id && ids.includes(id) && typeof o.price === 'number' && o.price > 1) price[id] = o.price;
    }
    if (!ids.every((id) => price[id])) continue;

    const implied = ids.map((id) => 1 / price[id]);
    const total = implied.reduce((a, b) => a + b, 0);
    ids.forEach((id, i) => {
      sums[id] = (sums[id] || 0) + implied[i] / total; // odstranění marže
      (all[id] = all[id] || []).push({ book: bk.title || bk.key, price: price[id] });
      if (!best[id] || price[id] > best[id].price) best[id] = { price: price[id], book: bk.title || bk.key };
    });
    books++;
  }

  if (books === 0) return null;
  const out: Record<string, MarketPrice> = {};
  for (const id of ids) {
    out[id] = {
      best: best[id].price,
      bestBook: best[id].book,
      prob: sums[id] / books,
      all: all[id].sort((a, b) => b.price - a.price).slice(0, 5),
    };
  }
  return out;
}

// ---------- komunikace s API ----------
let lastQuota: { remaining?: string; used?: string } = {};
export const getQuota = () => lastQuota;

async function oddsFetch(path: string, params: Record<string, string>, revalidate: number) {
  const cfg = oddsConfig();
  const url = `${BASE}${path}?${new URLSearchParams({ apiKey: cfg.key, ...params })}`;
  try {
    const res = await fetch(url, { next: { revalidate } });
    lastQuota = {
      remaining: res.headers.get('x-requests-remaining') ?? lastQuota.remaining,
      used: res.headers.get('x-requests-used') ?? lastQuota.used,
    };
    if (!res.ok) {
      console.error(`Odds API ${path}: HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('Odds API chyba:', err);
    return null;
  }
}

// Seznam aktivních lig – tenhle endpoint se nepočítá do kreditů
async function activeSportKeys(): Promise<Set<string> | null> {
  const data = await oddsFetch('/sports/', {}, 86400);
  if (!Array.isArray(data)) return null;
  return new Set(data.filter((s: any) => s.active).map((s: any) => s.key));
}

export async function getLeagueEvents(compCode: string): Promise<OddsEvent[]> {
  const cfg = oddsConfig();
  const sportKey = COMP_TO_SPORT[compCode];
  if (!cfg.key || !sportKey || !cfg.leagues.includes(compCode)) return [];

  const active = await activeSportKeys();
  if (active && !active.has(sportKey)) return []; // liga teď nehraje → neplatíme kredity

  const data = await oddsFetch(
    `/sports/${sportKey}/odds/`,
    { regions: cfg.regions, markets: 'h2h,totals', oddsFormat: 'decimal' },
    cfg.cacheSeconds
  );
  if (!Array.isArray(data)) return [];

  return data.map((ev: any): OddsEvent => {
    const h2h = aggregate(ev.bookmakers, 'h2h', ['home', 'draw', 'away'], (o) =>
      o.name === 'Draw' ? 'draw' : o.name === ev.home_team ? 'home' : o.name === ev.away_team ? 'away' : null
    );
    const totals = aggregate(ev.bookmakers, 'totals', ['over', 'under'], (o) =>
      o.point === 2.5 ? (o.name === 'Over' ? 'over' : o.name === 'Under' ? 'under' : null) : null
    );
    return {
      id: ev.id,
      sportKey,
      home: ev.home_team,
      away: ev.away_team,
      commence: new Date(ev.commence_time).getTime(),
      home1x2: h2h?.home,
      draw1x2: h2h?.draw,
      away1x2: h2h?.away,
      over25: totals?.over,
    };
  });
}

export async function getBttsYes(sportKey: string, eventId: string): Promise<MarketPrice | null> {
  const cfg = oddsConfig();
  const data = await oddsFetch(
    `/sports/${sportKey}/events/${eventId}/odds/`,
    { regions: cfg.regions, markets: 'btts', oddsFormat: 'decimal' },
    cfg.cacheSeconds
  );
  if (!data) return null;
  const agg = aggregate(data.bookmakers, 'btts', ['yes', 'no'], (o) =>
    o.name === 'Yes' ? 'yes' : o.name === 'No' ? 'no' : null
  );
  return agg?.yes ?? null;
}

export function findEvent(events: OddsEvent[], home: string, away: string, utcDate: string): OddsEvent | undefined {
  const t = new Date(utcDate).getTime();
  return events.find(
    (e) => Math.abs(e.commence - t) < 12 * 3600 * 1000 && sameTeam(e.home, home) && sameTeam(e.away, away)
  );
}
