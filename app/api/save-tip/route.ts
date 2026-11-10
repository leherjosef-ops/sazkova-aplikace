import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { match_id, home_team, away_team, league, tip_name, odds, match_date } = body;

    const { data, error } = await supabase
      .from('betting_history')
      .insert([
        { match_id, home_team, away_team, league, tip_name, odds, match_date, status: 'PENDING' }
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}