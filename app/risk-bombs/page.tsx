'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import MatchAnalysis, { ValueExplainer } from '@/components/MatchAnalysis';
import StakeDialog from '@/components/StakeDialog';
import { toast } from '@/components/Toaster';
import { T, tr, trTip, loc } from '@/lib/i18n';
import Icon from '@/components/Icon';


export default function RiskBombsPage() {
  const activeSport = 'football' as const;
  
  const [footballMatches, setFootballMatches] = useState<any[]>([]);
  
  const [loadingFootball, setLoadingFootball] = useState<boolean>(true);

  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('Všechny');
  const [dayFilter, setDayFilter] = useState<string>('all');
  
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<{ match: any; tip: any } | null>(null);
  const [selectedMatchModal, setSelectedMatchModal] = useState<any | null>(null);

  const [dayLabels, setDayLabels] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const labels: { [key: number]: string } = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (i === 0) labels[i] = tr('Dnes');
      else if (i === 1) labels[i] = tr('Zítra');
      else labels[i] = d.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'numeric' });
    }
    setDayLabels(labels);

    async function initData() {
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

        const res = await authFetch('/api/calculate-poisson');
        if (!res.ok) {
          setFootballMatches([]);
          setLoadingFootball(false);
          return;
        }

        const json = await res.json();
        if (json.success) {
          setFootballMatches(json.data || []);
        } else {
          setFootballMatches([]);
        }
      } catch (err) {
        setFootballMatches([]);
      } finally {
        setLoadingFootball(false);
      }
    }

    initData();
  }, []);

  const handleSaveTicket = (match: any, tip: any) => {
    if (!user) {
      toast(tr('Pro uložení tiketu se musíte nejdříve přihlásit.'));
      return;
    }
    if (!isVip) {
      toast(tr('Ukládání tiketů do profilu je dostupné pouze pro členy s VIP předplatným.'));
      return;
    }
    setPendingSave({ match, tip });
  };

  const confirmSave = async (stake: number) => {
    if (!pendingSave || !user) return;
    const { match, tip } = pendingSave;
    setSavingKey(match.id + '-' + tip.name);

    const { error } = await supabase.from('saved_tickets').insert([
      {
        user_id: user.id,
        match_id: String(match.id),
        sport: activeSport,
        kind: 'single',
        match_info: `${match.home_team} vs ${match.away_team}`,
        tip_name: tip.name,
        odds: tip.bookmakerOdds,
        probability: tip.probability,
        stake,
        kickoff: match.utcDate || null,
      },
    ]);

    setSavingKey(null);
    setPendingSave(null);
    if (error) toast(tr('Chyba při ukládání tiketu: ') + error.message);
    else toast(tr('Tiket byl uložen do tvého profilu.'));
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsVip(false);
    window.location.reload();
  };

  const currentMatches = footballMatches;
  const isLoading = loadingFootball;

  const filteredMatches = currentMatches.filter((match) => {
    const hasBombTip = (match.allTips ?? match.tips)?.some((t: any) => parseFloat(t.bookmakerOdds) >= 1.90);
    if (!hasBombTip) return false;

    const leagueLower = (match.league || '').toLowerCase();
    const homeLower = (match.home_team || '').toLowerCase();
    const awayLower = (match.away_team || '').toLowerCase();

    const matchesLeague = selectedLeague === 'Všechny' || leagueLower.includes(selectedLeague.toLowerCase());
    const matchesSearch = homeLower.includes(searchQuery.toLowerCase()) || awayLower.includes(searchQuery.toLowerCase());
    
    let matchesDay = true;
    if (match.utcDate && dayFilter !== 'all') {
      const matchDate = new Date(match.utcDate);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + parseInt(dayFilter));
      
      matchesDay = matchDate.toDateString() === targetDate.toDateString();
    }

    return matchesLeague && matchesSearch && matchesDay;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    const dateA = new Date(a.utcDate || 0).getTime();
    const dateB = new Date(b.utcDate || 0).getTime();
    return dateA - dateB;
  });

  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">
      
      {/* 🚀 PRÉMIOVÁ HLAVIČKA S ČISTÝM TEXTOVÝM LOGEM */}
      <AppHeader active="/risk-bombs" user={user} isVip={isVip} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {!isVip ? (
          <div className="bg-[#14292a] border border-amber-500/40 rounded-3xl p-12 text-center max-w-xl mx-auto my-16 space-y-6 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
              <Icon name="flame" className="w-7 h-7 text-amber-400" />
            </div>
            <div className="space-y-3">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-3 py-1 rounded-full">
                <T>{`Exkluzivní sekce`}</T>
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white">1.9 +</h2>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-medium">
                <T>{`Tato sekce obsahuje matematicky vyfiltrované zápasy s kurzy 1.90 a více a atraktivní value ziskovostí. Je plně přístupná pouze pro členy s předplatným VIP.`}</T>
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
          <div className="space-y-6">
            
            <div className="bg-[#14292a] border border-gray-800/80 p-6 rounded-3xl space-y-2 shadow-xl">
              <span className="text-amber-400 text-xs font-bold"><T>{`Vysoká ziskovost`}</T></span>
              <h1 className="text-2xl font-black text-white"><T>{`1.9 + & Value tikety`}</T></h1>
              <p className="text-xs text-gray-300"><T>{`Kurzy od 1.90 výše. Vyšší kurz znamená menší šanci, že tip vyjde.`}</T></p>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-[#14292a] border border-gray-800/80 p-3 rounded-2xl shadow-lg">
              <span className="text-xs font-bold text-gray-200 px-2"><Icon name="ball" className="w-4 h-4 inline -mt-0.5 mr-1 text-amber-400" /><T>{`Fotbalové 1.9+`}</T></span>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                <div className="flex items-center gap-1 bg-[#0a1715] p-1 rounded-xl border border-gray-800 overflow-x-auto max-w-full">
                  <button onClick={() => setDayFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${dayFilter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white'}`}><T>{`Vše`}</T></button>
                  <button onClick={() => setDayFilter('0')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${dayFilter === '0' ? 'bg-amber-500 text-black font-black' : 'text-gray-300 hover:text-white'}`}>{dayLabels[0] || tr('Dnes')}</button>
                  <button onClick={() => setDayFilter('1')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${dayFilter === '1' ? 'bg-amber-500 text-black font-black' : 'text-gray-300 hover:text-white'}`}>{dayLabels[1] || tr('Zítra')}</button>
                </div>

                <div className="relative w-full sm:w-56">
                  <input 
                    type="text"
                    placeholder={tr("Hledat v 1.9+...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0a1715] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3" aria-busy="true" aria-label={tr("Filtruji 1.9+ zápasy")}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-[#14292a] border border-gray-800/80 rounded-2xl p-5 flex flex-col xl:flex-row gap-4 animate-pulse">
                    <div className="xl:w-[260px] space-y-2">
                      <div className="h-4 w-24 bg-[#0a1715] rounded" />
                      <div className="h-5 w-48 bg-[#0a1715] rounded" />
                    </div>
                    <div className="grid md:grid-cols-3 gap-3 flex-1">
                      {[0, 1, 2].map((j) => <div key={j} className="h-24 bg-[#0a1715] rounded-xl" />)}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 text-center pt-1"><T>{`Filtruji 1.9+ zápasy…`}</T></p>
              </div>
            ) : sortedMatches.length === 0 ? (
              <div className="bg-[#14292a] border border-gray-800/80 p-16 rounded-2xl text-center text-gray-300 text-xs shadow-xl">
                <T>{`Žádné zápasy s kurzem 1.90+ neodpovídají zadanému filtru.`}</T>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMatches.map((match) => (
                  <div 
                    key={match.id} 
                    className="bg-[#14292a] hover:bg-[#193230] border border-gray-800/80 hover:border-gray-700 p-4 rounded-2xl shadow-lg transition-all flex flex-col xl:flex-row items-center justify-between gap-5"
                  >
                    <div className="w-full xl:w-[260px] flex-shrink-0 flex flex-col justify-between gap-2 border-b xl:border-b-0 xl:border-r border-gray-800/60 pb-3 xl:pb-0 xl:pr-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {match.league}
                        </span>
                        <div className="text-sm font-extrabold text-white leading-snug pt-1">
                          <span>{match.home_team}</span>
                          <span className="text-gray-400 font-normal px-1.5"><T>{`vs`}</T></span>
                          <span>{match.away_team}</span>
                        </div>
                        <div className="text-[11px] text-gray-300 font-mono">
                          <span className="inline-flex items-center gap-1"><Icon name="clock" className="w-3.5 h-3.5" />{match.match_date}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedMatchModal(match)}
                        className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-inner mt-1 cursor-pointer"
                      >
                        <Icon name="chart" className="w-3.5 h-3.5" /> <T>{`Rozbor zápasu`}</T>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full flex-1">
                      {(match.allTips ?? match.tips)
                        .filter((t: any) => parseFloat(t.bookmakerOdds) >= 1.90)
                        .map((tip: any, idx: number) => {
                          const uniqueKey = match.id + '-' + tip.name;
                          const isSaving = savingKey === uniqueKey;

                          return (
                            <div 
                              key={idx} 
                              className="bg-gradient-to-r from-amber-950/20 via-[#0a1715] to-[#0a1715] border border-amber-500/40 p-3 rounded-xl flex flex-col justify-between shadow-inner"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">
                                  <Icon name="flame" className="w-3 h-3 inline -mt-0.5" /> <T>{`Kurz 1.9+`}</T>
                                </span>
                                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  {tip.probability}
                                </span>
                              </div>

                              <div className="text-xs font-semibold text-gray-100 py-1 line-clamp-1">
                                {trTip(tip.name)}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 mt-1">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[10px] text-gray-400"><T>{`Kurz:`}</T></span>
                                  <span className="text-xs font-black text-amber-400 font-mono">{tip.bookmakerOdds}</span>
                                </div>

                                <button
                                  onClick={() => handleSaveTicket(match, tip)}
                                  disabled={isSaving}
                                  className="bg-gray-800 hover:bg-amber-500 hover:text-black active:scale-95 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm cursor-pointer"
                                >
                                  <Icon name={isSaving ? 'spinner' : 'bookmark'} className="w-3.5 h-3.5" /> {isSaving ? '...' : tr('Uložit')}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </main>

      {/* 🚀 ROZŠÍŘENÁ HLOUBKOVÁ AI ANALÝZA (MODÁLNÍ OKNO) */}
      {pendingSave && user && (
        <StakeDialog
          supabase={supabase}
          userId={user.id}
          title={`${pendingSave.match.home_team} vs ${pendingSave.match.away_team} – ${trTip(pendingSave.tip.name)}`}
          odds={Number(pendingSave.tip.bookmakerOdds)}
          onConfirm={confirmSave}
          onClose={() => setPendingSave(null)}
        />
      )}

      {selectedMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14292a] border border-amber-500/30 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
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
                      <Icon name="clock" className="w-3.5 h-3.5 inline -mt-0.5" /> {selectedMatchModal.match_date}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {selectedMatchModal.home_team} vs {selectedMatchModal.away_team}
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

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <MatchAnalysis matchId={selectedMatchModal.id} />

              <ValueExplainer />

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300">
                  <T>{`Dostupné zápasy s kurzem 1.90+`}</T>
                </h4>
                <div className="space-y-2">
                  {(selectedMatchModal.allTips ?? selectedMatchModal.tips)
                    ?.filter((t: any) => parseFloat(t.bookmakerOdds) >= 1.90)
                    .map((t: any, i: number) => (
                      <div key={i} className="bg-[#0a1715] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">{trTip(t.name)}</div>
                          <div className="text-[10px] text-gray-300 mt-0.5"><T>{`Modelová šance:`}</T> <span className="text-amber-400 font-bold">{t.probability}</span></div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">@{t.bookmakerOdds}</span>
                        </div>
                      </div>
                    ))}
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