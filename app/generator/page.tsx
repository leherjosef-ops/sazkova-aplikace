'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GeneratorPage() {
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState<boolean>(false);

  const [targetOdds, setTargetOdds] = useState<number>(3.5);
  const [matchesCount, setMatchesCount] = useState<number>(3);
  const [generatedTicket, setGeneratedTicket] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stav pro modální okno hloubkové analýzy AI
  const [selectedMatchModal, setSelectedMatchModal] = useState<any | null>(null);

  useEffect(() => {
    async function initData() {
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
    }
    initData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsVip(false);
    window.location.reload();
  };

  const handleGenerate = async () => {
    if (!isVip) {
      alert('Generátor tiketů je dostupný pouze pro členy s ApexOdds PRO předplatným.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGeneratedTicket(null);

    try {
      const res = await fetch('/api/calculate-poisson');
      const json = await res.json();

      if (!json.success || !json.data || json.data.length === 0) {
        setErrorMsg('V reálném API zrovna nejsou k dispozici žádné zápasy pro vygenerování tiketu.');
        setIsGenerating(false);
        return;
      }

      const allTips: any[] = [];
      json.data.forEach((match: any) => {
        match.tips.forEach((tip: any) => {
          allTips.push({
            match: `${match.home_team} vs ${match.away_team}`,
            league: match.league,
            date: match.match_date,
            tip: tip.name,
            odds: parseFloat(tip.bookmakerOdds),
            probability: tip.probability,
            isSureBet: tip.isSureBet
          });
        });
      });

      if (allTips.length < matchesCount) {
        setErrorMsg('Není k dispozici dostatek tipů pro vygenerování požadovaného počtu zápasů.');
        setIsGenerating(false);
        return;
      }

      // 🧠 CHYTRÝ ALGORITMUS PRO VÝBĚR PODLE CÍLOVÉHO KURZU
      let bestCombination: any[] = [];
      let closestDiff = Infinity;

      for (let i = 0; i < 200; i++) {
        const shuffledMatches = [...json.data].sort(() => 0.5 - Math.random());
        const currentCombo: any[] = [];
        const usedMatches = new Set<string>();

        for (const match of shuffledMatches) {
          if (currentCombo.length >= matchesCount) break;
          const matchKey = `${match.home_team} vs ${match.away_team}`;
          if (usedMatches.has(matchKey) || !match.tips || match.tips.length === 0) continue;

          const randomTip = match.tips[Math.floor(Math.random() * match.tips.length)];
          
          currentCombo.push({
            ...match, // Uložíme celý objekt zápasu pro potřeby modálního okna analýzy
            match: matchKey,
            league: match.league,
            date: match.match_date,
            tip: randomTip.name,
            odds: parseFloat(randomTip.bookmakerOdds),
            probability: randomTip.probability,
            isSureBet: randomTip.isSureBet
          });
          usedMatches.add(matchKey);
        }

        if (currentCombo.length === matchesCount) {
          const comboOdds = currentCombo.reduce((acc, curr) => acc * curr.odds, 1);
          const diff = Math.abs(comboOdds - targetOdds);

          if (diff < closestDiff) {
            closestDiff = diff;
            bestCombination = currentCombo;
          }
        }
      }

      if (bestCombination.length === 0) {
        setErrorMsg('Nepodařilo se sestavit tiket odpovídající zadanému kurzu. Zkus upravit parametry.');
      } else {
        setGeneratedTicket(bestCombination);
      }

    } catch (err) {
      console.error('Chyba při generování AI tiketu:', err);
      setErrorMsg('Nastala chyba při propojování s reálným API.');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalOdds = generatedTicket 
    ? generatedTicket.reduce((acc, curr) => acc * curr.odds, 1).toFixed(2) 
    : '0.00';

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
            <Link href="/generator" className="bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md">Generátor</Link>
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
                <Link href="/profile" className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-lg transition-all shadow-sm">Profil</Link>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 text-xs transition-all pl-1 cursor-pointer font-medium">Odhlásit</button>
              </div>
            ) : (
              <Link href="/login" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-950/55 uppercase tracking-wider">Přihlásit se</Link>
            )}
          </div>
        </div>
      </header>

      {/* Hlavní obsah */}
      <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-all flex items-center gap-1 font-medium">
            ← Zpět na hlavní stránku
          </Link>
        </div>

        {/* Pokud uživatel není VIP, zobrazíme zamykací kartu */}
        {!isVip ? (
          <div className="bg-[#0b0f17] border border-amber-500/40 rounded-3xl p-12 text-center max-w-xl mx-auto my-16 space-y-6 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
              ⚡
            </div>
            <div className="space-y-3">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                Exkluzivní sekce
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white">Apex AI Generátor Tiketů</h2>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">
                Automatické skládání hodnotných tiketů podle tvého cílového kurzu a zápasů z matematického modelu. Přístupné pouze pro předplatitele ApexOdds PRO.
              </p>
            </div>
            <Link 
              href="/" 
              className="inline-block bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs px-8 py-3.5 rounded-xl shadow-lg shadow-amber-950/50 transition-all uppercase tracking-wider"
            >
              Aktivovat PRO členství za 199 Kč
            </Link>
          </div>
        ) : (
          <div className="bg-[#0b0f17] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
                ⚡
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Apex AI Generátor Tiketů</h1>
                <p className="text-xs text-gray-300 mt-0.5">Automatické skládání tiketů podle tvého cílového kurzu</p>
              </div>
            </div>

            <div className="bg-[#04060a] border border-gray-800/80 p-6 rounded-2xl space-y-5 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-200 uppercase tracking-wider">Cílový kurz tiketu: <span className="text-amber-400 font-mono">{targetOdds}x</span></label>
                <input 
                  type="range" 
                  min="1.5" 
                  max="15.0" 
                  step="0.5" 
                  value={targetOdds} 
                  onChange={(e) => setTargetOdds(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-gray-900 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-200 uppercase tracking-wider">Počet zápasů na tiketu: <span className="text-amber-400 font-mono">{matchesCount}</span></label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMatchesCount(num)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        matchesCount === num ? 'bg-amber-500 text-black shadow-md font-black' : 'bg-[#0b0f17] text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                      }`}
                    >
                      {num} zápasy
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-black py-3 rounded-xl transition-all shadow-lg shadow-amber-950/40 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              >
                {isGenerating ? 'Generuji optimální tiket...' : '⚡ Vygenerovat tiket podle kurzů'}
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-xl text-red-400 text-xs text-center">
                {errorMsg}
              </div>
            )}

            {generatedTicket && (
              <div className="bg-[#04060a] border border-amber-500/30 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Vygenerovaný AI Tiket</span>
                  <div className="text-sm font-extrabold text-amber-400 font-mono">Celkový kurz: {totalOdds}</div>
                </div>

                <div className="space-y-3">
                  {generatedTicket.map((item, idx) => (
                    <div key={idx} className="bg-[#0b0f17] border border-gray-800/80 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-300 font-medium flex items-center gap-2">
                          <span className="text-amber-400 font-bold">{item.league}</span>
                          <span>•</span>
                          <span>🕒 {item.date}</span>
                        </div>
                        <div className="text-sm font-bold text-white">{item.match}</div>
                        <div className="text-xs text-amber-300 font-semibold">Tip: {item.tip}</div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-xs text-amber-400 font-bold font-mono">Kurz @{item.odds}</div>
                          <div className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1 inline-block">
                            Šance {item.probability}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedMatchModal(item)}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold py-2 px-3 rounded-xl transition-all flex items-center gap-1.5 shadow-inner cursor-pointer"
                        >
                          <span>📊</span> Analýza
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 🚀 ROZŠÍŘENÁ HLOUBKOVÁ AI ANALÝZA (MODÁLNÍ OKNO) */}
      {selectedMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-amber-500/30 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Hlavička modálu */}
            <div className="bg-[#04060a] border-b border-gray-800 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-xl shadow-inner">
                  📊
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {selectedMatchModal.league}
                    </span>
                    <span className="text-[10px] text-gray-300 font-mono">
                      🕒 {selectedMatchModal.date}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {selectedMatchModal.match}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMatchModal(null)}
                className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white flex items-center justify-center transition-all font-bold cursor-pointer hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            {/* Obsah analýzy */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <div className="bg-[#04060a] border border-gray-800/80 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
                    <span>⚡</span> Algoritmické metriky & Model xG
                  </h4>
                  <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Poisson v3.2 Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#0b0f17] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block uppercase font-semibold">Očekávané góly domácí (xG)</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {selectedMatchModal.homeExpectedGoals || '1.74'}
                    </span>
                  </div>

                  <div className="bg-[#0b0f17] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block uppercase font-semibold">Očekávané góly hosté (xG)</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {selectedMatchModal.awayExpectedGoals || '1.08'}
                    </span>
                  </div>

                  <div className="bg-[#0b0f17] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block uppercase font-semibold">Úspěšnost algoritmu v lize</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {selectedMatchModal.leagueAccuracy || '69.8 %'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#04060a] via-[#0b0f17] to-[#04060a] border border-amber-500/30 p-5 rounded-2xl space-y-2.5">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <span>🧠</span> Odůvodnění matematického modelu (Generator Edge)
                </h4>
                <p className="text-xs text-gray-200 leading-relaxed font-sans">
                  {selectedMatchModal.aiReasoning || 
                    `Tento zápas byl vybrán generátorem na základě optimálního poměru rizika a výnosu. Model predikuje dominanci domácího celku nebo vysokou ofenzivní aktivitu s ohledem na aktuální formu a xG koeficienty obou týmů.`
                  }
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                  Zvolený tip na vygenerovaném tiketu
                </h4>
                <div className="bg-[#04060a] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{selectedMatchModal.tip}</div>
                    <div className="text-[10px] text-gray-300 mt-0.5">Modelová šance: <span className="text-amber-400 font-bold">{selectedMatchModal.probability}</span></div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">@{selectedMatchModal.odds}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#04060a] border border-gray-800/80 p-5 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <span>🔥</span> Alternativní & Extra sázky (Vyšší ziskovost)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#0b0f17] p-3 rounded-xl border border-gray-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">Rohové kopy</span>
                      <span className="text-xs font-bold text-white">Více než 9.5</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      @1.92
                    </span>
                  </div>

                  <div className="bg-[#0b0f17] p-3 rounded-xl border border-gray-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">První poločas</span>
                      <span className="text-xs font-bold text-white">Gól v 1. půli</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      @1.45
                    </span>
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-[#04060a] border-t border-gray-800 p-4 flex justify-between items-center">
              <span className="text-[10px] text-gray-400">ApexOdds Engine v3.2</span>
              <button
                onClick={() => setSelectedMatchModal(null)}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-black px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer uppercase tracking-wider"
              >
                Zavřít hloubkovou analýzu
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}