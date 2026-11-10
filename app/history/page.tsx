'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      for (const ticket of tickets) {
        if (!ticket.status || ticket.status === 'PENDING') {
          const probabilityNum = parseInt(ticket.probability) || 40;
          const newStatus = probabilityNum >= 40 ? 'WON' : 'LOST';

          await supabase
            .from('saved_tickets')
            .update({ status: newStatus })
            .eq('id', ticket.id);
        }
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
            <Link href="/history" className="bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md">Historie</Link>
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

        <div className="bg-[#0b0f17] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
                📊
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Historie a uložené tikety</h1>
                <p className="text-xs text-gray-300 mt-0.5">Přehled vašich sázek a automatické vyhodnocování</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && tickets.length > 0 && (
                <button
                  onClick={handleAutoSettle}
                  disabled={isSettling}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-950/40 disabled:opacity-50 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  {isSettling ? 'Vyhodnocuji...' : '⚡ Vyhodnotit tikety'}
                </button>
              )}

              {!loading && user && tickets.length > 0 && (
                <div className="flex items-center gap-3 bg-[#04060a] border border-amber-500/30 px-4 py-2 rounded-xl shadow-inner text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold">CELKEM</span>
                    <span className="font-bold text-white font-mono">{totalTickets}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-800"></div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-bold">ÚSPĚŠNOST</span>
                    <span className="font-bold text-amber-400 font-mono">{winRate}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-xs">Načítám data z databáze...</div>
          ) : !user ? (
            <div className="bg-[#04060a] border border-gray-800/80 p-8 rounded-2xl text-center space-y-3">
              <p className="text-xs text-gray-300">Pro zobrazení historie se musíte přihlásit.</p>
              <Link href="/login" className="inline-block bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-5 py-2.5 rounded-xl text-xs transition-all uppercase tracking-wider shadow-md">
                Přihlásit se
              </Link>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-[#04060a] border border-gray-800/80 p-12 rounded-2xl text-center text-gray-300 text-xs">
              V tabulce zatím nejsou žádné uložené tikety.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const status = ticket.status || 'PENDING';
                
                let statusBadge = <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded">⏳ Čeká se</span>;
                if (status === 'WON') {
                  statusBadge = <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded">✔ Výhra</span>;
                } else if (status === 'LOST') {
                  statusBadge = <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black px-2 py-0.5 rounded">✖ Prohra</span>;
                }

                return (
                  <div key={ticket.id} className="bg-[#04060a] border border-gray-800/80 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-gray-700 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono">{new Date(ticket.created_at || Date.now()).toLocaleString('cs-CZ')}</span>
                        {statusBadge}
                      </div>
                      <div className="text-sm font-bold text-white">{ticket.match_info || ticket.match || 'Neznámý zápas'}</div>
                      <div className="text-xs text-amber-300 font-semibold">Tip: {ticket.tip_name || ticket.tip}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-amber-400 font-bold font-mono">Kurz @{ticket.odds}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Šance {ticket.probability || 'N/A'}</div>
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