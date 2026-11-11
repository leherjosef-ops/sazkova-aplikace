'use client';

import { useEffect, useState } from 'react';

type Toast = { id: number; text: string; kind: 'ok' | 'error' | 'info' };
type Listener = (t: Toast) => void;

const listeners = new Set<Listener>();
let counter = 0;

// Náhrada za alert(): zpráva se zobrazí dole a po pár sekundách sama zmizí.
export function toast(text: string, kind?: Toast['kind']) {
  const k = kind ?? (/chyb|nepoda|nezda|nelze|neplatn|zrušen/i.test(text) ? 'error' : /uložen|změněn|úspěš|aktivn|nastaven/i.test(text) ? 'ok' : 'info');
  const t = { id: ++counter, text: String(text), kind: k };
  listeners.forEach((l) => l(t));
}

const STYLE: Record<Toast['kind'], string> = {
  ok: 'border-emerald-500/50 text-emerald-200',
  error: 'border-red-500/50 text-red-300',
  info: 'border-amber-500/40 text-gray-100',
};
const ICON: Record<Toast['kind'], string> = { ok: '✓', error: '!', info: 'i' };

export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const on: Listener = (t) => {
      setItems((cur) => [...cur.slice(-2), t]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), t.kind === 'error' ? 7000 : 4500);
    };
    listeners.add(on);
    return () => { listeners.delete(on); };
  }, []);

  return (
    <div className="fixed z-[120] top-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto bg-[#14292a] border rounded-xl px-4 py-3 shadow-2xl text-sm flex items-start gap-3 ${STYLE[t.kind]}`}>
          <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full border border-current flex items-center justify-center text-[11px] font-black">{ICON[t.kind]}</span>
          <span className="flex-1 leading-snug">{t.text}</span>
          <button onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))} className="text-gray-400 hover:text-white text-xs cursor-pointer" aria-label="Zavřít">✕</button>
        </div>
      ))}
    </div>
  );
}
