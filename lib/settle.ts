// Vyhodnocení tipu podle konečného skóre (90 min + nastavení).
export type TipResult = 'WON' | 'LOST' | 'VOID';

export function evaluateTip(tipName: string, homeGoals: number, awayGoals: number): TipResult {
  const name = tipName || '';

  // Rohy nemáme z čeho vyhodnotit (API nevrací počet rohů) → neplatný tip
  if (name.includes('rohů')) return 'VOID';

  if (name.includes('Oba týmy dají gól')) {
    return homeGoals > 0 && awayGoals > 0 ? 'WON' : 'LOST';
  }
  if (name.includes('Více než 2.5 gólů')) {
    return homeGoals + awayGoals >= 3 ? 'WON' : 'LOST';
  }
  if (name.startsWith('Výhra')) {
    // Tip je vždy ve tvaru "Výhra <domácí tým>"
    return homeGoals > awayGoals ? 'WON' : 'LOST';
  }
  return 'VOID';
}

// ---------- akumulátory ----------
export interface Leg {
  match_id: string;
  match_info?: string;
  tip_name: string;
  odds: number;
  utc?: string;
}

export interface TicketOutcome {
  status: 'WON' | 'LOST' | 'VOID' | null; // null = ještě se čeká
  effectiveOdds: number | null;
}

// results[i] = výsledek i-tého zápasu nebo null, pokud se ještě nehrál.
// Pravidla jako u sázkovek: jedna prohra = prohra celého tiketu (i když se ostatní zápasy ještě nehrály),
// neplatný zápas se bere s kurzem 1,00, pokud jsou všechny neplatné, tiket je neplatný.
export function settleAccumulator(legs: Leg[], results: (TipResult | null)[]): TicketOutcome {
  if (results.some((r) => r === 'LOST')) return { status: 'LOST', effectiveOdds: null };
  if (results.some((r) => r === null)) return { status: null, effectiveOdds: null };
  if (results.length === 0 || results.every((r) => r === 'VOID')) return { status: 'VOID', effectiveOdds: 1 };
  const odds = legs.reduce((acc, l, i) => acc * (results[i] === 'WON' ? Number(l.odds) || 1 : 1), 1);
  return { status: 'WON', effectiveOdds: Math.round(odds * 100) / 100 };
}

// Kolik se vyplatí / prodělá. Bez zadané částky se počítá s modelovou sázkou.
export function ticketProfit(t: { status?: string | null; odds?: number | string | null; settled_odds?: number | string | null; stake?: number | string | null }, defaultStake = 100): number | null {
  const stake = Number(t.stake) > 0 ? Number(t.stake) : defaultStake;
  if (t.status === 'WON') return stake * ((Number(t.settled_odds) || Number(t.odds) || 1) - 1);
  if (t.status === 'LOST') return -stake;
  if (t.status === 'VOID') return 0;
  return null;
}
