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
  method?: 'average' | 'mle'; // average = průměry gólů, mle = odhad metodou maximální věrohodnosti
  penalty?: number; // jen mle: jak silně táhnout týmy k průměru (vyšší = opatrnější)
  warmStart?: MleParams; // jen mle: start z předchozího odhadu (zrychlí backtest)
}

export interface MleParams {
  c: number; // průměrná úroveň gólů (log)
  home: number; // domácí výhoda (log)
  att: Map<number, number>; // útok týmu (log, 0 = průměr)
  def: Map<number, number>; // obrana týmu (log, 0 = průměr, kladná = dostává víc)
}

export const FULL_MODEL: ModelOptions = { halfLifeDays: 120, venueSplit: true, rho: -0.08 };
export const BASIC_MODEL: ModelOptions = { halfLifeDays: null, venueSplit: false, rho: 0 };
// Síly týmů odhadnuté najednou ze všech zápasů, takže se zohlední i síla soupeřů (model Maher / Dixon–Coles).
export const MLE_PENALTY = Math.max(0.5, Number(process.env.MODEL_PENALTY) || 12);
export const MLE_MODEL: ModelOptions = { method: 'mle', halfLifeDays: null, venueSplit: false, rho: 0, penalty: MLE_PENALTY };

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
  mle?: MleParams;
}

export interface Prediction {
  lambdaHome: number;
  lambdaAway: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  btts: number;
  over15: number;
  over25: number;
  over35: number;
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
    mle: o.method === 'mle' && enough ? fitMle(matches, o, asOf) : undefined,
  };
}

