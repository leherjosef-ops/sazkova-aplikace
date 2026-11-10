import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Chybí autorizační hlavička' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Vytvoření Supabase klienta s předaným tokenem uživatele
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Pro zápis s oprávněním administrátora
    );

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Chybí ID uživatele' }, { status: 400 });
    }

    // Aktualizace tabulky profiles na VIP (is_premium = true)
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'VIP členství bylo úspěšně aktivováno' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}