import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminClient, getUserFromRequest } from '@/lib/server-auth';

// Klient se vytváří až při požadavku, aby build nepadal, když klíč při stavbě není k dispozici.
let _stripe: Stripe | null = null;
const getStripe = () => (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!));

// Otevře zákaznický portál Stripe, kde si člověk zruší předplatné, změní kartu a stáhne faktury.
export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Nejste přihlášen.' }, { status: 401 });

    const db = adminClient();
    const { data: profile } = await db.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle();
    let customerId: string | undefined = profile?.stripe_customer_id || undefined;

    // Starší platby (před touhle úpravou) nemají uložené ID zákazníka → dohledáme podle e-mailu
    if (!customerId && user.email) {
      const found = await getStripe().customers.list({ email: user.email, limit: 1 });
      customerId = found.data[0]?.id;
      if (customerId) await db.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }
    if (!customerId) return NextResponse.json({ error: 'Nenašli jsme žádné předplatné k tomuto účtu.' }, { status: 404 });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) return NextResponse.json({ error: 'Nelze určit adresu webu.' }, { status: 400 });

    const session = await getStripe().billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/profile` });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('billing-portal:', err.message);
    return NextResponse.json({ error: 'Portál se nepodařilo otevřít. Zkontroluj, že je ve Stripe zapnutý Customer portal.' }, { status: 500 });
  }
}
