import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateTip, settleAccumulator, type Leg, type TipResult } from './settle';

// football-data.org (zdarma) má limit ~10 požadavků za minutu → na jedno spuštění bereme omezený počet zápasů.
const MAX_MATCH_FETCHES = 8;
const FINISH_BUFFER_MS = 2.5 * 3600 * 1000; // zápas se před výkopem + 2,5 h nevyhodnocuje

type Result = { hg: number; ag: number } | null | 'unavailable';

async function fetchResult(id: string, apiKey: string): Promise<Result> {
  try {
    const res = await fetch(`https://api.football-data.org/v4/matches/${id}`, {
      headers: { 'X-Auth-Token': apiKey },
      cache: 'no-store',
    });
    if (res.status === 429) return 'unavailable';
    if (!res.ok) return null;
    const m = await res.json();
    const hg = m.score?.fullTime?.home;
    const ag = m.score?.fullTime?.away;
    if (m.status !== 'FINISHED' || typeof hg !== 'number' || typeof ag !== 'number') return null;
    return { hg, ag };
  } catch {
    return null;
  }
}

// Vyhodnotí čekající tikety (jednoho uživatele, nebo všech, když userId chybí).
export async function settleTickets(db: SupabaseClient, apiKey: string, userId?: string) {
  let q = db
    .from('saved_tickets')
    .select('id, user_id, match_id, tip_name, status, kind, legs, kickoff')
    .or('status.is.null,status.eq.PENDING')
    .order('created_at', { ascending: true })
    .limit(500);
  if (userId) q = q.eq('user_id', userId);

  const { data: tickets, error } = await q;
  if (error) throw error;

  const now = Date.now();
  const due = (utc?: string | null) => !utc || now >= new Date(utc).getTime() + FINISH_BUFFER_MS;

  // Které zápasy je potřeba zjistit
  const needed: string[] = [];
  const add = (id: string | null | undefined, utc?: string | null) => {
    if (id && /^\d+$/.test(String(id)) && due(utc) && !needed.includes(String(id))) needed.push(String(id));
  };
  for (const t of tickets || []) {
    if (t.kind === 'accumulator') (t.legs as Leg[] | null)?.forEach((l) => add(l.match_id, l.utc));
    else add(t.match_id, t.kickoff);
  }

  const results = new Map<string, Result>();
  let rateLimited = false;
  for (const id of needed.slice(0, MAX_MATCH_FETCHES)) {
    const r = await fetchResult(id, apiKey);
    if (r === 'unavailable') { rateLimited = true; break; }
    results.set(id, r);
  }

  let settled = 0;
  let waiting = 0;
  const wins: string[] = [];

  for (const t of tickets || []) {
    let status: 'WON' | 'LOST' | 'VOID' | null = null;
    let effectiveOdds: number | null = null;
    let score: string | null = null;

    if (t.kind === 'accumulator') {
      const legs = (t.legs as Leg[]) || [];
      const per: (TipResult | null)[] = legs.map((l) => {
        const r = results.get(String(l.match_id));
        return r && r !== 'unavailable' ? evaluateTip(l.tip_name, r.hg, r.ag) : null;
      });
      ({ status, effectiveOdds } = settleAccumulator(legs, per));
    } else {
      const r = results.get(String(t.match_id));
      if (r && r !== 'unavailable') {
        status = evaluateTip(t.tip_name, r.hg, r.ag);
        score = `${r.hg} : ${r.ag}`;
      }
    }

    if (!status) { waiting++; continue; }

    const { error: upErr } = await db
      .from('saved_tickets')
      .update({
        status,
        result_score: score,
        settled_at: new Date().toISOString(),
        ...(effectiveOdds ? { settled_odds: effectiveOdds } : {}),
      })
      .eq('id', t.id);
    if (upErr) throw upErr;
    settled++;
    if (status === 'WON') wins.push(String(t.id));
  }

  return { settled, waiting, won: wins.length, rateLimited, checkedMatches: results.size };
}
