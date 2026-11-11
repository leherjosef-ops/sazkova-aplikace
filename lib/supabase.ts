import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Jeden sdílený klient pro celý prohlížeč. Víc klientů nad stejným úložištěm přihlášení
// způsobuje varování „Multiple GoTrueClient instances" a může rozbít přihlášení.
const globalForSupabase = globalThis as unknown as { __apexSupabase?: SupabaseClient<any> };

export const supabase: SupabaseClient<any> =
  globalForSupabase.__apexSupabase ??
  (globalForSupabase.__apexSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!));
