'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tr } from '@/lib/i18n';
import Icon from '@/components/Icon';

const ITEMS: { href: string; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { href: '/', label: 'Domů', icon: 'home' },
  { href: '/tips', label: 'Zápasy', icon: 'ball' },
  { href: '/risk-bombs', label: 'Bomby', icon: 'flame' },
  { href: '/generator', label: 'Generátor', icon: 'sparkles' },
  { href: '/history', label: 'Historie', icon: 'history' },
  { href: '/profile', label: 'Profil', icon: 'user' },
];

// Na telefonu horní navigace není, proto spodní lišta.
export default function MobileNav() {
  const path = usePathname() || '/';
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0c1c19]/95 backdrop-blur-md border-t border-gray-800 pb-[env(safe-area-inset-bottom)]" aria-label={tr("Hlavní navigace")}>
      <ul className="grid grid-cols-6">
        {ITEMS.map((i) => {
          const active = i.href === '/' ? path === '/' : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${active ? 'text-amber-400' : 'text-gray-400 active:text-white'}`}>
                <span className={`px-3 py-1 rounded-full ${active ? 'bg-amber-500/15' : ''}`}><Icon name={i.icon} className="w-5 h-5" /></span>
                {tr(i.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
