# ApexOdds

Next.js + Supabase + Stripe. Statistický Poissonův model pro fotbal, kurzy z The Odds API, tikety, zpětné ověření modelu.

## Po aktualizaci udělej
1. **Supabase → SQL Editor:** spusť celý `supabase.sql` (jde pouštět opakovaně). Přidá sloupce k tiketům, tabulky `user_limits` a `tips_cache`, RLS a ochranu pauzy.
2. **`.env.local`:** doplň proměnné podle `.env.example` (nové: `CRON_SECRET`, `TIPS_CACHE_MINUTES`, `MODEL_PROFILE`).
3. **Stripe:**
   - webhook na `/api/stripe-webhook` s událostmi `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`,
   - zapni **Customer portal** (Settings → Billing → Customer portal), jinak nepůjde zrušit předplatné z profilu.
4. **Automatické vyhodnocení tiketů:** `vercel.json` volá `/api/cron/settle-tickets` denně ve 4:00 UTC. Na Vercelu nastav `CRON_SECRET`. Mimo Vercel stačí libovolný plánovač, který zavolá tu adresu s hlavičkou `Authorization: Bearer <CRON_SECRET>`.
5. Odkazy `[...]` v `/terms`, `/privacy`, `/responsible` doplň a texty nech zkontrolovat právníkem.

## Příkazy
- `npm run dev` – vývoj
- `npm test` – testy modelu, vyhodnocení tiketů a kurzů (potřebuje Node 22.6+)

## Jak je model ověřený
Stránka `/model` zpětně testuje model na odehraných zápasech a porovnává ho s naivním odhadem. Výchozí je základní model (`MODEL_PROFILE=basic`), protože při ověření vyšel o chlup líp než vylepšený. Vylepšený zapneš pomocí `MODEL_PROFILE=full`.
