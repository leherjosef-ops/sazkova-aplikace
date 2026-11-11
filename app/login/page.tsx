'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/Toaster';
import { T, tr } from '@/lib/i18n';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      if (!agreed) return toast(tr('Pro registraci potvrď, že je ti 18 let a souhlasíš s podmínkami.'));
      if (password.length < 8) return toast(tr('Heslo musí mít alespoň 8 znaků.'));
      setLoading(true);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      setLoading(false);
      if (signUpError) return toast(tr('Registrace se nepodařila: ') + signUpError.message);
      if (data.session) {
        router.push('/');
        router.refresh();
      } else {
        toast(tr('Hotovo. Potvrď e-mail v odkazu, který ti přišel, a pak se přihlas.'));
        setMode('login');
      }
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast(tr('Chyba při přihlášení: ') + error.message);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  // Přihlášení přes OAuth (Google)
  const handleSocialLogin = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast(tr('Chyba při přihlášení přes ') + provider + ': ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100 flex flex-col items-center justify-center p-6 font-sans selection:bg-amber-500 selection:text-black">
      <div className="max-w-md w-full bg-[#14292a] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center text-2xl shadow-md shadow-emerald-950/50 mb-1">
            ⚡
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight"><T>{`ApexOdds`}</T></h1>
          <p className="text-xs text-gray-400 font-medium">{mode === 'login' ? tr('Přihlaste se ke svému účtu') : tr('Vytvořte si účet')}</p>
        </div>

        {/* Sociální přihlášení (Google) */}
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center gap-2 bg-[#0a1715] hover:bg-gray-800 border border-gray-800/80 text-gray-200 text-xs font-semibold py-2.5 rounded-xl transition-all shadow-inner"
          >
            <span>🌐</span> <T>{`Google`}</T>
          </button>
        </div>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-800/80"></div>
          <span className="px-3 text-gray-500 text-[10px] font-semibold"><T>{`nebo e-mailem`}</T></span>
          <div className="flex-grow border-t border-gray-800/80"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5"><T>{`E-mailová adresa`}</T></label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.cz"
              className="w-full bg-[#0a1715] border border-gray-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5"><T>{`Heslo`}</T></label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0a1715] border border-gray-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>

          {mode === 'signup' && (
            <label className="flex items-start gap-2 text-[11px] text-gray-400 leading-snug cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-emerald-500" />
              <span>
                <T>{`Je mi 18 let a souhlasím s`}</T> <Link href="/terms" className="underline hover:text-white"><T>{`podmínkami`}</T></Link> a{' '}
                <Link href="/privacy" className="underline hover:text-white"><T>{`zásadami ochrany osobních údajů`}</T></Link>.
              </span>
            </label>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {loading ? tr('Chvilku strpení...') : mode === 'login' ? tr('Přihlásit se') : tr('Vytvořit účet')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          {mode === 'login' ? tr('Nemáš účet?') : tr('Už účet máš?')}{' '}
          <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="font-bold text-emerald-400 hover:text-emerald-300">
            {mode === 'login' ? tr('Zaregistrovat se') : tr('Přihlásit se')}
          </button>
        </p>

        <div className="text-center pt-2 border-t border-gray-800/80">
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-all font-medium">
            <T>{`← Zpět na hlavní stránku`}</T>
          </Link>
        </div>
      </div>
    </div>
  );
}