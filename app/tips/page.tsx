'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import MatchAnalysis, { ValueExplainer } from '@/components/MatchAnalysis';
import StakeDialog from '@/components/StakeDialog';
import { supabase } from '@/lib/supabase';
import Icon from '@/components/Icon';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from '@/components/Toaster';
import { T, tr, trTip, loc } from '@/lib/i18n';


// Typ sázky podle názvu tipu (názvy jsou uložené česky)
const marketOf = (name: string) => (name.includes('gólů') ? 'Počet gólů' : name.includes('Oba týmy') ? 'Oba týmy skórují' : 'Výsledek zápasu');

export default function TipsPage() {
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
  const [sortBy, setSortBy] = useState<'time' | 'value' | 'chance'>('time');
  const [onlyBook, setOnlyBook] = useState<boolean>(false);
  const [onlyPositive, setOnlyPositive] = useState<boolean>(false);
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

  // Krok 1: ověření přihlášení a PRO, pak se otevře dialog s částkou
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

  // Krok 2: uložení s vsazenou částkou
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

    const hasBook = (match.tips || []).some((t: any) => t.oddsSource === 'bookmaker');
    const hasPositive = (match.tips || []).some((t: any) => typeof t.value === 'string' && t.value.startsWith('+'));
    if (onlyBook && !hasBook) return false;
    if (onlyPositive && !hasPositive) return false;

    return matchesLeague && matchesSearch && matchesDay;
  });

  const bestValue = (m: any) => Math.max(-99, ...(m.tips || []).map((t: any) => (typeof t.value === 'string' ? parseFloat(t.value) : -99)));
  const bestChance = (m: any) => Math.max(0, ...(m.tips || []).map((t: any) => parseFloat(t.probability) || 0));
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    // bez VIP nejdřív odemčené zápasy zdarma, zamčené až za nimi
    if (!isVip && Boolean(a.locked) !== Boolean(b.locked)) return a.locked ? 1 : -1;
    if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
    if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
    if (sortBy === 'value') return bestValue(b) - bestValue(a);
    if (sortBy === 'chance') return bestChance(b) - bestChance(a);
    return new Date(a.utcDate || 0).getTime() - new Date(b.utcDate || 0).getTime();
  });

  // Tipy s nejvyšším kladným value (jen z reálných kurzů a bez varování model ≠ trh)
  const topValue = filteredMatches
    .flatMap((m: any) => (m.allTips || m.tips || []).map((t: any) => ({ m, t })))
    .filter(({ t }: any) => t.oddsSource === 'bookmaker' && !t.gapWarning && !t.valueSuspicious && typeof t.value === 'string' && parseFloat(t.value) >= 2)
    .sort((a: any, b: any) => parseFloat(b.t.value) - parseFloat(a.t.value))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">
      
      {/* 🚀 PRÉMIOVÁ HLAVIČKA */}
      <AppHeader active="/tips" user={user} isVip={isVip} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        
        {!isVip && (
          <div className="bg-gradient-to-r from-amber-950/40 via-[#14292a] to-amber-950/30 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <Icon name="lock" className="w-6 h-6 text-amber-400" />
              <div>
                <h4 className="text-sm font-bold text-white"><T>{`Free režim (Omezený přístup)`}</T></h4>
                <p className="text-xs text-gray-300"><T>{`Vidíte pouze základní vzorek 3 předpovědí denně. Pro plný přístup ke všem zápasům, value analýzám a rozborům zápasů aktivujte VIP členství.`}</T></p>
              </div>
            </div>
            <Link href="/" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs px-5 py-2.5 rounded-xl whitespace-nowrap shadow-lg shadow-amber-950/50 transition-all">
              <T>{`Aktivovat VIP za 199 Kč`}</T>
            </Link>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-[#14292a] border border-gray-800/80 p-3 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-gray-200 px-2"><Icon name="ball" className="w-4 h-4 inline -mt-0.5 mr-1 text-amber-400" /><T>{`Fotbalové analýzy`}</T></span>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <div className="flex items-center gap-1 bg-[#0a1715] p-1 rounded-xl border border-gray-800 overflow-x-auto max-w-full">
              <button onClick={() => setDayFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dayFilter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white'}`}><T>{`Vše`}</T></button>
              <button onClick={() => setDayFilter('0')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dayFilter === '0' ? 'bg-amber-500 text-black font-black' : 'text-gray-300 hover:text-white'}`}>{dayLabels[0] || tr('Dnes')}</button>
              <button onClick={() => setDayFilter('1')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dayFilter === '1' ? 'bg-amber-500 text-black font-black' : 'text-gray-300 hover:text-white'}`}>{dayLabels[1] || tr('Zítra')}</button>
              <button onClick={() => setDayFilter('2')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${dayFilter === '2' ? 'bg-amber-500 text-black font-black' : 'text-gray-300 hover:text-white'}`}>{dayLabels[2] || '+2 dny'}</button>
            </div>

            <div className="relative w-full sm:w-56">
              <input 
                type="text"
                placeholder={tr("Hledat tým...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a1715] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-400 font-semibold"><T>{`Řadit:`}</T></span>
          {([['time', tr('Podle času')], ['value', tr('Podle value')], ['chance', tr('Podle šance')]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k)} className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${sortBy === k ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#0a1715] text-gray-300 border-gray-800 hover:border-gray-600'}`}>{l}</button>
          ))}
          <span className="w-px h-5 bg-gray-700 mx-1" />
          <button onClick={() => setOnlyBook(!onlyBook)} className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${onlyBook ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#0a1715] text-gray-300 border-gray-800 hover:border-gray-600'}`}><T>{`Jen s kurzem sázkovky`}</T></button>
          <button onClick={() => setOnlyPositive(!onlyPositive)} className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${onlyPositive ? 'bg-amber-500 text-black border-amber-500' : 'bg-[#0a1715] text-gray-300 border-gray-800 hover:border-gray-600'}`}><T>{`Jen kladné value`}</T></button>
        </div>

        {topValue.length > 0 && (
          <div className="bg-[#14292a] border border-emerald-500/30 rounded-2xl p-4 space-y-2">
            <div className="text-xs font-bold text-emerald-300"><T>{`Nejvyšší value právě teď`}</T></div>
            <div className="grid md:grid-cols-3 gap-2">
              {topValue.map(({ m, t }: any, i: number) => (
                <button key={i} onClick={() => setSelectedMatchModal(m)} className="text-left bg-[#0a1715] border border-gray-800 hover:border-emerald-500/50 rounded-xl p-3 cursor-pointer">
                  <div className="text-[11px] text-gray-400 truncate">{m.home_team} vs {m.away_team}</div>
                  <div className="text-xs font-semibold text-white truncate">{trTip(t.name)}</div>
                  <div className="text-[11px] mt-0.5"><span className="text-emerald-300 font-bold">{tr('Value')} {t.value}</span> <span className="text-gray-400">· @{t.bookmakerOdds} ({t.bookmaker})</span></div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500"><T>{`Jen zápasy s reálným kurzem sázkovky, kde se model s trhem výrazně nerozchází. Value je odhad, ne záruka.`}</T></p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label={tr("Načítám tržní data")}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-[#14292a] border border-gray-800/80 rounded-2xl p-5 flex flex-col xl:flex-row gap-4 animate-pulse">
                <div className="xl:w-[260px] space-y-2">
                  <div className="h-4 w-24 bg-[#0a1715] rounded" />
                  <div className="h-5 w-48 bg-[#0a1715] rounded" />
                  <div className="h-3 w-32 bg-[#0a1715] rounded" />
                </div>
                <div className="grid md:grid-cols-3 gap-3 flex-1">
                  {[0, 1, 2].map((j) => <div key={j} className="h-24 bg-[#0a1715] rounded-xl" />)}
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center pt-1"><T>{`Načítám tržní data… při prvním načtení to může trvat několik sekund.`}</T></p>
          </div>

        ) : sortedMatches.length === 0 ? (
          <div className="bg-[#14292a] border border-gray-800/80 p-16 rounded-2xl text-center text-gray-300 text-xs shadow-xl">
            <p><T>{`Žádné zápasy neodpovídají zadanému filtru.`}</T></p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedLeague('Všechny'); setDayFilter('all'); setOnlyBook(false); setOnlyPositive(false); }}
              className="mt-4 bg-gray-800 hover:bg-amber-500 hover:text-black text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              <T>{`Zrušit všechny filtry`}</T>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMatches.map((match, index) => {
              const isLocked = !isVip && Boolean(match.locked);

              return (
                <div 
                  key={match.id} 
                  className={`bg-[#14292a] border border-gray-800/80 p-4 rounded-2xl shadow-lg transition-all flex flex-col xl:flex-row items-center justify-between gap-5 relative ${isLocked ? 'opacity-60 select-none' : 'hover:bg-[#193230] hover:border-gray-700'}`}
                >
                  
                  {isLocked && (
                    <div className="absolute inset-0 z-20 backdrop-blur-sm bg-black/40 rounded-2xl flex items-center justify-center p-4">
                      <div className="bg-[#14292a] border border-amber-500/40 p-4 rounded-xl text-center space-y-2 shadow-2xl max-w-sm">
                        <Icon name="lock" className="w-5 h-5 text-amber-400" />
                        <h5 className="text-xs font-bold text-white"><T>{`Zamčená předpověď`}</T></h5>
                        <p className="text-[10px] text-gray-300"><T>{`Tento a všechny další zápasy jsou dostupné pouze pro členy s předplatným VIP.`}</T></p>
                        <Link href="/" className="inline-block bg-amber-500 text-black text-[10px] font-black px-4 py-1.5 rounded-lg shadow">
                          <T>{`Odemknout za 199 Kč`}</T>
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="w-full xl:w-[260px] flex-shrink-0 flex flex-col justify-between gap-2 border-b xl:border-b-0 xl:border-r border-gray-800/60 pb-3 xl:pb-0 xl:pr-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between xl:justify-start gap-2">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {match.league}
                        </span>
                        {match.status === 'LIVE' && (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black px-2 py-0.5 rounded">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1 align-middle" />LIVE
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-extrabold text-white leading-snug">
                        <span>{match.home_team}</span>
                        <span className="text-gray-400 font-normal px-1.5"><T>{`vs`}</T></span>
                        <span>{match.away_team}</span>
                      </div>

                      <div className="text-[11px] text-gray-300 flex items-center gap-2 font-mono">
                        <span className="inline-flex items-center gap-1"><Icon name="clock" className="w-3.5 h-3.5" />{match.match_date}</span>
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
                      <Icon name="chart" className="w-3.5 h-3.5" /> <T>{`Rozbor zápasu`}</T>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full flex-1">
                    {match.tips.map((tip: any, idx: number) => {
                      const uniqueKey = match.id + '-' + tip.name;
                      const isSaving = savingKey === uniqueKey;

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
                            tip.isSureBet ? 'bg-[#0a1715] border-amber-500/40 shadow-inner' : 'bg-[#0a1715] border-gray-800/80 hover:border-gray-700'
                          }`}
                        >
                          {/* Typ sázky + odznak vysoké šance */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{tr(marketOf(tip.name))}</span>
                            {tip.isSureBet && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                <Icon name="star" className="w-3 h-3" /> <T>{`Vysoká šance`}</T>
                              </span>
                            )}
                          </div>

                          <div className="text-sm font-bold text-white leading-snug line-clamp-2">{trTip(tip.name)}</div>

                          {/* Šance podle modelu jako pruh */}
                          <div title={tr('Jak pravděpodobné je to podle našeho modelu. Není to záruka.')}>
                            <div className="flex items-baseline justify-between text-[11px]">
                              <span className="text-gray-400"><T>{`Šance podle modelu`}</T></span>
                              <span className="font-black text-white font-mono text-sm">{tip.probability}</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: tip.probability }} />
                            </div>
                          </div>

                          {/* Kurzy a value */}
                          {tip.oddsSource === 'bookmaker' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-400"><T>{`Nejlepší kurz`}</T> <span className="text-gray-500">· {tip.bookmaker}</span></span>
                                <span className="font-black text-amber-400 font-mono text-sm">{tip.bookmakerOdds}</span>
                              </div>
                              {tip.value && (
                                <div
                                  title={tip.valueSuspicious ? tr('Neobvykle vysoké value nebo odlehlý kurz jedné sázkovky. Nejspíš chyba v kurzu, před sázkou ho ověř.') : tr('Value: průměrný zisk (+) nebo ztráta (−) na 100 Kč vsazených. Rozbor najdeš po kliknutí na zápas.')}
                                  className={`flex items-center justify-between text-[11px] rounded-lg px-2 py-1 border ${
                                    tip.valueSuspicious ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                    : tip.value.startsWith('+') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-gray-800/40 border-gray-800 text-gray-400'}`}
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <Icon name={tip.valueSuspicious ? 'alert' : 'trend'} className="w-3.5 h-3.5" />
                                    {tip.valueSuspicious ? tr('Podezřelý kurz, ověř ho') : tip.value.startsWith('+') ? tr('Kurz je výhodnější než odhad') : tr('Kurz je horší než odhad')}
                                  </span>
                                  <b className="font-mono">{tip.value}</b>
                                </div>
                              )}
                              {tip.gapWarning && (
                                <div title={`${tr('Trh')} ${tip.marketProbability}, ${tr('model')} ${tip.probability}`} className="flex items-center gap-1 text-[10px] text-red-300">
                                  <Icon name="alert" className="w-3 h-3" /> <T>{`Model a sázkovky se výrazně liší`}</T>
                                </div>
                              )}
                              {tip.oddsList && tip.oddsList.length > 1 && (
                                <div className="text-[10px] text-gray-500 leading-snug" title={tr('Nabídka kurzů u jednotlivých sázkovek')}>
                                  {tip.oddsList.map((o: any) => `${o.book} ${o.price}`).join(' · ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]" title={tr('Kurz, při kterém by sázka podle modelu dlouhodobě nevydělávala ani neprodělávala. Pokud sázkovka nabízí víc, je to pro tebe výhodné.')}>
                                <span className="text-gray-400 inline-flex items-center gap-1"><T>{`Férový kurz`}</T> <Icon name="info" className="w-3 h-3 text-gray-500" /></span>
                                <span className="font-black text-gray-200 font-mono text-sm">{tip.bookmakerOdds}</span>
                              </div>
                              <div className="text-[10px] text-gray-500"><T>{`Kurz sázkovek pro tento typ sázky nemáme.`}</T></div>
                            </div>
                          )}

                          <button
                            onClick={() => handleSaveTicket(match, tip)}
                            disabled={isSaving}
                            className="mt-auto w-full inline-flex items-center justify-center gap-1.5 bg-gray-800/80 hover:bg-amber-500 hover:text-black active:scale-[0.98] text-gray-100 text-[11px] font-bold py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Icon name={isSaving ? 'spinner' : 'bookmark'} className="w-3.5 h-3.5" /> {isSaving ? tr('Ukládám…') : tr('Uložit na tiket')}
                          </button>
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
                    {selectedMatchModal.home_team} <span className="text-gray-400 font-normal"><T>{`vs`}</T></span> {selectedMatchModal.away_team}
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
                  <T>{`Doporučené hlavní sázky`}</T>
                </h4>
                <div className="space-y-2">
                  {selectedMatchModal.tips?.map((t: any, i: number) => (
                    <div key={i} className="bg-[#0a1715] border border-gray-800 p-4 rounded-xl flex items-center justify-between hover:border-gray-700 transition-all">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{trTip(t.name)}</span>
                          {t.isSureBet && (
                            <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded">
                              <Icon name="star" className="w-3 h-3 inline -mt-0.5" /> <T>{`Vysoká šance`}</T>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-300">
                          <T>{`Modelová šance:`}</T> <span className="text-amber-400 font-bold">{t.probability}</span>
                          {t.value && <span className={`ml-2 font-bold ${t.value.startsWith('+') ? 'text-emerald-300' : 'text-red-400'}`}>{tr('Value')}: {t.value}</span>}
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