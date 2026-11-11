// Poissonův model pro fotbal.
// Oproti základní verzi:
//  1) novější zápasy mají větší váhu (exponenciální útlum, poločas 120 dní),
//  2) každý tým má zvlášť sílu doma a venku (vlastní domácí výhoda),
//  3) korekce Dixon–Coles pro nízká skóre (0:0, 1:0, 0:1, 1:1).

export interface FinishedMatch {
  homeId: number;
  awayId: number;
  homeGoals: number;
  awayGoals: number;
  time?: number; // ms od epochy; bez něj se váha nepočítá
}

export interface ModelOptions {
  halfLifeDays?: number | null; // null = všechny zápasy mají stejnou váhu
  venueSplit?: boolean; // síla zvlášť doma/venku
  rho?: number; // Dixon–Coles; 0 = vypnuto
  asOf?: number; // k jakému okamžiku se váhy počítají (výchozí: teď)
}

export const FULL_MODEL: ModelOptions = { halfLifeDays: 120, venueSplit: true, rho: -0.08 };
export const BASIC_MODEL: ModelOptions = { halfLifeDays: null, venueSplit: false, rho: 0 };

interface TeamStats {
  w: number; gf: number; ga: number; // všechny zápasy (vážené)
  hw: number; hf: number; ha: number; // doma
  aw: number; af: number; aa: number; // venku
}

export interface LeagueModel {
  avgHome: number;
  avgAway: number;
  teams: Map<number, TeamStats>;
  sampleSize: number;
  venueSplit: boolean;
  rho: number;
}

export interface Prediction {
  lambdaHome: number;
  lambdaAway: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  btts: number;
  over25: number;
}

const DEFAULT_AVG_HOME = 1.5;
const DEFAULT_AVG_AWAY = 1.2;
const MIN_LEAGUE_SAMPLE = 20;
const SHRINK = 4; // vyhlazení celkové síly (pseudo-zápasy průměrného týmu)
const SHRINK_VENUE = 10; // vyhlazení domácí/venkovní síly směrem k celkové
const MAX_GOALS = 10;
const DAY = 86400000;

export function buildLeagueModel(matches: FinishedMatch[], opts: ModelOptions = FULL_MODEL): LeagueModel {
  const o = { ...FULL_MODEL, ...opts };
  const asOf = o.asOf ?? Date.now();
  const teams = new Map<number, TeamStats>();
  const get = (id: number) => {
    let t = teams.get(id);
    if (!t) { t = { w: 0, gf: 0, ga: 0, hw: 0, hf: 0, ha: 0, aw: 0, af: 0, aa: 0 }; teams.set(id, t); }
    return t;
  };

  let sw = 0, sh = 0, sa = 0;
  for (const m of matches) {
    const age = m.time ? Math.max(0, (asOf - m.time) / DAY) : 0;
    const w = o.halfLifeDays && m.time ? Math.pow(0.5, age / o.halfLifeDays) : 1;
    sw += w; sh += w * m.homeGoals; sa += w * m.awayGoals;

    const h = get(m.homeId);
    h.w += w; h.gf += w * m.homeGoals; h.ga += w * m.awayGoals;
    h.hw += w; h.hf += w * m.homeGoals; h.ha += w * m.awayGoals;

    const a = get(m.awayId);
    a.w += w; a.gf += w * m.awayGoals; a.ga += w * m.homeGoals;
    a.aw += w; a.af += w * m.awayGoals; a.aa += w * m.homeGoals;
  }

  const enough = matches.length >= MIN_LEAGUE_SAMPLE && sw > 0;
  return {
    avgHome: enough ? sh / sw : DEFAULT_AVG_HOME,
    avgAway: enough ? sa / sw : DEFAULT_AVG_AWAY,
    teams,
    sampleSize: matches.length,
    venueSplit: Boolean(o.venueSplit),
    rho: o.rho ?? 0,
  };
}

