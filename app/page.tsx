'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/Toaster';
import { T, tr } from '@/lib/i18n';
import Icon from '@/components/Icon';


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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();

      if (json.url) {
        window.location.href = json.url; // přesměrování na platební bránu Stripe
      } else {
        toast(tr('Nepodařilo se spustit platbu: ') + (json.error || tr('neznámá chyba')));
      }
    } catch (err) {
      toast(tr('Nastala neočekávaná chyba.'));
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">
      
      {/* 🚀 PRÉMIOVÁ HLAVIČKA S ČISTÝM TEXTOVÝM LOGEM */}
      <AppHeader active="/" user={user} isVip={isVip} onLogout={handleLogout} loading={isLoading} />

      {/* 🏔️ HLAVNÍ OBSAH STRÁNKY */}
      <main className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
        
        {/* Hero sekce */}
        <div className="text-center space-y-6 py-12 relative">
          <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-20 blur-3xl">
            <div className="w-96 h-96 bg-amber-500 rounded-full"></div>
          </div>

          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
            <Icon name="sparkles" className="w-3.5 h-3.5 inline -mt-0.5" /> <T>{`Další generace matematického sázení`}</T>
          </span>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            <T>{`Dobijte vrcholy s`}</T> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500"><T>{`APEX ODDS`}</T></span>
          </h1>

          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed font-medium">
            <T>{`Statistický Poissonův model, porovnání s kurzy sázkových kanceláří a generátor tiketů. Odhady nejsou záruka výhry, jak model obstál při ověření, uvidíš na stránce Model.`}</T>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/tips" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-8 py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-amber-950/50">
              <T>{`Zobrazit dnešní zápasy ➔`}</T>
            </Link>
            <Link href="/generator" className="bg-[#14292a] hover:bg-[#193230] text-gray-200 border border-gray-700 font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-lg">
              <T>{`Vyzkoušet generátor`}</T>
            </Link>
          </div>
        </div>

        {/* Sekce předplatného / PRO karty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Free tarif */}
          <div className="bg-[#14292a] border border-gray-800 p-8 rounded-3xl space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-gray-400 text-xs font-bold"><T>{`Základní přístup`}</T></span>
              <h3 className="text-2xl font-black text-white"><T>{`Free Uživatelská sekce`}</T></h3>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                <T>{`Základní vzorek 3 předpovědí denně a možnost orientace v základních statistikách zápasů.`}</T>
              </p>
              <ul className="space-y-2.5 text-xs text-gray-300">
                <li className="flex items-center gap-2"><T>{`✓ 3 předpovědi denně zdarma`}</T></li>
                <li className="flex items-center gap-2"><T>{`✓ Základní přehled zápasů`}</T></li>
                <li className="flex items-center gap-2 text-gray-500"><T>{`✕ Neomezený generátor tiketů`}</T></li>
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-800/80">
              <span className="text-xs text-gray-400 font-semibold"><T>{`Aktivní stav:`}</T> {isVip ? tr('VIP aktivní') : tr('Základní tarif')}</span>
            </div>
          </div>

          {/* VIP tarif */}
          <div className="bg-gradient-to-b from-[#193230] to-[#14292a] border-2 border-amber-500/50 p-8 rounded-3xl space-y-6 shadow-2xl relative flex flex-col justify-between">
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-md">
              <T>{`Doporučeno`}</T>
            </div>

            <div className="space-y-4">
              <span className="text-amber-400 text-xs font-bold"><T>{`Kompletní balíček`}</T></span>
              <h3 className="text-2xl font-black text-white"><T>{`ApexOdds VIP`}</T></h3>
              <div className="text-3xl font-black text-amber-400 font-mono">
                <T>{`199 Kč`}</T> <span className="text-xs text-gray-400 font-normal"><T>{`/ měsíc`}</T></span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                <T>{`Plný neomezený přístup ke všem matematickým modelům, predikcím, 1.9+ risk bombám a generátoru tiketů.`}</T>
              </p>
              <ul className="space-y-2.5 text-xs text-gray-200 font-medium">
                <li className="flex items-center gap-2 text-amber-300"><T>{`✓ Neomezený přístup ke všem zápasům`}</T></li>
                <li className="flex items-center gap-2 text-amber-300"><T>{`✓ Generátor tiketů podle kurzů`}</T></li>
                <li className="flex items-center gap-2 text-amber-300"><T>{`✓ Ukládání tiketů do profilu a historie`}</T></li>
              </ul>
            </div>

            <div>
              {isVip ? (
                <div className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs py-3.5 rounded-xl text-center">
                  <T>{`✓ VIP členství je aktivní`}</T>
                </div>
              ) : (
                <button
                  onClick={handleActivateVip}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs py-3.5 rounded-xl transition-all shadow-xl shadow-amber-950/60 cursor-pointer"
                >
                  <Icon name="bolt" className="w-4 h-4 inline -mt-0.5" /> <T>{`Aktivovat VIP členství`}</T>
                </button>
              )}
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}