import { adminClient, getUserFromRequest } from '@/lib/server-auth';

// Kolik nejbližších zápasů vidí uživatel bez VIP.
export const FREE_MATCHES = 3;

// Je požadavek od přihlášeného uživatele s aktivním VIP? Ověřuje se na serveru, ne v prohlížeči.
export async function isVipRequest(req: Request): Promise<boolean> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return false;
    const { data } = await adminClient().from('profiles').select('is_premium').eq('id', user.id).maybeSingle();
    return Boolean(data?.is_premium);
  } catch {
    return false;
  }
}

// Zápasy zdarma = nejbližší zápasy, přednostně ty s kurzy sázkovek, aby uživatel bez VIP viděl, co aplikace umí
// (value, porovnání kurzů). Stejné pro všechny, nezávisle na řazení na stránce.
const hasBookOdds = (m: any) => (m.tips || []).some((t: any) => t.oddsSource === 'bookmaker');
export function freeMatchIds(matches: { id: number | string; utcDate?: string }[]): Set<string> {
  return new Set(
    [...matches]
      .sort((a, b) => Number(hasBookOdds(b)) - Number(hasBookOdds(a)) || new Date(a.utcDate || 0).getTime() - new Date(b.utcDate || 0).getTime())
      .slice(0, FREE_MATCHES)
      .map((m) => String(m.id))
  );
}

// Pro uživatele bez VIP odstraní z ostatních zápasů tipy a odhady, aby se nedaly přečíst z odpovědi API.
export function lockForFree<T extends { id: number | string; utcDate?: string }>(matches: T[]): T[] {
  const free = freeMatchIds(matches);
  return matches.map((m) =>
    free.has(String(m.id)) ? m : ({ ...m, tips: [], allTips: [], expectedGoals: null, locked: true } as T)
  );
}
