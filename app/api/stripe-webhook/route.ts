import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-28.acacia' as any,
});

// DŮLEŽITÉ: Používáme SERVICE_ROLE_KEY, aby server mohl bezpečně změnit is_vip v databázi
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET! // Klíč získaný ze Stripe CLI nebo dashboardu
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Jakmile zákazník úspěšně dokončí platbu přes checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Zjistíme ID uživatele (které si předáváme přes metadata při vytváření checkout session)
    const userId = session.metadata?.userId || session.client_reference_id;

    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_vip: true })
        .eq('id', userId);

      if (error) {
        console.error('Chyba při aktualizaci VIP v Supabase:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}