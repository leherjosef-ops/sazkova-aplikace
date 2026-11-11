'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { T, tr } from '@/lib/i18n';

const AGE_KEY = 'apexodds_age_ok';
const SESSION_KEY = 'apexodds_session_start';
const REMIND_AFTER_MIN = 60;

// Ověření věku (jen potvrzení, žádná kontrola dokladu) + připomínka po hodině na webu.
export default function SiteGuards() {
  const [ageOk, setAgeOk] = useState(true); // true, aby se při načtení zbytečně neblikalo
  const [remind, setRemind] = useState(false);

  useEffect(() => {
    try { setAgeOk(localStorage.getItem(AGE_KEY) === '1'); } catch { setAgeOk(false); }

    let start = Date.now();
    try {
      const saved = Number(sessionStorage.getItem(SESSION_KEY));
      if (saved) start = saved; else sessionStorage.setItem(SESSION_KEY, String(start));
    } catch {}
    const tick = () => { if (Date.now() - start > REMIND_AFTER_MIN * 60000) setRemind(true); };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  if (!ageOk) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0c1c19] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={tr("Potvrzení věku")}>
        <div className="max-w-sm w-full bg-[#14292a] border border-gray-700 rounded-2xl p-7 space-y-4 text-center">
          <h2 className="text-xl font-black text-white"><T>{`Je ti 18 nebo víc?`}</T></h2>
          <p className="text-sm text-gray-300 leading-relaxed"><T>{`ApexOdds je určený jen pro dospělé. Hazardní hry mohou způsobit závislost.`}</T></p>
          <div className="flex gap-2">
            <button onClick={() => { try { localStorage.setItem(AGE_KEY, '1'); } catch {} setAgeOk(true); }} className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-sm font-black py-2.5 rounded-xl cursor-pointer"><T>{`Ano, je mi 18+`}</T></button>
            <a href="https://www.google.com" className="flex-1 bg-gray-800 text-white text-sm font-bold py-2.5 rounded-xl"><T>{`Ne`}</T></a>
          </div>
          <p className="text-[11px] text-gray-500"><T>{`Pokračováním souhlasíš s`}</T> <Link href="/terms" className="underline"><T>{`podmínkami`}</T></Link>.</p>
        </div>
      </div>
    );
  }

  if (remind) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-md bg-[#14292a] border border-amber-500/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
        <div className="text-xs text-gray-200 leading-relaxed flex-1">
          <T>{`Jsi tady už přes hodinu. Dej si pauzu, protáhni se a rozmysli, jestli sázíš s chladnou hlavou. Pauzu si můžeš nastavit i v`}</T> <Link href="/profile" className="text-amber-400 underline"><T>{`profilu`}</T></Link>.
        </div>
        <button onClick={() => { setRemind(false); try { sessionStorage.setItem(SESSION_KEY, String(Date.now())); } catch {} }} className="text-xs text-gray-400 hover:text-white cursor-pointer"><T>{`Zavřít`}</T></button>
      </div>
    );
  }
  return null;
}