// Relativní síly týmu (1 = průměr soutěže)
function strengths(model: LeagueModel, teamId: number) {
  const t = model.teams.get(teamId);
  if (!t || model.sampleSize < MIN_LEAGUE_SAMPLE) return { atkHome: 1, defHome: 1, atkAway: 1, defAway: 1 };

  const mu = (model.avgHome + model.avgAway) / 2;
  const atk = (t.gf + SHRINK * mu) / ((t.w + SHRINK) * mu);
  const def = (t.ga + SHRINK * mu) / ((t.w + SHRINK) * mu);
  if (!model.venueSplit) return { atkHome: atk, defHome: def, atkAway: atk, defAway: def };

  const k = SHRINK_VENUE;
  const { avgHome: H, avgAway: A } = model;
  return {
    atkHome: (t.hf + k * H * atk) / ((t.hw + k) * H),
    defHome: (t.ha + k * A * def) / ((t.hw + k) * A),
    atkAway: (t.af + k * A * atk) / ((t.aw + k) * A),
    defAway: (t.aa + k * H * def) / ((t.aw + k) * H),
  };
}

function poissonPmf(k: number, lambda: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

// Dixon–Coles korekce nízkých skóre
function tau(i: number, j: number, lh: number, la: number, rho: number): number {
  if (!rho) return 1;
  if (i === 0 && j === 0) return 1 - lh * la * rho;
  if (i === 0 && j === 1) return 1 + lh * rho;
  if (i === 1 && j === 0) return 1 + la * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function predictMatch(model: LeagueModel, homeId: number, awayId: number): Prediction {
  const h = strengths(model, homeId);
  const a = strengths(model, awayId);

  const lambdaHome = clamp(model.avgHome * h.atkHome * a.defAway, 0.2, 4.5);
  const lambdaAway = clamp(model.avgAway * a.atkAway * h.defHome, 0.2, 4.5);

  let homeWin = 0, draw = 0, awayWin = 0, over25 = 0, btts = 0, total = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = poissonPmf(i, lambdaHome) * poissonPmf(j, lambdaAway) * tau(i, j, lambdaHome, lambdaAway, model.rho);
      total += p;
      if (i > j) homeWin += p; else if (i === j) draw += p; else awayWin += p;
      if (i + j >= 3) over25 += p;
      if (i >= 1 && j >= 1) btts += p;
    }
  }
  return {
    lambdaHome, lambdaAway,
    homeWin: homeWin / total, draw: draw / total, awayWin: awayWin / total,
    over25: over25 / total, btts: btts / total,
  };
}

export function fairOdds(prob: number): number {
  return Math.round((1 / clamp(prob, 0.01, 0.99)) * 100) / 100;
}

export const pct = (p: number) => `${Math.round(p * 100)}%`;

// Matice pravděpodobností přesného skóre: m[i][j] = P(domácí i gólů, hosté j gólů)
export function scoreMatrix(lambdaHome: number, lambdaAway: number, max = 5, rho = 0): number[][] {
  const m: number[][] = [];
  for (let i = 0; i <= max; i++) {
    const row: number[] = [];
    for (let j = 0; j <= max; j++) {
      row.push(poissonPmf(i, lambdaHome) * poissonPmf(j, lambdaAway) * tau(i, j, lambdaHome, lambdaAway, rho));
    }
    m.push(row);
  }
  return m;
}

// Odehrané zápasy z odpovědi football-data.org → formát modelu (seřazeno podle data)
export function toFinishedMatches(matches: any[]): FinishedMatch[] {
  const out: FinishedMatch[] = [];
  for (const m of matches || []) {
    const hg = m.score?.fullTime?.home;
    const ag = m.score?.fullTime?.away;
    if (m.status !== 'FINISHED' || typeof hg !== 'number' || typeof ag !== 'number') continue;
    if (!m.homeTeam?.id || !m.awayTeam?.id) continue;
    out.push({
      homeId: m.homeTeam.id, awayId: m.awayTeam.id, homeGoals: hg, awayGoals: ag,
      time: m.utcDate ? new Date(m.utcDate).getTime() : undefined,
    });
  }
  return out.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

// Který model používají tipy a rozbory. Zpětné ověření na skutečných zápasech (stránka /model) vyšlo
// u základního modelu o chlup líp než u vylepšeného, proto je výchozí základní.
// Vylepšený zapneš v .env.local: MODEL_PROFILE=full
export type ModelProfile = 'basic' | 'full';
export function activeModelProfile(): ModelProfile {
  return process.env.MODEL_PROFILE === 'full' ? 'full' : 'basic';
}
export function activeModelOptions(): ModelOptions {
  return activeModelProfile() === 'full' ? FULL_MODEL : BASIC_MODEL;
}
