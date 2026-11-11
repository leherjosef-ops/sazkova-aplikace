'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { supabase } from '@/lib/supabase';
import { ticketProfit } from '@/lib/settle';
import { toast } from '@/components/Toaster';
import { T, tr, trTip, loc } from '@/lib/i18n';
import Icon from '@/components/Icon';


const STAKE = 100; // modelová sázka na tiket v Kč (jen pro výpočet statistik)
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString(loc(), { day: 'numeric', month: 'numeric', year: 'numeric' }) : '–');
const kc = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n).toLocaleString(loc())} ${tr('Kč')}`;

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [banner, setBanner] = useState<{ type: 'ok' | 'wait' | 'info'; text: string } | null>(null);
  const [pw, setPw] = useState({ a: '', b: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [limit, setLimit] = useState<number | null>(null);
  const [pauseUntil, setPauseUntil] = useState<Date | null>(null);
  const [rgMsg, setRgMsg] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null); // čas se zjišťuje až v prohlížeči (Next.js 16 nepovoluje Date při vykreslení)

  const loadProfile = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase.from('profiles').select('is_premium').eq('id', userId).maybeSingle();
    if (error) console.error('Chyba při dotazu na profil v Supabase:', error.message || error);
    const vip = Boolean(profile?.is_premium);
    setIsVip(vip);
    return vip;
  }, []);

  useEffect(() => {
    async function init() {
      setNow(Date.now());
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        setUser(user);

        if (user) {
          const vip = await loadProfile(user.id);

          const { data: t } = await supabase
            .from('saved_tickets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          setTickets(t || []);

          const { data: lim } = await supabase.from('user_limits').select('monthly_limit, pause_until').eq('user_id', user.id).maybeSingle();
          if (lim?.monthly_limit) { setLimit(Number(lim.monthly_limit)); setLimitInput(String(lim.monthly_limit)); }
          if (lim?.pause_until && new Date(lim.pause_until) > new Date()) setPauseUntil(new Date(lim.pause_until));

          // Návrat ze Stripe: webhook může dorazit o pár sekund později než přesměrování
          const q = new URLSearchParams(window.location.search);
          if (q.get('canceled')) setBanner({ type: 'info', text: tr('Platba byla zrušena, nic se nestrhlo.') });
          if (q.get('success')) {
            if (vip) {
              setBanner({ type: 'ok', text: tr('Platba proběhla, VIP členství je aktivní. Díky!') });
            } else {
              setBanner({ type: 'wait', text: tr('Platba proběhla, aktivuji VIP členství…') });
              for (let i = 0; i < 10; i++) {
                await new Promise((r) => setTimeout(r, 2000));
                if (await loadProfile(user.id)) {
                  setBanner({ type: 'ok', text: tr('VIP členství je aktivní. Díky!') });
                  return;
                }
              }
              setBanner({ type: 'info', text: tr('Aktivace trvá déle než obvykle. Zkus za chvíli obnovit stránku, a pokud VIP pořád nevidíš, napiš nám.') });
            }
          }
        }
      } catch (err: any) {
        console.error('Chyba při načítání profilu:', err.message || err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [loadProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsVip(false);
    window.location.href = '/';
  };

  const startCheckout = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const res = await fetch('/api/checkout', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else toast(tr('Nepodařilo se spustit platbu: ') + (json.error || tr('neznámá chyba')));
    } catch {
      toast(tr('Nastala neočekávaná chyba.'));
    }
  };

  const openPortal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }
      const res = await fetch('/api/billing-portal', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else toast(json.error || tr('Portál se nepodařilo otevřít.'));
    } catch {
      toast(tr('Nastala neočekávaná chyba.'));
    }
  };

  const saveLimits = async (patch: { monthly_limit?: number | null; pause_until?: string | null }, okText: string) => {
    if (!user) return;
    const { error } = await supabase.from('user_limits').upsert({ user_id: user.id, updated_at: new Date().toISOString(), ...patch });
    setRgMsg(error ? tr('Nepodařilo se uložit: ') + error.message : okText);
  };

  const saveMonthlyLimit = async () => {
    const v = Number(limitInput.replace(',', '.'));
    if (limitInput.trim() === '') { await saveLimits({ monthly_limit: null }, tr('Limit je zrušený.')); setLimit(null); return; }
    if (!Number.isFinite(v) || v <= 0) { setRgMsg(tr('Zadej kladnou částku.')); return; }
    await saveLimits({ monthly_limit: v }, tr('Limit je uložený.'));
    setLimit(v);
  };

  const startPause = async (days: number) => {
    const until = new Date(Date.now() + days * 86400000);
    if (pauseUntil && until <= pauseUntil) { setRgMsg(`${tr('Pauza už trvá do')} ${pauseUntil.toLocaleDateString(loc())}. ${tr('Jde jen prodloužit, ne zkrátit.')}`); return; }
    await saveLimits({ pause_until: until.toISOString() }, `${tr('Pauza je nastavená do')} ${until.toLocaleDateString(loc())}.`);
    setPauseUntil(until);
  };

  // Tvoje zapsané částky za tento měsíc
  const monthStart = now === null ? null : new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1);
  const usedThisMonth = monthStart ? tickets.filter((t) => new Date(t.created_at) >= monthStart).reduce((a, t) => a + (Number(t.stake) || 0), 0) : 0;

  const changePassword = async () => {
    setPwMsg(null);
    if (pw.a.length < 8) return setPwMsg({ ok: false, text: tr('Heslo musí mít aspoň 8 znaků.') });
    if (pw.a !== pw.b) return setPwMsg({ ok: false, text: tr('Hesla se neshodují.') });
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    setPwBusy(false);
    if (error) setPwMsg({ ok: false, text: tr('Heslo se nepodařilo změnit: ') + error.message });
    else { setPwMsg({ ok: true, text: tr('Heslo je změněno.') }); setPw({ a: '', b: '' }); }
  };

  // ---- statistiky z uložených tiketů ----
  const won = tickets.filter((t) => t.status === 'WON');
  const lost = tickets.filter((t) => t.status === 'LOST');
  const voided = tickets.filter((t) => t.status === 'VOID').length;
  const pending = tickets.length - won.length - lost.length - voided;
  const settled = won.length + lost.length;
  const winRate = settled ? (won.length / settled) * 100 : 0;
  const withStake = tickets.filter((t) => Number(t.stake) > 0 && (t.status === 'WON' || t.status === 'LOST'));
  const realMode = withStake.length > 0 && withStake.length === settled; // všechny vyhodnocené tikety mají zadanou částku
  const profit = tickets.reduce((a, t) => a + (ticketProfit(t, STAKE) ?? 0), 0);
  const staked = tickets.filter((t) => t.status === 'WON' || t.status === 'LOST').reduce((a, t) => a + (Number(t.stake) > 0 ? Number(t.stake) : STAKE), 0);
  const roi = staked ? (profit / staked) * 100 : 0;
  const recentlySettled = now === null ? [] : tickets.filter((t) => t.settled_at && now - new Date(t.settled_at).getTime() < 24 * 3600 * 1000);
  const avgOdds = tickets.length ? tickets.reduce((a, t) => a + (Number(t.odds) || 0), 0) / tickets.length : 0;

  const stat = (label: string, value: string, tone = 'text-white') => (
    <div className="bg-[#0a1715] border border-gray-800/80 p-4 rounded-2xl">
      <span className="text-[11px] text-gray-400 font-semibold block">{label}</span>
      <span className={`text-xl font-black font-mono ${tone}`}>{value}</span>
    </div>
  );

  const badge = (s?: string) =>
    s === 'WON' ? <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"><T>{`Výhra`}</T></span>
    : s === 'LOST' ? <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40"><T>{`Prohra`}</T></span>
    : s === 'VOID' ? <span className="text-[10px] font-black px-2 py-0.5 rounded bg-gray-500/20 text-gray-300 border border-gray-500/40"><T>{`Neplatný`}</T></span>
    : <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30"><T>{`Čeká se`}</T></span>;

  const bannerCls = { ok: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', wait: 'bg-amber-500/10 border-amber-500/30 text-amber-300', info: 'bg-gray-500/10 border-gray-600 text-gray-200' };

  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100 selection:bg-amber-500 selection:text-black font-sans relative">

      {/* 🚀 PRÉMIOVÁ HLAVIČKA S ČISTÝM TEXTOVÝM LOGEM */}
      <AppHeader active="/profile" user={user} isVip={isVip} onLogout={handleLogout} loading={isLoading} />

      <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-all flex items-center gap-1 font-medium">
            <T>{`← Zpět na hlavní stránku`}</T>
          </Link>
        </div>

        {recentlySettled.length > 0 && (
          <div className="border rounded-2xl px-5 py-3 text-sm font-semibold bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
            <T>{`Za posledních 24 hodin se vyhodnotilo`}</T> {recentlySettled.length} <T>{`tiketů:`}</T> {recentlySettled.filter((t) => t.status === 'WON').length}<T>{`× výhra,`}</T> {recentlySettled.filter((t) => t.status === 'LOST').length}<T>{`× prohra.`}</T>
          </div>
        )}

        {banner && <div className={`border rounded-2xl px-5 py-3 text-sm font-semibold ${bannerCls[banner.type]}`}>{banner.text}</div>}

        {!isLoading && !user ? (
          <div className="bg-[#14292a] border border-gray-800/80 p-8 rounded-3xl text-center space-y-3">
            <p className="text-sm text-gray-200"><T>{`Pro zobrazení profilu se musíš přihlásit.`}</T></p>
            <Link href="/login" className="inline-block bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black px-6 py-2.5 rounded-xl text-xs"><T>{`Přihlásit se`}</T></Link>
          </div>
        ) : (
          <>
            <div className="bg-[#14292a] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-inner text-amber-400"><Icon name="user" className="w-7 h-7" /></div>
                  <div>
                    <h1 className="text-2xl font-black text-white"><T>{`Uživatelský profil ApexOdds`}</T></h1>
                    <p className="text-xs text-gray-300 mt-0.5"><T>{`Účet, členství a přehled tvých tiketů`}</T></p>
                  </div>
                </div>
                <div>
                  {isLoading ? (
                    <span className="text-xs text-gray-400"><T>{`Načítám stav...`}</T></span>
                  ) : isVip ? (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>VIP ČLEN (PREMIUM AKTIVNÍ)
                    </span>
                  ) : (
                    <span className="bg-gray-800 text-gray-300 border border-gray-700 text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span><T>{`FREE UŽIVATEL`}</T>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0a1715] border border-gray-800/80 p-5 rounded-2xl space-y-1.5">
                  <span className="text-[11px] text-gray-400 font-bold"><T>{`E-mail`}</T></span>
                  <div className="text-sm font-mono text-white font-bold break-all">{user ? user.email : '…'}</div>
                </div>
                <div className="bg-[#0a1715] border border-gray-800/80 p-5 rounded-2xl space-y-1.5">
                  <span className="text-[11px] text-gray-400 font-bold"><T>{`Účet vytvořen`}</T></span>
                  <div className="text-sm font-mono text-white font-bold">{fmt(user?.created_at)}</div>
                  <div className="text-[11px] text-gray-400"><T>{`Poslední přihlášení`}</T> {fmt(user?.last_sign_in_at)}</div>
                </div>
                <div className="bg-[#0a1715] border border-gray-800/80 p-5 rounded-2xl space-y-1.5">
                  <span className="text-[11px] text-gray-400 font-bold"><T>{`Předplatné`}</T></span>
                  <div className="text-sm font-bold text-amber-400">{isVip ? 'ApexOdds VIP' : 'Free tarif'}</div>
                  <div className="text-[11px] text-gray-400">{isVip ? tr('Plný přístup') : tr('Omezený přístup')}</div>
                </div>
              </div>

              <div className="bg-[#0a1715] border border-gray-800/80 p-6 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-gray-200"><T>{`Členství`}</T></h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#14292a] p-4 rounded-xl border border-gray-800">
                  <div>
                    <div className="text-xs font-bold text-white">{isVip ? tr('Předplatné je aktivní') : tr('Měsíční VIP členství (199 Kč / měsíc)')}</div>
                    <div className="text-[11px] text-gray-300 mt-0.5">
                      {isVip ? tr('Máš přístup ke generátoru tiketů, risk bombám a ukládání tiketů.') : tr('Získáš generátor tiketů, risk bomby a ukládání tiketů do historie.')}
                    </div>
                  </div>
                  {isVip && (
                    <button onClick={openPortal} className="bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer">
                      <T>{`Spravovat nebo zrušit předplatné`}</T>
                    </button>
                  )}
                  {!isVip && (
                    <button onClick={startCheckout} className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-950/40 cursor-pointer">
                      <T>{`Aktivovat VIP členství`}</T>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#14292a] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-5">
              <div>
                <h2 className="text-base font-black text-white"><T>{`Tvoje tikety v číslech`}</T></h2>
                <p className="text-[11px] text-gray-400 mt-0.5"><T>{`Počítá se z tiketů, které jsi uložil. U tiketů, kde jsi zadal částku, se počítá s ní, u starších (bez částky)`}</T> <T>{`jako bys vsadil`}</T> {STAKE} {tr('Kč')}. <T>{`Aplikace s žádnými penězi nesází, částky si zapisuješ sám.`}</T></p>
              </div>

              {tickets.length === 0 ? (
                <div className="text-xs text-gray-300 bg-[#0a1715] border border-gray-800 rounded-2xl p-6 text-center">
                  <T>{`Zatím nemáš žádné uložené tikety. Ulož si tip na stránce`}</T> <Link href="/tips" className="text-amber-400 underline"><T>{`Zápasy`}</T></Link> <T>{`a tady uvidíš, jak ti vycházejí.`}</T>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stat(tr('Uložených tiketů'), String(tickets.length))}
                    {stat(tr('Čeká na výsledek'), String(pending), 'text-amber-400')}
                    {stat(tr('Úspěšnost'), settled ? `${winRate.toFixed(0)} %` : '–', 'text-emerald-300')}
                    {stat(tr('Průměrný kurz'), avgOdds ? avgOdds.toFixed(2) : '–', 'text-amber-400')}
                    {stat(tr('Výher'), String(won.length), 'text-emerald-300')}
                    {stat('Proher', String(lost.length), 'text-red-400')}
                    {stat(realMode ? tr('Zisk / ztráta') : tr('Modelový zisk'), settled ? kc(profit) : '–', profit >= 0 ? 'text-emerald-300' : 'text-red-400')}
                    {stat(tr('Návratnost (ROI)'), settled ? `${roi > 0 ? '+' : ''}${roi.toFixed(0)} %` : '–', roi >= 0 ? 'text-emerald-300' : 'text-red-400')}
                  </div>
                  {settled > 0 && settled < 20 && (
                    <p className="text-[11px] text-gray-400"><T>{`Vyhodnoceno je zatím jen`}</T> {settled} <T>{`tiketů. Na takhle malém vzorku se čísla hodně kolísají a nic o kvalitě tipů neříkají.`}</T></p>
                  )}
                  {pending > 0 && <p className="text-[11px] text-gray-400"><T>{`Čekající tikety vyhodnotíš na stránce`}</T> <Link href="/history" className="text-amber-400 underline"><T>{`Historie`}</T></Link>.</p>}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-200"><T>{`Posledních 5 tiketů`}</T></h3>
                      <Link href="/history" className="text-[11px] text-amber-400 hover:text-amber-300"><T>{`Celá historie`}</T></Link>
                    </div>
                    {tickets.slice(0, 5).map((t) => (
                      <div key={t.id} className="bg-[#0a1715] border border-gray-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{t.match_info || tr('Zápas')}</div>
                          <div className="text-[11px] text-amber-300 truncate">{trTip(t.tip_name || t.tip)} <span className="text-gray-500">· {fmt(t.created_at)}</span></div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-black font-mono text-amber-400">@{t.odds}</span>
                          {badge(t.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-[#14292a] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-4">
              <div>
                <h2 className="text-base font-black text-white"><T>{`Odpovědné hraní`}</T></h2>
                <p className="text-[11px] text-gray-400 mt-0.5"><T>{`Limity si hlídáš sám pro sebe. Aplikace tě upozorní při ukládání tiketu. Víc najdeš na stránce`}</T> <Link href="/responsible" className="text-amber-400 underline"><T>{`Odpovědné hraní`}</T></Link>.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[#0a1715] border border-gray-800/80 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-bold text-gray-200"><T>{`Měsíční limit zapsaných částek`}</T></div>
                  <div className="flex gap-2">
                    <input inputMode="decimal" placeholder={tr("např. 2000")} value={limitInput} onChange={(e) => setLimitInput(e.target.value)}
                      className="flex-1 bg-[#14292a] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:border-amber-500 outline-none" />
                    <button onClick={saveMonthlyLimit} className="bg-gray-800 hover:bg-amber-500 hover:text-black text-white text-xs font-bold px-4 rounded-xl cursor-pointer"><T>{`Uložit`}</T></button>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    <T>{`Tento měsíc zapsáno`}</T> <b className="text-white font-mono">{Math.round(usedThisMonth).toLocaleString(loc())} {tr('Kč')}</b>{limit ? <> z {limit.toLocaleString(loc())} Kč.</> : '. Limit zatím nemáš nastavený.'}
                  </div>
                  {limit && (
                    <div className="h-2 bg-[#14292a] rounded-full overflow-hidden">
                      <div className={`h-full ${usedThisMonth > limit ? 'bg-red-400' : usedThisMonth > limit * 0.8 ? 'bg-yellow-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, (usedThisMonth / limit) * 100)}%` }} />
                    </div>
                  )}
                </div>

                <div className="bg-[#0a1715] border border-gray-800/80 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-bold text-gray-200"><T>{`Pauza od sázení`}</T></div>
                  {pauseUntil ? (
                    <div className="text-[11px] text-amber-300"><T>{`Pauza trvá do`}</T> {pauseUntil.toLocaleDateString(loc())}<T>{`. Tikety se teď neukládají.`}</T></div>
                  ) : (
                    <div className="text-[11px] text-gray-400"><T>{`Na zvolenou dobu se zablokuje ukládání tiketů.`}</T></div>
                  )}
                  <div className="flex gap-2">
                    {[[1, '24 hodin'], [7, tr('Týden')], [30, tr('Měsíc')]].map(([d, l]) => (
                      <button key={d} onClick={() => startPause(Number(d))} className="flex-1 bg-gray-800 hover:bg-amber-500 hover:text-black text-white text-xs font-bold py-2 rounded-xl cursor-pointer">{l}</button>
                    ))}
                  </div>
                  <div className="text-[10px] text-gray-500"><T>{`Běžící pauzu jde jen prodloužit, ne zkrátit. Rozmysli si délku.`}</T></div>
                </div>
              </div>
              {rgMsg && <div className="text-xs text-emerald-300">{rgMsg}</div>}
            </div>

            <div className="bg-[#14292a] border border-gray-800/80 p-8 rounded-3xl shadow-xl space-y-4">
              <h2 className="text-base font-black text-white"><T>{`Zabezpečení účtu`}</T></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="password" autoComplete="new-password" placeholder={tr("Nové heslo (aspoň 8 znaků)")} value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })}
                  className="bg-[#0a1715] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 outline-none" />
                <input type="password" autoComplete="new-password" placeholder={tr("Nové heslo znovu")} value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })}
                  className="bg-[#0a1715] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 outline-none" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={changePassword} disabled={pwBusy || !pw.a}
                  className="bg-gray-800 hover:bg-amber-500 hover:text-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer">
                  {pwBusy ? tr('Ukládám…') : tr('Změnit heslo')}
                </button>
                {pwMsg && <span className={`text-xs ${pwMsg.ok ? 'text-emerald-300' : 'text-red-400'}`}>{pwMsg.text}</span>}
              </div>
            </div>

            <div className="bg-[#0a1715] border border-gray-800/80 p-6 rounded-2xl text-[11px] text-gray-400 leading-relaxed">
              <b className="text-gray-200"><T>{`Hraj s rozvahou.`}</T></b> <T>{`Modelové šance jsou odhad, ne záruka. Sázej jen částky, o které se bez problému můžeš přijít, a pokud tě sázení začíná stresovat, udělej si pauzu a promluv si s někým blízkým nebo s odbornou poradnou.`}</T>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
