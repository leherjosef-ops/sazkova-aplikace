import { NextResponse } from 'next/server';
import { adminClient, getUserFromRequest } from '@/lib/server-auth';
import { settleTickets } from '@/lib/settle-run';

// Ruční vyhodnocení tiketů přihlášeného uživatele (tlačítko v Historii).
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: 'Nejste přihlášen.' }, { status: 401 });

    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: 'Chybí FOOTBALL_DATA_API_KEY.' }, { status: 500 });

    const r = await settleTickets(adminClient(), apiKey, user.id);
    return NextResponse.json({ success: true, ...r });
  } catch (err: any) {
    console.error('settle-tickets:', err.message);
    return NextResponse.json({ success: false, error: 'Vyhodnocení se nezdařilo.' }, { status: 500 });
  }
}
