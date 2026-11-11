import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '@/lib/server-auth';

// Klient se vytváří až při požadavku, aby build nepadal, když klíč při stavbě není k dispozici.
let _stripe: Stripe | null = null;
const getStripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!));

export async function POST(req: Request) {
  try {
    // Uživatel musí být přihlášený – ID i e-mail bereme z ověřeného tokenu, ne z těla požadavku
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error('Chybí STRIPE_PRICE_ID');
      return NextResponse.json({ error: 'Platba není nastavená.' }, { status: 500 });
    }
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      return NextResponse.json({ error: 'Nelze určit adresu webu.' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email || undefined,
      // Podle těchto hodnot webhook pozná, komu aktivovat/zrušit PRO
      client_reference_id: user.id,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
      success_url: `${origin}/profile?success=true`,
      cancel_url: `${origin}/profile?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Chyba platební brány:', err);
    return NextResponse.json({ error: 'Nepodařilo se vytvořit platbu.' }, { status: 500 });
  }
}
