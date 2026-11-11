'use client';

import Link from 'next/link';
import { LangSwitch, useT } from '@/lib/i18n';

const LINKS = [
  { href: '/tips', label: 'Zápasy' },
  { href: '/risk-bombs', label: 'Bomby' },
  { href: '/generator', label: 'Generátor' },
  { href: '/history', label: 'Historie' },
  { href: '/model', label: 'Model' },
];

type Props = {
  active?: string;
  user?: { email?: string } | null;
  isVip?: boolean;
  loading?: boolean;
  onLogout?: () => void;
};

// Společná hlavička všech stránek s přepínačem jazyka.
export default function AppHeader({ active, user, isVip, loading, onLogout }: Props) {
  const t = useT();
  return (
    <header className="sticky top-0 z-40 bg-[#0c1c19]/95 backdrop-blur-md border-b border-amber-500/20 px-4 sm:px-6 py-3.5 shadow-2xl">
      <div className="max-w-7xl mx-auto relative flex items-center justify-between gap-3">
        <Link href="/" className="flex flex-col group cursor-pointer shrink-0">
          <span className="flex items-center gap-1.5 font-black text-xl font-mono">
            <span className="text-white group-hover:text-amber-400 transition-colors">APEX</span>
            <span className="text-amber-400">ODDS</span>
          </span>
          <span className="text-[10px] text-gray-400 font-bold">{t('Intelligence Engine')}</span>
        </Link>

        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 bg-[#0a1715] border border-gray-800/90 p-1 rounded-xl items-center gap-1.5 shadow-inner">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active === l.href ? 'page' : undefined}
              className={active === l.href
                ? 'bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-gray-900 font-semibold px-4 py-2 rounded-lg text-xs transition-all'}>
              {t(l.label)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitch />
          {loading ? (
            <span className="text-xs text-gray-400">…</span>
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-[#0a1715] border border-amber-500/30 px-3 sm:px-4 py-2 rounded-xl shadow-inner">
              {isVip ? (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-black px-2 py-0.5 rounded shadow-sm">VIP</span>
              ) : (
                <span className="bg-gray-800 text-gray-300 border border-gray-700 text-[10px] font-black px-2 py-0.5 rounded">FREE</span>
              )}
              <span className="hidden sm:inline text-gray-200 text-xs font-mono font-medium">{user.email}</span>
              <Link href="/profile" className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-lg transition-all shadow-sm">{t('Profil')}</Link>
              {onLogout && (
                <button onClick={onLogout} className="text-gray-400 hover:text-red-400 text-xs transition-all pl-1 cursor-pointer font-medium">{t('Odhlásit')}</button>
              )}
            </div>
          ) : (
            <Link href="/login" className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black px-4 sm:px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-950/55">{t('Přihlásit se')}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
