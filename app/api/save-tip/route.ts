import { NextResponse } from 'next/server';
import { adminClient, getUserFromRequest } from '@/lib/server-auth';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Nejste přihlášen.' }, { status: 401 });
    }

    const body = await request.json();
    const { match_id, home_team, away_team, league, tip_name, odds, match_date } = body;

    const oddsNum = Number(odds);
    if (
      !match_id ||
      typeof home_team !== 'string' ||
      typeof away_team !== 'string' ||
      typeof tip_name !== 'string' ||
      !Number.isFinite(oddsNum) ||
      oddsNum < 1 ||
      oddsNum > 1000
    ) {
      return NextResponse.json({ success: false, message: 'Neplatná data tipu.' }, { status: 400 });
    }

    const { data, error } = await adminClient()
      .from('betting_history')
      .insert([
        {
          match_id: String(match_id),
          home_team: home_team.slice(0, 100),
          away_team: away_team.slice(0, 100),
          league: typeof league === 'string' ? league.slice(0, 100) : null,
          tip_name: tip_name.slice(0, 150),
          odds: oddsNum,
          match_date,
          status: 'PENDING',
        },
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('save-tip:', error.message);
    return NextResponse.json({ success: false, message: 'Uložení se nezdařilo.' }, { status: 500 });
  }
}
