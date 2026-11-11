import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server-auth';
import { settleTickets } from '@/lib/settle-run';

// Automatické vyhodnocení tiketů všech uživatelů. Volá se plánovačem (viz vercel.json),
// který posílá hlavičku Authorization: Bearer <CRON_SECRET>.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET není nastavený.' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Chybí FOOTBALL_DATA_API_KEY.' }, { status: 500 });

  try {
    const r = await settleTickets(adminClient(), apiKey);
    return NextResponse.json({ success: true, ...r });
  } catch (err: any) {
    console.error('cron settle:', err.message);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