// Odhad metodou maximální věrohodnosti (Poissonova regrese):
//   góly domácích ~ Poisson(exp(c + home + útok_domácích + obrana_hostů))
//   góly hostů    ~ Poisson(exp(c + útok_hostů + obrana_domácích))
// Hledá se taková síla všech týmů najednou, která nejlépe vysvětlí všechny výsledky. Penalizace táhne
// týmy s málo zápasy k průměru. Řeší se po souřadnicích Newtonovou metodou (každý krok je jednorozměrný).
function fitMle(matches: FinishedMatch[], o: ModelOptions, asOf: number): MleParams {
  const pen = o.penalty ?? 4;
  const rows = matches.map((m) => {
    const age = m.time ? Math.max(0, (asOf - m.time) / DAY) : 0;
    const w = o.halfLifeDays && m.time ? Math.pow(0.5, age / o.halfLifeDays) : 1;
    return { ...m, w };
  });
  const ids = new Set<number>();
  for (const m of rows) { ids.add(m.homeId); ids.add(m.awayId); }

  const ws = o.warmStart;
  const att = new Map<number, number>();
  const def = new Map<number, number>();
  for (const id of ids) { att.set(id, ws?.att.get(id) ?? 0); def.set(id, ws?.def.get(id) ?? 0); }
  let sw = 0, sg = 0, shg = 0, sag = 0;
  for (const m of rows) { sw += m.w; sg += m.w * (m.homeGoals + m.awayGoals); shg += m.w * m.homeGoals; sag += m.w * m.awayGoals; }
  let c = ws?.c ?? Math.log(Math.max(0.1, sg / (2 * sw)));
  let home = ws?.home ?? Math.log(Math.max(0.1, shg) / Math.max(0.1, sag)) / 2;

  // Seznam zápasů každého týmu, aby se jeden krok počítal jen z jeho zápasů
  const byTeam = new Map<number, number[]>();
  rows.forEach((m, i) => {
    (byTeam.get(m.homeId) ?? byTeam.set(m.homeId, []).get(m.homeId)!).push(i);
    (byTeam.get(m.awayId) ?? byTeam.set(m.awayId, []).get(m.awayId)!).push(i);
  });
  const muH = (m: typeof rows[number]) => Math.exp(c + home + att.get(m.homeId)! + def.get(m.awayId)!);
  const muA = (m: typeof rows[number]) => Math.exp(c + att.get(m.awayId)! + def.get(m.homeId)!);
  const step = (g: number, h: number) => clamp(g / h, -1, 1); // tlumený Newtonův krok

  const sweeps = ws ? 8 : 40;
  for (let it = 0; it < sweeps; it++) {
    let maxStep = 0;
    // společné parametry
    let g = 0, h = 0, gh = 0, hh = 0;
    for (const m of rows) {
      const a = muH(m), b = muA(m);
      g += m.w * (m.homeGoals - a + m.awayGoals - b); h += m.w * (a + b);
      gh += m.w * (m.homeGoals - a); hh += m.w * a;
    }
    let d = step(g, h); c += d; maxStep = Math.max(maxStep, Math.abs(d));
    d = step(gh, hh); home += d; maxStep = Math.max(maxStep, Math.abs(d));

    // týmy: útok a obrana
    for (const id of ids) {
      let ga = -pen * att.get(id)!, ha = pen, gd = -pen * def.get(id)!, hd = pen;
      for (const i of byTeam.get(id)!) {
        const m = rows[i];
        if (m.homeId === id) {
          const a = muH(m), b = muA(m);
          ga += m.w * (m.homeGoals - a); ha += m.w * a; // vstřelené doma
          gd += m.w * (m.awayGoals - b); hd += m.w * b; // obdržené doma
        } else {
          const a = muH(m), b = muA(m);
          ga += m.w * (m.awayGoals - b); ha += m.w * b; // vstřelené venku
          gd += m.w * (m.homeGoals - a); hd += m.w * a; // obdržené venku
        }
      }
      const da = step(ga, ha), dd = step(gd, hd);
      att.set(id, att.get(id)! + da); def.set(id, def.get(id)! + dd);
      maxStep = Math.max(maxStep, Math.abs(da), Math.abs(dd));
    }
    if (maxStep < 1e-4) break;
  }
  return { c, home, att, def };
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
  let lambdaHome: number, lambdaAway: number;
  if (model.mle) {
    // Tým, který v datech není (nováček), má průměrnou sílu
    const { c, home, att, def } = model.mle;
    lambdaHome = clamp(Math.exp(c + home + (att.get(homeId) ?? 0) + (def.get(awayId) ?? 0)), 0.2, 4.5);
    lambdaAway = clamp(Math.exp(c + (att.get(awayId) ?? 0) + (def.get(homeId) ?? 0)), 0.2, 4.5);
  } else {
    const h = strengths(model, homeId);
    const a = strengths(model, awayId);
    lambdaHome = clamp(model.avgHome * h.atkHome * a.defAway, 0.2, 4.5);
    lambdaAway = clamp(model.avgAway * a.atkAway * h.defHome, 0.2, 4.5);
  }

  let homeWin = 0, draw = 0, awayWin = 0, over15 = 0, over25 = 0, over35 = 0, btts = 0, total = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = poissonPmf(i, lambdaHome) * poissonPmf(j, lambdaAway) * tau(i, j, lambdaHome, lambdaAway, model.rho);
      total += p;
      if (i > j) homeWin += p; else if (i === j) draw += p; else awayWin += p;
      if (i + j >= 2) over15 += p;
      if (i + j >= 3) over25 += p;
      if (i + j >= 4) over35 += p;
      if (i >= 1 && j >= 1) btts += p;
    }
  }
  return {
    lambdaHome, lambdaAway,
    homeWin: homeWin / total, draw: draw / total, awayWin: awayWin / total,
    over15: over15 / total, over25: over25 / total, over35: over35 / total, btts: btts / total,
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
// Nový model s odhadem metodou max. věrohodnosti zapneš: MODEL_PROFILE=mle
export type ModelProfile = 'basic' | 'full' | 'mle';
export function activeModelProfile(): ModelProfile {
  const p = process.env.MODEL_PROFILE;
  return p === 'full' || p === 'mle' ? p : 'basic';
}
export function activeModelOptions(): ModelOptions {
  const p = activeModelProfile();
  return p === 'full' ? FULL_MODEL : p === 'mle' ? MLE_MODEL : BASIC_MODEL;
}
