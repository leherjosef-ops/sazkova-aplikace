'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MatchAnalysis, { ValueExplainer } from '@/components/MatchAnalysis';
import StakeDialog from '@/components/StakeDialog';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from '@/components/Toaster';
import { T, tr, trTip } from '@/lib/i18n';
import Icon from '@/components/Icon';


export default function GeneratorPage() {
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState<boolean>(false);

  const [targetOdds, setTargetOdds] = useState<number>(3.5);
  const [matchesCount, setMatchesCount] = useState<number>(3);
  const [generatedTicket, setGeneratedTicket] = useState<any[] | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [askStake, setAskStake] = useState<boolean>(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

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
      toast(tr('Generátor tiketů je dostupný pouze pro členy s VIP předplatným.'));
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGeneratedTicket(null);

    try {
      const res = await authFetch('/api/calculate-poisson');
      const json = await res.json();

      if (!json.success || !json.data || json.data.length === 0) {
        setErrorMsg(tr('V reálném API zrovna nejsou k dispozici žádné zápasy pro vygenerování tiketu.'));
        setIsGenerating(false);
        return;
      }

      const allTips: any[] = [];
      json.data.forEach((match: any) => {
        (match.allTips ?? match.tips).forEach((tip: any) => {
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
        setErrorMsg(tr('Není k dispozici dostatek tipů pro vygenerování požadovaného počtu zápasů.'));
        setIsGenerating(false);
        return;
      }

      const hasRealOdds = json.data.some((m: any) => (m.allTips ?? m.tips)?.some((t: any) => t.oddsSource === 'bookmaker'));

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
          if (usedMatches.has(matchKey) || !(match.allTips ?? match.tips) || (match.allTips ?? match.tips).length === 0) continue;

          // Kurzy sázkovek mají přednost – modelové kurzy se do tiketu nemíchají, pokud jsou k dispozici reálné
          const realTips = (match.allTips ?? match.tips).filter((t: any) => t.oddsSource === 'bookmaker');
          const pool = hasRealOdds ? realTips : (match.allTips ?? match.tips);
          if (pool.length === 0) continue;
          const randomTip = pool[Math.floor(Math.random() * pool.length)];
          
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
        setErrorMsg(tr('Nepodařilo se sestavit tiket odpovídající zadanému kurzu. Zkus upravit parametry.'));
      } else {
        setGeneratedTicket(bestCombination);
      }

    } catch (err) {
      console.error('Chyba při generování AI tiketu:', err);
      setErrorMsg(tr('Nastala chyba při propojování s reálným API.'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Uloží celý akumulátor jako jeden tiket (výhra jen když vyjdou všechny zápasy)
  const saveAccumulator = async (stake: number) => {
    if (!user || !generatedTicket) return;
    const legs = generatedTicket.map((i) => ({
      match_id: String(i.id),
      match_info: i.match,
      tip_name: i.tip,
      odds: i.odds,
      utc: i.utcDate || null,
    }));
    const odds = Math.round(generatedTicket.reduce((a, i) => a * i.odds, 1) * 100) / 100;
    const lastKickoff = generatedTicket.map((i) => i.utcDate).filter(Boolean).sort().pop() || null;

    const { error } = await supabase.from('saved_tickets').insert([
      {
        user_id: user.id,
        kind: 'accumulator',
        sport: 'football',
        match_info: `Akumulátor (${legs.length} zápasy)`,
        tip_name: legs.map((l) => `${l.match_info}: ${l.tip_name}`).join(' | '),
        odds,
        stake,
        legs,
        kickoff: lastKickoff,
      },
    ]);
    setAskStake(false);
    setSavedMsg(error ? tr('Chyba při ukládání: ') + error.message : tr('Akumulátor je uložený v Historii jako jeden tiket.'));
  };

  const totalOdds = generatedTicket 
    ? generatedTicket.reduce((acc, curr) => acc * curr.odds, 1).toFixed(2) 
    : '0.00';

  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">
      
      {/* 🚀 PRÉMIOVÁ HLAVIČKA S ČISTÝM TEXTOVÝM LOGEM */}
      <AppHeader active="/generator" user={user} isVip={isVip} onLogout={handleLogout} />

      {/* Hlavní obsah */}
      <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-all flex items-center gap-1 font-medium">
            <T>{`← Zpět na hlavní stránku`}</T>
          </Link>
        </div>

        {/* Pokud uživatel není VIP, zobrazíme zamykací kartu */}
        {!isVip ? (
          <div className="bg-[#14292a] border border-amber-500/40 rounded-3xl p-12 text-center max-w-xl mx-auto my-16 space-y-6 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
              <Icon name="sparkles" className="w-7 h-7 text-amber-400" />
            </div>
            <div className="space-y-3">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-3 py-1 rounded-full">
                <T>{`Exkluzivní sekce`}</T>
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white"><T>{`Generátor tiketů`}</T></h2>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">
                <T>{`Automatické skládání hodnotných tiketů podle tvého cílového kurzu a zápasů z matematického modelu. Přístupné pouze pro předplatitele VIP.`}</T>
              </p>
            </div>
            <Link 
              href="/" 
              className="inline-block bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs px-8 py-3.5 rounded-xl shadow-lg shadow-amber-950/50 transition-all"
            >
              <T>{`Aktivovat VIP členství za 199 Kč`}</T>
            </Link>
          </div>
        ) : (
          <div className="bg-[#14292a] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
                <Icon name="sparkles" className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white"><T>{`Generátor tiketů`}</T></h1>
                <p className="text-xs text-gray-300 mt-0.5"><T>{`Automatické skládání tiketů podle tvého cílového kurzu`}</T></p>
              </div>
            </div>

            <div className="bg-[#0a1715] border border-gray-800/80 p-6 rounded-2xl space-y-5 shadow-inner">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-200"><T>{`Cílový kurz tiketu:`}</T> <span className="text-amber-400 font-mono">{targetOdds}x</span></label>
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
                <label className="text-xs font-bold text-gray-200"><T>{`Počet zápasů na tiketu:`}</T> <span className="text-amber-400 font-mono">{matchesCount}</span></label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMatchesCount(num)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        matchesCount === num ? 'bg-amber-500 text-black shadow-md font-black' : 'bg-[#14292a] text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
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
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-black py-3 rounded-xl transition-all shadow-lg shadow-amber-950/40 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? tr('Generuji optimální tiket...') : tr('Vygenerovat tiket podle kurzů')}
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-xl text-red-400 text-xs text-center">
                {errorMsg}
              </div>
            )}

            {generatedTicket && (
              <div className="bg-[#0a1715] border border-amber-500/30 p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                  <span className="text-xs font-bold text-amber-400"><T>{`Vygenerovaný tiket`}</T></span>
                  <div className="text-sm font-extrabold text-amber-400 font-mono"><T>{`Celkový kurz:`}</T> {totalOdds}</div>
                </div>

                <div className="space-y-3">
                  {generatedTicket.map((item, idx) => (
                    <div key={idx} className="bg-[#14292a] border border-gray-800/80 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-[11px] text-gray-300 font-medium flex items-center gap-2">
                          <span className="text-amber-400 font-bold">{item.league}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1"><Icon name="clock" className="w-3.5 h-3.5" />{item.date}</span>
                        </div>
                        <div className="text-sm font-bold text-white">{item.match}</div>
                        <div className="text-xs text-amber-300 font-semibold">{tr("Odhad")}: {trTip(item.tip)}</div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-xs text-amber-400 font-bold font-mono">{tr('Kurz')} @{item.odds}</div>
                          <div className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1 inline-block">
                            Šance {item.probability}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedMatchModal(item)}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold py-2 px-3 rounded-xl transition-all flex items-center gap-1.5 shadow-inner cursor-pointer"
                        >
                          <Icon name="chart" className="w-3.5 h-3.5" /> <T>{`Analýza`}</T>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-800/80">
                  <p className="text-[11px] text-gray-400"><T>{`Akumulátor vyhraje jen tehdy, když vyjdou všechny zápasy. Šance na to je výrazně menší než u jednotlivého tipu.`}</T></p>
                  <button onClick={() => (isVip ? setAskStake(true) : toast(tr('Ukládání tiketů je dostupné pro členy VIP.')))} className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-5 py-2.5 rounded-xl cursor-pointer whitespace-nowrap">
                    <Icon name="bookmark" className="w-4 h-4 inline -mt-0.5" /> <T>{`Uložit celý tiket`}</T>
                  </button>
                </div>
                {savedMsg && <p className="text-xs text-emerald-300">{savedMsg}</p>}
              </div>
            )}
          </div>
        )}
      </main>

      {askStake && user && generatedTicket && (
        <StakeDialog supabase={supabase} userId={user.id} title={`${tr('Akumulátor')} (${generatedTicket.length} ${tr('zápasy')})`} odds={Number(totalOdds)} onConfirm={saveAccumulator} onClose={() => setAskStake(false)} />
      )}

      {/* 🚀 ROZŠÍŘENÁ HLOUBKOVÁ AI ANALÝZA (MODÁLNÍ OKNO) */}
      {selectedMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14292a] border border-amber-500/30 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Hlavička modálu */}
            <div className="bg-[#0a1715] border-b border-gray-800 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-xl shadow-inner">
                  <Icon name="chart" className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {selectedMatchModal.league}
                    </span>
                    <span className="text-[10px] text-gray-300 font-mono">
                      <Icon name="clock" className="w-3.5 h-3.5 inline -mt-0.5" /> {selectedMatchModal.date}
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
              
              <MatchAnalysis matchId={selectedMatchModal.id} />

              <ValueExplainer />

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300">
                  <T>{`Zvolený tip na vygenerovaném tiketu`}</T>
                </h4>
                <div className="bg-[#0a1715] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{trTip(selectedMatchModal.tip)}</div>
                    <div className="text-[10px] text-gray-300 mt-0.5"><T>{`Modelová šance:`}</T> <span className="text-amber-400 font-bold">{selectedMatchModal.probability}</span></div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">@{selectedMatchModal.odds}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-[#0a1715] border-t border-gray-800 p-4 flex justify-between items-center">
              <span className="text-[10px] text-gray-400"><T>{`Poissonův model ApexOdds`}</T></span>
              <button
                onClick={() => setSelectedMatchModal(null)}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-black px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <T>{`Zavřít hloubkovou analýzu`}</T>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}