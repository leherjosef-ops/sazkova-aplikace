'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert('Chyba při přihlášení: ' + error.message);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  // Přihlášení přes OAuth (Google / Apple)
  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      alert('Chyba při přihlášení přes ' + provider + ': ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-6 font-sans selection:bg-emerald-500 selection:text-black">
      <div className="max-w-md w-full bg-[#0b101b] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center text-2xl shadow-md shadow-emerald-950/50 mb-1">
            ⚡
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">ApexOdds</h1>
          <p className="text-xs text-gray-400 font-medium">Přihlaste se ke svému účtu</p>
        </div>

        {/* Sociální přihlášení (Google & Apple) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center gap-2 bg-[#05080f] hover:bg-gray-800 border border-gray-800/80 text-gray-200 text-xs font-semibold py-2.5 rounded-xl transition-all shadow-inner"
          >
            <span>🌐</span> Google
          </button>
          <button
            type="button"
            onClick={() => handleSocialLogin('apple')}
            className="flex items-center justify-center gap-2 bg-[#05080f] hover:bg-gray-800 border border-gray-800/80 text-gray-200 text-xs font-semibold py-2.5 rounded-xl transition-all shadow-inner"
          >
            <span>🍎</span> Apple
          </button>
        </div>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-800/80"></div>
          <span className="px-3 text-gray-500 text-[10px] uppercase tracking-wider font-semibold">nebo e-mailem</span>
          <div className="flex-grow border-t border-gray-800/80"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">E-mailová adresa</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.cz"
              className="w-full bg-[#05080f] border border-gray-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Heslo</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#05080f] border border-gray-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {loading ? 'Přihlašuji...' : 'Přihlásit se'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-800/80">
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-all font-medium">
            ← Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    </div>
  );
}