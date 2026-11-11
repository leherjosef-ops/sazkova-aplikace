import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { adminClient } from '@/lib/server-auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const idOf = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : x?.id);

async function setPremium(userId: string, value: boolean, customerId?: string) {
  const patch: Record<string, unknown> = { is_premium: value, updated_at: new Date().toISOString() };
  if (customerId) patch.stripe_customer_id = customerId; // potřebné pro zákaznický portál (zrušení předplatného)
  const { error } = await adminClient().from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Chybí podpis' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Zákazník dokončil platbu v Checkoutu → aktivovat PRO
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        if (userId && session.payment_status === 'paid') {
          await setPremium(userId, true, idOf(session.customer as any));
        }
        break;
      }

      // Změna stavu předplatného (zrušení, neuhrazeno, obnovení…)
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          const active = sub.status === 'active' || sub.status === 'trialing';
          await setPremium(userId, active, idOf(sub.customer as any));
        }
        break;
      }
    }
  } catch (err: any) {
    console.error('Chyba při aktualizaci PRO v Supabase:', err.message);
    // 500 → Stripe zkusí webhook doručit znovu
    return NextResponse.json({ error: 'Databázová chyba' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
