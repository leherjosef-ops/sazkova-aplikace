// Typy sázek spočítané z jedné matice skóre a výběr těch nejpravděpodobnějších pro zápas.
import type { Prediction } from './poisson';
import { evaluateTip } from './settle';

export type MarketKey = 'home' | 'draw' | 'away' | '1X' | 'X2' | '12' | 'o15' | 'o25' | 'o35' | 'u25' | 'u35' | 'bttsY' | 'bttsN';
export type MarketGroup = 'result' | 'goals' | 'btts';

export interface Candidate {
  key: MarketKey;
  group: MarketGroup;
  name: string; // název se ukládá česky, podle něj se tiket vyhodnocuje (lib/settle.ts)
  prob: number; // šance podle modelu
}

export function candidates(p: Prediction, home: string, away: string): Candidate[] {
  return [
    { key: 'home', group: 'result', name: `Výhra ${home}`, prob: p.homeWin },
    { key: 'draw', group: 'result', name: 'Remíza', prob: p.draw },
    { key: 'away', group: 'result', name: `Výhra ${away} (hosté)`, prob: p.awayWin },
    { key: '1X', group: 'result', name: `${home} neprohraje (1X)`, prob: p.homeWin + p.draw },
    { key: 'X2', group: 'result', name: `${away} neprohraje (X2)`, prob: p.awayWin + p.draw },
    { key: '12', group: 'result', name: 'Nebude remíza (12)', prob: p.homeWin + p.awayWin },
    { key: 'o15', group: 'goals', name: 'Celkem gólů: Více než 1.5 gólů', prob: p.over15 },
    { key: 'o25', group: 'goals', name: 'Celkem gólů: Více než 2.5 gólů', prob: p.over25 },
    { key: 'o35', group: 'goals', name: 'Celkem gólů: Více než 3.5 gólů', prob: p.over35 },
    { key: 'u25', group: 'goals', name: 'Celkem gólů: Méně než 2.5 gólů', prob: 1 - p.over25 },
    { key: 'u35', group: 'goals', name: 'Celkem gólů: Méně než 3.5 gólů', prob: 1 - p.over35 },
    { key: 'bttsY', group: 'btts', name: 'Oba týmy dají gól (ANO)', prob: p.btts },
    { key: 'bttsN', group: 'btts', name: 'Oba týmy dají gól (NE)', prob: 1 - p.btts },
  ];
}

// Dva tipy jdou na jeden tiket jen tehdy, když existuje skóre, při kterém vyjdou oba.
export function compatible(a: string, b: string): boolean {
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
    if (evaluateTip(a, i, j) === 'WON' && evaluateTip(b, i, j) === 'WON') return true;
  }
  return false;
}

// a ⇒ b: kdykoli vyjde a, vyjde i b (např. „výhra domácích" ⇒ „domácí neprohrají"). Takové dvojice jsou zbytečné.
export function implies(a: string, b: string): boolean {
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
    if (evaluateTip(a, i, j) === 'WON' && evaluateTip(b, i, j) !== 'WON') return false;
  }
  return true;
}

export const SELECT_DEFAULTS = { count: 3, minOdds: 1.3, minProb: 0.35 };

// Výběr podle úspěšnosti: nejvyšší šance, ale bez „zbytečných" sázek s kurzem pod minOdds (vyhrají často,
// ale skoro nic nevydělají) a bez riskantních pod minProb. Nejdřív jeden tip z každé skupiny (výsledek, góly,
// oba dají gól), pak doplnit. Protichůdné tipy (např. víc i míň než 2,5 gólu) se nevyberou spolu.
export function selectTips<T extends { group: string; name: string; chance: number; odds: number }>(
  list: T[],
  opts: Partial<typeof SELECT_DEFAULTS> = {}
): T[] {
  const { count, minOdds, minProb } = { ...SELECT_DEFAULTS, ...opts };
  const ok = list.filter((t) => t.odds >= minOdds && t.chance >= minProb).sort((a, b) => b.chance - a.chance);
  const out: T[] = [];
  const fits = (t: T) =>
    !out.includes(t) && out.every((o) => compatible(o.name, t.name) && !implies(o.name, t.name) && !implies(t.name, o.name));
  for (const t of ok) if (out.length < count && !out.some((o) => o.group === t.group) && fits(t)) out.push(t);
  for (const t of ok) if (out.length < count && fits(t)) out.push(t);
  return out;
}
