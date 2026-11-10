'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        setUser(user);

        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            console.error('Chyba při dotazu na profil v Supabase:', error.message || error);
          }

          setIsVip(Boolean(profile?.is_premium));
        }
      } catch (err: any) {
        console.error('Chyba při načítání profilu:', err.message || err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsVip(false);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">
      
      {/* 🚀 PRÉMIOVÁ HLAVIČKA S ČISTÝM TEXTOVÝM LOGEM */}
      <header className="sticky top-0 z-50 bg-[#07090e]/95 backdrop-blur-md border-b border-amber-500/20 px-6 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto relative flex items-center justify-between gap-4">
          
          <Link href="/" className="flex items-center gap-3.5 group cursor-pointer">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-black text-xl tracking-wider uppercase font-mono">
                <span className="text-white group-hover:text-amber-400 transition-colors">APEX</span>
                <span className="text-amber-400">ODDS</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold uppercase tracking-widest ml-1 shadow-sm">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-gray-400 tracking-[0.2em] uppercase font-bold">
                Intelligence Engine
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-[#04060a] border border-gray-800/90 p-1 rounded-xl items-center gap-1.5 shadow-inner">
            <Link href="/tips" className="text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all">Tipy</Link>
            <Link href="/risk-bombs" className="text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all">Bomby</Link>
            <Link href="/generator" className="text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all">Generátor</Link>
            <Link href="/history" className="text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all">Historie</Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-[#04060a] border border-amber-500/30 px-4 py-2 rounded-xl shadow-inner">
                {isVip ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse shadow-sm">
                    PRO VIP
                  </span>
                ) : (
                  <span className="bg-gray-800 text-gray-300 border border-gray-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    FREE
                  </span>
                )}
                
                <span className="text-gray-200 text-xs font-mono font-medium">{user.email}</span>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 text-xs transition-all pl-1 cursor-pointer font-medium">Odhlásit</button>
              </div>
            ) : (
              <Link href="/login" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-950/55 uppercase tracking-wider">Přihlásit se</Link>
            )}
          </div>
        </div>
      </header>

      {/* 👤 HLAVNÍ OBSAH PROFILU */}
      <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-all flex items-center gap-1 font-medium">
            ← Zpět na hlavní stránku
          </Link>
        </div>

        <div className="bg-[#0b0f17] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-8">
          
          {/* Hlavička profilu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
                👤
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Uživatelský profil ApexOdds</h1>
                <p className="text-xs text-gray-300 mt-0.5">Správa vašeho účtu, členství a přístupů</p>
              </div>
            </div>

            {/* Indikátor stavu podle reálné databáze */}
            <div>
              {isLoading ? (
                <span className="text-xs text-gray-400">Načítám stav...</span>
              ) : isVip ? (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black px-4 py-2 rounded-xl uppercase tracking-wider flex items-center gap-2 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  PRO ČLEN (PREMIUM AKTIVNÍ)
                </span>
              ) : (
                <span className="bg-gray-800 text-gray-300 border border-gray-700 text-xs font-black px-4 py-2 rounded-xl uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  FREE UŽIVATEL
                </span>
              )}
            </div>
          </div>

          {/* Informace o účtu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#04060a] border border-gray-800/80 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Přihlášený E-mail</span>
              <div className="text-sm font-mono text-white font-bold">
                {user ? user.email : 'Nepřihlášen'}
              </div>
            </div>

            <div className="bg-[#04060a] border border-gray-800/80 p-5 rounded-2xl space-y-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Stav předplatného</span>
              <div className="text-sm font-bold text-amber-400">
                {isVip ? 'ApexOdds PRO (Neomezený přístup)' : 'Free tarif (Omezený přístup)'}
              </div>
            </div>
          </div>

          {/* Správa členství / Aktivace */}
          <div className="bg-[#04060a] border border-gray-800/80 p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Správa členství a platnosti</h3>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b0f17] p-4 rounded-xl border border-gray-800">
              <div>
                <div className="text-xs font-bold text-white">
                  {isVip ? 'Předplatné je aktivní a plně funkční' : 'Měsíční PRO členství (199 Kč / měsíc)'}
                </div>
                <div className="text-[11px] text-gray-300 mt-0.5">
                  {isVip ? 'Užíváte si plný přístup ke všem AI modelům a generátoru.' : 'Získejte přístup ke generátoru tiketů a 1.9+ risk bombám.'}
                </div>
              </div>

              {!isVip && (
                <Link
                  href="/"
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-950/40 uppercase tracking-wider"
                >
                  Aktivovat PRO členství
                </Link>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}