import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { evaluateTip } from '@/lib/settle';

// Klient se vytváří až při požadavku, aby build nepadal, když proměnné při stavbě chybí.
const getDb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const supabase = getDb();
  try {
    // 1. Získání nevyhodnocených tipů (PENDING) z historie
    const { data: pendingBets } = await supabase
      .from('betting_history')
      .select('*')
      .eq('status', 'PENDING');

    if (pendingBets && pendingBets.length > 0) {
      // 2. Nejprve zkusíme ověřit zápasy přímo z naší Supabase tabulky 'matches' (kde mohou být upraveny ručně)
      const matchIds = pendingBets.map((b: any) => b.match_id).filter(Boolean);
      
      let dbMatchesMap = new Map();
      if (matchIds.length > 0) {
        const { data: dbMatches } = await supabase
          .from('matches')
          .select('*')
          .in('id', matchIds);
        
        if (dbMatches) {
          dbMatches.forEach((m: any) => dbMatchesMap.set(m.id.toString(), m));
        }
      }

      // 3. Případně si stáhneme i data z externího Football API jako fallback
      const today = new Date().toISOString().split('T')[0];
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      let apiMatches: any[] = [];

      try {
        const res = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${pastDate}&dateTo=${today}`, {
          headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '' },
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          apiMatches = json.matches || [];
        }
      } catch (e) {
        console.error('Chyba při stahování z Football API:', e);
      }

      // 4. Projdeme pending sázky a vyhodnotíme je
      for (const bet of pendingBets) {
        if (!bet.match_id) continue;

        let isFinished = false;
        let homeGoals = 0;
        let awayGoals = 0;

        // A) Zkontrolujeme, zda zápas a jeho výsledek / status existuje v naší Supabase tabulce 'matches'
        const manualMatch = dbMatchesMap.get(bet.match_id.toString());
        if (manualMatch && (manualMatch.status === 'FINISHED' || manualMatch.status === 'WON' || manualMatch.status === 'LOST' || manualMatch.score)) {
          isFinished = true;
          // Pokud máte v tabulce 'matches' uloženo skóre nebo přímý status vyhry/prohry
          if (manualMatch.status === 'WON') {
            await getDb().from('betting_history').update({ status: 'WIN', result_score: manualMatch.score || 'Konec' }).eq('id', bet.id);
            continue;
          } else if (manualMatch.status === 'LOST') {
            await getDb().from('betting_history').update({ status: 'LOSS', result_score: manualMatch.score || 'Konec' }).eq('id', bet.id);
            continue;
          }

          // Pokud máme skóre z DB (např. rozparsováním nebo pokud je v poli)
          if (typeof manualMatch.score === 'string' && manualMatch.score.includes(':')) {
            const parts = manualMatch.score.split(':');
            homeGoals = parseInt(parts[0]) || 0;
            awayGoals = parseInt(parts[1]) || 0;
          }
        } 
        
        // B) Pokud není v Supabase vyhodnoceno ručně, zkusíme externí API
        if (!isFinished) {
          const apiMatch = apiMatches.find((m: any) => m.id.toString() === bet.match_id.toString());
          if (apiMatch && apiMatch.status === 'FINISHED') {
            isFinished = true;
            homeGoals = apiMatch.score?.fullTime?.home ?? 0;
            awayGoals = apiMatch.score?.fullTime?.away ?? 0;
          }
        }

        // Pokud je zápas ukončený, spočítáme výsledek podle tipu
        if (isFinished) {
          const scoreStr = `${homeGoals} : ${awayGoals}`;
          const result = evaluateTip(bet.tip_name, homeGoals, awayGoals);

          await supabase
            .from('betting_history')
            .update({
              status: result === 'WON' ? 'WIN' : result === 'LOST' ? 'LOSS' : 'VOID',
              result_score: scoreStr
            })
            .eq('id', bet.id);
        }
      }
    }

    // 5. Načtení historie za posledních 7 dní
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: history, error } = await supabase
      .from('betting_history')
      .select('*')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: history || [] });

  } catch (error: any) {
    console.error('Chyba historie:', error.message);
    return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
  }
}