import { createClient } from '@supabase/supabase-js';

// Pouze pro serverový kód (API routes). Nikdy neimportovat do 'use client' souborů.
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Ověří JWT z hlavičky Authorization a vrátí přihlášeného uživatele (nebo null).
export async function getUserFromRequest(req: Request) {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
