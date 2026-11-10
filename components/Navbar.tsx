'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar({ user, onLogout }: { user?: any; onLogout?: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-emerald-500/10 px-4 py-4 shadow-2xl">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
        
        {/* Logo s futuristickou září */}
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative w-11 h-11 rounded-2xl bg-gray-950 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner">
              🤖
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-300 to-teal-400 text-2xl tracking-wider uppercase font-mono">
              AI Sázkový Guru
            </h1>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase font-semibold">Smart Predictive Engine</p>
          </div>
        </Link>

        {/* Jednotná plovoucí navigační lišta */}
        <nav className="bg-gray-950/90 border border-gray-800/80 p-1.5 rounded-full flex flex-wrap items-center justify-center gap-1 shadow-inner">
          <Link 
            href="/" 
            className={`px-4 py-2 rounded-full text-xs transition-all flex items-center gap-2 font-bold ${
              pathname === '/' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40' 
                : 'text-gray-400 hover:text-white hover:bg-gray-900/80'
            }`}
          >
            <span className="text-sm">🎯</span> Tipy & Zápasy
          </Link>

          <Link 
            href="/risk-bombs" 
            className={`px-4 py-2 rounded-full text-xs transition-all flex items-center gap-2 font-bold ${
              pathname === '/risk-bombs' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40' 
                : 'text-gray-400 hover:text-white hover:bg-gray-900/80'
            }`}
          >
            <span className="text-sm">💣</span> Riskantní Bomby
          </Link>

          <Link 
            href="/generator" 
            className={`px-4 py-2 rounded-full text-xs transition-all flex items-center gap-2 font-bold ${
              pathname === '/generator' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40' 
                : 'text-gray-400 hover:text-white hover:bg-gray-900/80'
            }`}
          >
            <span className="text-sm">⚡</span> AI Generátor
          </Link>

          <Link 
            href="/history" 
            className={`px-4 py-2 rounded-full text-xs transition-all flex items-center gap-2 font-bold ${
              pathname === '/history' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40' 
                : 'text-gray-400 hover:text-white hover:bg-gray-900/80'
            }`}
          >
            <span className="text-sm">📊</span> Historie
          </Link>
        </nav>

        {/* Uživatelská zóna / Přihlášení */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-gray-950 border border-gray-800/90 px-4 py-1.5 rounded-full shadow-inner">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>

              <span className="text-gray-300 text-xs font-mono">{user.email}</span>
              
              <Link 
                href="/profile" 
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1.5"
              >
                <span>👤</span> Profil
              </Link>

              {onLogout && (
                <button 
                  onClick={onLogout}
                  className="text-gray-500 hover:text-red-400 text-xs font-medium transition-all px-1.5"
                >
                  Odhlásit
                </button>
              )}
            </div>
          ) : (
            <Link 
              href="/login" 
              className="relative group overflow-hidden rounded-full p-[1px] focus:outline-none"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-full group-hover:opacity-100 transition duration-300 opacity-75"></span>
              <span className="relative px-6 py-2 rounded-full bg-gray-950 flex items-center gap-2 text-xs font-bold text-white transition duration-300 group-hover:bg-opacity-0">
                <span>🔑</span> Přihlásit se
              </span>
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}