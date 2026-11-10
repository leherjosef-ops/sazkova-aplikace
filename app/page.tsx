'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.is_premium) {
            setIsVip(true);
          }
        }
      } catch (err) {
        console.error('Chyba při načítání uživatele:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsVip(false);
    window.location.reload();
  };

  const handleActivateVip = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', user.id);

      if (error) {
        alert('Chyba při aktivaci PRO: ' + error.message);
      } else {
        alert('PRO členství bylo úspěšně aktivováno!');
        setIsVip(true);
      }
    } catch (err) {
      alert('Nastala neočekávaná chyba.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">
      
      {/* 🚀 PRÉMIOVÁ HLAVIČKA S ČISTÝM TEXTOVÝM LOGEM */}
      <header className="sticky top-0 z-50 bg-[#07090e]/95 backdrop-blur-md border-b border-amber-500/20 px-6 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto relative flex items-center justify-between gap-4">
          
          {/* Klikací čisté textové logo vedoucí na úvodní stránku */}
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

          {/* Hlavní navigace s výbornou čitelností */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-[#04060a] border border-gray-800/90 p-1 rounded-xl items-center gap-1.5 shadow-inner">
            <Link href="/tips" className="text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all">Tipy</Link>
            <Link href="/risk-bombs" className="text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all">Bomby</Link>
            <Link href="/generator" className="text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all">Generátor</Link>
            <Link href="/history" className="text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all">Historie</Link>
          </nav>

          {/* Uživatelský panel */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <span className="text-xs text-gray-400">Načítám...</span>
            ) : user ? (
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
                
                <Link href="/profile" className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-lg transition-all shadow-sm">
                  Profil
                </Link>
                
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 text-xs transition-all pl-1 cursor-pointer font-medium">
                  Odhlásit
                </button>
              </div>
            ) : (
              <Link href="/login" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-950/55 uppercase tracking-wider">
                Přihlásit se
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* 🏔️ HLAVNÍ OBSAH STRÁNKY */}
      <main className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
        
        {/* Hero sekce */}
        <div className="text-center space-y-6 py-12 relative">
          <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-20 blur-3xl">
            <div className="w-96 h-96 bg-amber-500 rounded-full"></div>
          </div>

          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
            ✨ Další generace matematického sázení
          </span>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Dobijte vrcholy s <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">APEX ODDS</span>
          </h1>

          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Pokročilý Poissonův model, analýza hodnotných kurzů (Value Bets) a automatický generátor tiketů pro maximální úspěšnost vašich sázek.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/tips" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-8 py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-amber-950/50 uppercase tracking-wider">
              Zobrazit dnešní tipy ➔
            </Link>
            <Link href="/generator" className="bg-[#0b0f17] hover:bg-[#111826] text-gray-200 border border-gray-700 font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-lg">
              Vyzkoušet generátor
            </Link>
          </div>
        </div>

        {/* Sekce předplatného / PRO karty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Free tarif */}
          <div className="bg-[#0b0f17] border border-gray-800 p-8 rounded-3xl space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Základní přístup</span>
              <h3 className="text-2xl font-black text-white">Free Uživatelská sekce</h3>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                Základní vzorek 3 ověřených tipů denně a možnost orientace v základních statistikách zápasů.
              </p>
              <ul className="space-y-2.5 text-xs text-gray-300">
                <li className="flex items-center gap-2">✓ 3 tipy denně zdarma</li>
                <li className="flex items-center gap-2">✓ Základní přehled zápasů</li>
                <li className="flex items-center gap-2 text-gray-500">✕ Neomezený generátor tiketů</li>
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-800/80">
              <span className="text-xs text-gray-400 font-semibold">Aktivní stav: {isVip ? 'Přechod na PRO' : 'Základní tarif'}</span>
            </div>
          </div>

          {/* PRO VIP tarif */}
          <div className="bg-gradient-to-b from-[#121824] to-[#0b0f17] border-2 border-amber-500/50 p-8 rounded-3xl space-y-6 shadow-2xl relative flex flex-col justify-between">
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              Doporučeno
            </div>

            <div className="space-y-4">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">Kompletní balíček</span>
              <h3 className="text-2xl font-black text-white">ApexOdds PRO</h3>
              <div className="text-3xl font-black text-amber-400 font-mono">
                199 Kč <span className="text-xs text-gray-400 font-normal">/ měsíc</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                Plný neomezený přístup ke všem matematickým modelům, predikcím, 1.9+ risk bombám a AI generátoru.
              </p>
              <ul className="space-y-2.5 text-xs text-gray-200 font-medium">
                <li className="flex items-center gap-2 text-amber-300">✓ Neomezený přístup ke všem zápasům</li>
                <li className="flex items-center gap-2 text-amber-300">✓ AI Generátor tiketů podle kurzů</li>
                <li className="flex items-center gap-2 text-amber-300">✓ Ukládání tiketů do profilu a historie</li>
              </ul>
            </div>

            <div>
              {isVip ? (
                <div className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs py-3.5 rounded-xl text-center uppercase tracking-wider">
                  ✓ PRO Členství je aktivní
                </div>
              ) : (
                <button
                  onClick={handleActivateVip}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs py-3.5 rounded-xl transition-all shadow-xl shadow-amber-950/60 uppercase tracking-wider cursor-pointer"
                >
                  ⚡ Aktivovat PRO členství
                </button>
              )}
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}