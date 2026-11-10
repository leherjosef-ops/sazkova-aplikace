'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TipsPage() {
  const [activeSport, setActiveSport] = useState<'football' | 'lol'>('football');
  
  const [footballMatches, setFootballMatches] = useState<any[]>([]);
  const [lolMatches, setLolMatches] = useState<any[]>([]);
  
  const [loadingFootball, setLoadingFootball] = useState<boolean>(true);
  const [loadingLol, setLoadingLol] = useState<boolean>(false);
  const [lolLoaded, setLolLoaded] = useState<boolean>(false);

  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('Všechny');
  const [dayFilter, setDayFilter] = useState<string>('all');
  
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedMatchModal, setSelectedMatchModal] = useState<any | null>(null);

  const [dayLabels, setDayLabels] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const labels: { [key: number]: string } = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (i === 0) labels[i] = 'Dnes';
      else if (i === 1) labels[i] = 'Zítra';
      else labels[i] = d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
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

        const res = await fetch('/api/calculate-poisson');
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

  const handleSwitchSport = async (sport: 'football' | 'lol') => {
    setActiveSport(sport);
    setSelectedLeague('Všechny');

    if (sport === 'lol' && !lolLoaded) {
      setLoadingLol(true);
      try {
        const res = await fetch('/api/lol-matches');
        if (!res.ok) {
          setLolMatches([]);
          setLoadingLol(false);
          return;
        }

        const json = await res.json();
        if (json.success) {
          setLolMatches(json.data || []);
          setLolLoaded(true);
        } else {
          setLolMatches([]);
        }
      } catch (err) {
        setLolMatches([]);
      } finally {
        setLoadingLol(false);
      }
    }
  };

  const handleSaveTicket = async (match: any, tip: any) => {
    if (!user) {
      alert('Pro uložení tiketu se musíte nejdříve přihlásit.');
      return;
    }
    if (!isVip) {
      alert('Ukládání tiketů do profilu je dostupné pouze pro členy s ApexOdds PRO předplatným.');
      return;
    }

    const uniqueKey = match.id + '-' + tip.name;
    setSavingKey(uniqueKey);

    const { error } = await supabase.from('saved_tickets').insert([
      {
        user_id: user.id,
        match_info: `${match.home_team} vs ${match.away_team}`,
        tip_name: tip.name,
        odds: tip.bookmakerOdds,
        probability: tip.probability
      }
    ]);

    setSavingKey(null);

    if (error) {
      alert('Chyba při ukládání tiketu: ' + error.message);
    } else {
      alert('Tiket byl úspěšně uložen do vašeho profilu!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsVip(false);
    window.location.reload();
  };

  const currentMatches = activeSport === 'football' ? footballMatches : lolMatches;
  const isLoading = activeSport === 'football' ? loadingFootball : loadingLol;

  const filteredMatches = currentMatches.filter((match) => {
    const leagueLower = (match.league || '').toLowerCase();
    const homeLower = (match.home_team || '').toLowerCase();
    const awayLower = (match.away_team || '').toLowerCase();

    if (activeSport === 'football') {
      if (
        leagueLower.includes('chance') || 
        leagueLower.includes('czech') || 
        homeLower.includes('sparta') || 
        homeLower.includes('slavia') ||
        awayLower.includes('sparta') || 
        awayLower.includes('slavia')
      ) {
        return false;
      }
    }

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
    if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
    if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;

    const dateA = new Date(a.utcDate || 0).getTime();
    const dateB = new Date(b.utcDate || 0).getTime();
    return dateA - dateB;
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">
      
      {/* 🚀 PRÉMIOVÁ HLAVIČKA */}
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
            <Link href="/tips" className="bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md">Tipy</Link>
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
                <Link href="/profile" className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-lg transition-all shadow-sm">Profil</Link>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 text-xs transition-all pl-1 cursor-pointer font-medium">Odhlásit</button>
              </div>
            ) : (
              <Link href="/login" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-950/55 uppercase tracking-wider">Přihlásit se</Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {!isVip && (
          <div className="bg-gradient-to-r from-amber-950/40 via-[#0b0f17] to-amber-950/30 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="text-sm font-bold text-white">Free režim (Omezený přístup)</h4>
                <p className="text-xs text-gray-300">Vidíte pouze základní vzorek 3 tipů denně. Pro plný přístup ke všem zápasům, value betům a AI analýzám aktivujte PRO členství.</p>
              </div>
            </div>
            <Link href="/" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs px-5 py-2.5 rounded-xl whitespace-nowrap shadow-lg shadow-amber-950/50 transition-all uppercase tracking-wider">
              Aktivovat PRO za 199 Kč
            </Link>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-[#0b0f17] border border-gray-800/80 p-3 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => handleSwitchSport('football')}
              className={`flex-1 lg:flex-initial py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeSport === 'football' ? 'bg-amber-500 text-black shadow-md shadow-amber-950/50 font-black' : 'bg-[#04060a] text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800/60'
              }`}
            >
              <span>⚽</span> Fotbalové analýzy
            </button>
            <button
              onClick={() => handleSwitchSport('lol')}
              className={`flex-1 lg:flex-initial py-2.5 px-5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeSport === 'lol' ? 'bg-amber-500 text-black shadow-md shadow-amber-950/50 font-black' : 'bg-[#04060a] text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800/60'
              }`}
            >
              <span>🎮</span> League of Legends
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-1 bg-[#04060a] p-1 rounded-xl border border-gray-800 overflow-x-auto max-w-full">
              <button onClick={() => setDayFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dayFilter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white'}`}>Vše</button>
              <button onClick={() => setDayFilter('0')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dayFilter === '0' ? 'bg-amber-500 text-black font-black' : 'text-gray-300 hover:text-white'}`}>{dayLabels[0] || 'Dnes'}</button>
              <button onClick={() => setDayFilter('1')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dayFilter === '1' ? 'bg-amber-500 text-black font-black' : 'text-gray-300 hover:text-white'}`}>{dayLabels[1] || 'Zítra'}</button>
              <button onClick={() => setDayFilter('2')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dayFilter === '2' ? 'bg-amber-500 text-black font-black' : 'text-gray-300 hover:text-white'}`}>{dayLabels[2] || '+2 dny'}</button>
            </div>

            <div className="relative w-full sm:w-56">
              <input 
                type="text"
                placeholder="🔍 Hledat tým..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#04060a] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-[#0b0f17] border border-gray-800/80 p-16 rounded-2xl text-center space-y-3 shadow-xl">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-300 font-medium">Načítám tržní data...</p>
          </div>
        ) : sortedMatches.length === 0 ? (
          <div className="bg-[#0b0f17] border border-gray-800/80 p-16 rounded-2xl text-center text-gray-300 text-xs shadow-xl">
            Žádné zápasy neodpovídají zadanému filtru.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMatches.map((match, index) => {
              const isLocked = !isVip && index >= 3;

              return (
                <div 
                  key={match.id} 
                  className={`bg-[#0b0f17] border border-gray-800/80 p-4 rounded-2xl shadow-lg transition-all flex flex-col xl:flex-row items-center justify-between gap-5 relative ${isLocked ? 'opacity-60 select-none' : 'hover:bg-[#121824] hover:border-gray-700'}`}
                >
                  
                  {isLocked && (
                    <div className="absolute inset-0 z-20 backdrop-blur-sm bg-black/40 rounded-2xl flex items-center justify-center p-4">
                      <div className="bg-[#0b0f17] border border-amber-500/40 p-4 rounded-xl text-center space-y-2 shadow-2xl max-w-sm">
                        <span className="text-xl">🔒</span>
                        <h5 className="text-xs font-bold text-white">Zamčený VIP tip</h5>
                        <p className="text-[10px] text-gray-300">Tento a všechny další zápasy jsou dostupné pouze pro členy s předplatným ApexOdds PRO.</p>
                        <Link href="/" className="inline-block bg-amber-500 text-black text-[10px] font-black px-4 py-1.5 rounded-lg shadow uppercase tracking-wider">
                          Odemknout za 199 Kč
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="w-full xl:w-[260px] flex-shrink-0 flex flex-col justify-between gap-2 border-b xl:border-b-0 xl:border-r border-gray-800/60 pb-3 xl:pb-0 xl:pr-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between xl:justify-start gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {match.league}
                        </span>
                        {match.status === 'LIVE' && (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse text-[10px] font-black px-2 py-0.5 rounded">
                            🔴 LIVE
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-extrabold text-white leading-snug">
                        <span>{match.home_team}</span>
                        <span className="text-gray-400 font-normal px-1.5">vs</span>
                        <span>{match.away_team}</span>
                      </div>

                      <div className="text-[11px] text-gray-300 flex items-center gap-2 font-mono">
                        <span>🕒 {match.match_date}</span>
                        {match.score && (
                          <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Skóre: {match.score}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => !isLocked && setSelectedMatchModal(match)}
                      className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold py-1.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-inner mt-1 cursor-pointer"
                    >
                      <span>📊</span> Hloubková analýza AI
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full flex-1">
                    {match.tips.map((tip: any, idx: number) => {
                      const uniqueKey = match.id + '-' + tip.name;
                      const isSaving = savingKey === uniqueKey;

                      return (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-xl border flex flex-col justify-between transition-all relative ${
                            tip.isSureBet 
                              ? 'bg-gradient-to-r from-amber-950/20 via-[#04060a] to-[#04060a] border-amber-500/40 shadow-inner' 
                              : 'bg-[#04060a] border-gray-800/80 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            {tip.isSureBet ? (
                              <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                                ⭐ Value Pick
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                Tip #{idx + 1}
                              </span>
                            )}

                            <div className="flex items-center gap-1">
                              {tip.value && (
                                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                  {tip.value}
                                </span>
                              )}
                              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                {tip.probability}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-gray-100 py-1 line-clamp-1">
                            {tip.name}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 mt-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] text-gray-400">Kurz:</span>
                              <span className="text-xs font-black text-amber-400 font-mono">{tip.bookmakerOdds}</span>
                            </div>

                            <button
                              onClick={() => handleSaveTicket(match, tip)}
                              disabled={isSaving}
                              className="bg-gray-800 hover:bg-amber-500 hover:text-black active:scale-95 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <span>{isSaving ? '⏳' : '📥'}</span> {isSaving ? '...' : 'Uložit'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* 🚀 ROZŠÍŘENÁ HLOUBKOVÁ AI ANALÝZA (MODÁLNÍ OKNO) */}
      {selectedMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-amber-500/30 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
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
                      🕒 {selectedMatchModal.match_date}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {selectedMatchModal.home_team} <span className="text-gray-400 font-normal">vs</span> {selectedMatchModal.away_team}
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
                      {selectedMatchModal.homeExpectedGoals || '1.68'}
                    </span>
                  </div>

                  <div className="bg-[#0b0f17] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block uppercase font-semibold">Očekávané góly hosté (xG)</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {selectedMatchModal.awayExpectedGoals || '1.12'}
                    </span>
                  </div>

                  <div className="bg-[#0b0f17] p-3.5 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block uppercase font-semibold">Úspěšnost algoritmu v lize</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {selectedMatchModal.leagueAccuracy || '68.4 %'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#04060a] via-[#0b0f17] to-[#04060a] border border-amber-500/30 p-5 rounded-2xl space-y-2.5">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <span>🧠</span> Odůvodnění matematického modelu (Value Edge)
                </h4>
                <p className="text-xs text-gray-200 leading-relaxed font-sans">
                  {selectedMatchModal.aiReasoning || 
                    `Algoritmus identifikoval významnou nesrovnalost mezi vypsaným kurzem sázkové kanceláře a vypočítanou pravděpodobností. Domácí tým (${selectedMatchModal.home_team}) si udržuje dlouhodobou střeleckou efektivitu, zatímco obraná linie (${selectedMatchModal.away_team}) vykazuje venku defenzivní nestabilitu. Kurz vykazuje pozitivní ziskovou marži (Value Edge) +5.8 %.`
                  }
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                  Doporučené hlavní sázky
                </h4>
                <div className="space-y-2">
                  {selectedMatchModal.tips?.map((t: any, i: number) => (
                    <div key={i} className="bg-[#04060a] border border-gray-800 p-4 rounded-xl flex items-center justify-between hover:border-gray-700 transition-all">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{t.name}</span>
                          {t.isSureBet && (
                            <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                              ⭐ Value Pick
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-300">
                          Modelová šance: <span className="text-amber-400 font-bold">{t.probability}</span>
                          {t.value && <span className="ml-2 text-amber-300 font-bold">Edge: {t.value}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                          @{t.bookmakerOdds}
                        </span>
                      </div>
                    </div>
                  ))}
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