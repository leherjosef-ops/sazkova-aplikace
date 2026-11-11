'use client';

import { Fragment, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { EN } from '@/lib/en';

export type Lang = 'cs' | 'en';
const KEY = 'apexodds-lang';

// Aktuální jazyk pro překlad mimo komponenty (texty v hlášeních a popiscích).
let current: Lang = 'cs';
export const tr = (cs: string) => (current === 'en' ? EN[cs] ?? cs : cs);

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'cs', setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Začínáme češtinou (shoduje se s HTML ze serveru), uložený jazyk se načte po zobrazení.
  const [lang, setLangState] = useState<Lang>('cs');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'cs') setLangState(saved);
      else if (navigator.language && !navigator.language.toLowerCase().startsWith('cs') && !navigator.language.toLowerCase().startsWith('sk')) setLangState('en');
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
  }, []);

  current = lang;
  // Při přepnutí jazyka se obsah znovu vykreslí, aby se přeložily i texty mimo komponenty.
  return <Ctx.Provider value={{ lang, setLang }}><Fragment key={lang}>{children}</Fragment></Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

// Překlad podle českého textu. Když anglická verze chybí, zobrazí se česky.
export function useT() {
  const { lang } = useLang();
  return useCallback((cs: string) => (lang === 'en' ? EN[cs] ?? cs : cs), [lang]);
}

export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex rounded-lg border border-gray-800/90 bg-[#0a1715] p-0.5 text-[11px] font-bold ${className}`} role="group" aria-label="Language">
      {(['cs', 'en'] as Lang[]).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`px-2 py-1 rounded-md transition-colors ${lang === l ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// Překládaný text v JSX: <T>{`Český text`}</T>
export function T({ children }: { children: string }) {
  const t = useT();
  return <>{t(children)}</>;
}

export const loc = () => (current === 'en' ? 'en-GB' : 'cs-CZ');

// Názvy tipů se ukládají česky (podle nich se tikety vyhodnocují), takže se překládají jen při zobrazení.
export function trTip(name: string) {
  if (current !== 'en' || !name) return name;
  if (name.startsWith('Výhra ')) return 'Win ' + name.slice(6);
  if (name === 'Celkem gólů: Více než 2.5 gólů') return 'Total goals: Over 2.5';
  if (name === 'Oba týmy dají gól (ANO)') return 'Both teams to score (YES)';
  return name;
}
