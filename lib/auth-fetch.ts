import { supabase } from '@/lib/supabase';

// fetch s přihlašovacím tokenem, aby server poznal přihlášeného uživatele (a jeho VIP).
export async function authFetch(url: string, init: RequestInit = {}) {
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {}
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers, cache: 'no-store' });
}
