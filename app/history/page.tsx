'use client';

import { ticketProfit } from '@/lib/settle';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/Toaster';
import { T, tr, trTip, loc } from '@/lib/i18n';
import Icon from '@/components/Icon';


export default function HistoryPage() {
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState<boolean>(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSettling, setIsSettling] = useState<boolean>(false);

  useEffect(() => {
    async function initHistory() {
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

        fetchTickets(user.id);
      } else {
        setLoading(false);
      }
    }
    initHistory();
  }, []);

  async function fetchTickets(userId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTickets(data);
    }
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsVip(false);
    window.location.reload();
  };

  const handleAutoSettle = async () => {
    if (!user || tickets.length === 0) return;
    setIsSettling(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Vyhodnocení probíhá na serveru podle skutečných výsledků zápasů
      const res = await fetch('/api/settle-tickets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();

      if (!json.success) {
        toast(tr('Vyhodnocení se nezdařilo: ') + (json.error || tr('neznámá chyba')));
      } else if (json.settled === 0) {
        toast(tr('Zatím nejsou k dispozici výsledky žádného z čekajících zápasů.'));
      }

      await fetchTickets(user.id);
    } catch (err) {
      console.error('Chyba při automatickém vyhodnocování:', err);
    } finally {
      setIsSettling(false);
    }
  };

  const totalTickets = tickets.length;
  const wonTickets = tickets.filter(t => t.status === 'WON').length;
  const lostTickets = tickets.filter(t => t.status === 'LOST').length;
  const winRate = totalTickets > 0 ? ((wonTickets / (wonTickets + lostTickets || 1)) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">
      
      {/* 🚀 PRÉMIOVÁ HLAVIČKA S ČISTÝM TEXTOVÝM LOGEM */}
      <AppHeader active="/history" user={user} isVip={isVip} onLogout={handleLogout} />

      {/* Hlavní obsah */}
      <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-all flex items-center gap-1 font-medium">
            <T>{`← Zpět na hlavní stránku`}</T>
          </Link>
        </div>

        <div className="bg-[#14292a] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
                <Icon name="history" className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white"><T>{`Historie a uložené tikety`}</T></h1>
                <p className="text-xs text-gray-300 mt-0.5"><T>{`Přehled vašich sázek a automatické vyhodnocování`}</T></p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && tickets.length > 0 && (
                <button
                  onClick={handleAutoSettle}
                  disabled={isSettling}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-950/40 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSettling ? tr('Vyhodnocuji...') : tr('Vyhodnotit tikety')}
                </button>
              )}

              {!loading && user && tickets.length > 0 && (
                <div className="flex items-center gap-3 bg-[#0a1715] border border-amber-500/30 px-4 py-2 rounded-xl shadow-inner text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold"><T>{`CELKEM`}</T></span>
                    <span className="font-bold text-white font-mono">{totalTickets}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-800"></div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold"><T>{`ÚSPĚŠNOST`}</T></span>
                    <span className="font-bold text-amber-400 font-mono">{winRate}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-xs"><T>{`Načítám data z databáze...`}</T></div>
          ) : !user ? (
            <div className="bg-[#0a1715] border border-gray-800/80 p-8 rounded-2xl text-center space-y-3">
              <p className="text-xs text-gray-300"><T>{`Pro zobrazení historie se musíte přihlásit.`}</T></p>
              <Link href="/login" className="inline-block bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-md">
                <T>{`Přihlásit se`}</T>
              </Link>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-[#0a1715] border border-gray-800/80 p-12 rounded-2xl text-center text-gray-300 text-xs">
              <T>{`V tabulce zatím nejsou žádné uložené tikety.`}</T>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const status = ticket.status || 'PENDING';
                
                let statusBadge = <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded"><Icon name="clock" className="w-3 h-3 inline -mt-0.5" /> <T>{`Čeká se`}</T></span>;
                if (status === 'WON') {
                  statusBadge = <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded"><T>{`✔ Výhra`}</T></span>;
                } else if (status === 'VOID') {
                  statusBadge = <span className="bg-gray-500/20 text-gray-300 border border-gray-500/40 text-[10px] font-black px-2 py-0.5 rounded"><T>{`↩ Neplatný`}</T></span>;
                } else if (status === 'LOST') {
                  statusBadge = <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black px-2 py-0.5 rounded"><T>{`✖ Prohra`}</T></span>;
                }

                return (
                  <div key={ticket.id} className="bg-[#0a1715] border border-gray-800/80 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-gray-700 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono">{ticket.created_at ? new Date(ticket.created_at).toLocaleString(loc()) : ''}</span>
                        {statusBadge}
                      </div>
                      <div className="text-sm font-bold text-white">{ticket.match_info || ticket.match || tr('Neznámý zápas')}</div>
                      {ticket.kind === 'accumulator' && Array.isArray(ticket.legs) ? (
                        <ul className="text-xs text-amber-300 font-semibold space-y-0.5">
                          {ticket.legs.map((l: any, i: number) => (
                            <li key={i}>{l.match_info}: <span className="text-gray-200">{trTip(l.tip_name)}</span> <span className="font-mono text-amber-400">@{l.odds}</span></li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-amber-300 font-semibold">{tr("Odhad")}: {trTip(ticket.tip_name || ticket.tip)}</div>
                      )}
                      {ticket.result_score && <div className="text-[10px] text-gray-400 font-mono">Výsledek {ticket.result_score}</div>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-amber-400 font-bold font-mono">Kurz @{Number(ticket.settled_odds || ticket.odds).toFixed(2)}</div>
                      {Number(ticket.stake) > 0 && <div className="text-[10px] text-gray-300 mt-0.5 font-mono">{tr('Vsazeno')} {Math.round(Number(ticket.stake))} {tr('Kč')}</div>}
                      {(() => { const pr = ticketProfit(ticket, 0); return pr === null || !Number(ticket.stake) ? null : <div className={`text-[11px] font-black font-mono ${pr > 0 ? 'text-emerald-300' : pr < 0 ? 'text-red-400' : 'text-gray-300'}`}>{pr > 0 ? '+' : ''}{Math.round(pr)} {tr('Kč')}</div>; })()}
                      {ticket.probability && <div className="text-[10px] text-gray-400 mt-0.5">Šance {ticket.probability}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}