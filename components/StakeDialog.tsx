'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { T, tr, loc } from '@/lib/i18n';

const kc = (n: number) => `${Math.round(n).toLocaleString(loc())} Kč`;

interface Props {
  supabase: SupabaseClient;
  userId: string;
  title: string; // např. "Výhra Arsenal" nebo "Akumulátor (3 zápasy)"
  odds: number;
  onConfirm: (stake: number) => Promise<void> | void;
  onClose: () => void;
}

export default function StakeDialog({ supabase, userId, title, odds, onConfirm, onClose }: Props) {
  const [stake, setStake] = useState('100');
  const [limit, setLimit] = useState<number | null>(null);
  const [used, setUsed] = useState(0);
  const [pauseUntil, setPauseUntil] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from('user_limits').select('monthly_limit, pause_until').eq('user_id', userId).maybeSingle();
      setLimit(l?.monthly_limit ? Number(l.monthly_limit) : null);
      setPauseUntil(l?.pause_until && new Date(l.pause_until) > new Date() ? new Date(l.pause_until) : null);

      const from = new Date(); from.setDate(1); from.setHours(0, 0, 0, 0);
      const { data: t } = await supabase.from('saved_tickets').select('stake').eq('user_id', userId).gte('created_at', from.toISOString());
      setUsed((t || []).reduce((a: number, x: any) => a + (Number(x.stake) || 0), 0));
    })();
  }, [supabase, userId]);

  const n = Number(stake.replace(',', '.'));
  const valid = Number.isFinite(n) && n > 0 && n <= 1_000_000;
  const over = limit !== null && valid && used + n > limit;
  const blocked = Boolean(pauseUntil) || over;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#14292a] border border-gray-700 w-full max-w-sm rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={tr("Vsazená částka")}>
        <div>
          <h3 className="text-base font-black text-white"><T>{`Kolik jsi vsadil?`}</T></h3>
          <p className="text-xs text-gray-300 mt-1">{title} <span className="font-mono text-amber-400">@{odds.toFixed(2)}</span></p>
          <p className="text-[11px] text-gray-400 mt-1"><T>{`Aplikace nesází za tebe. Částku si jen zapisuješ, aby profil ukazoval skutečný zisk a ztrátu.`}</T></p>
        </div>

        <div className="flex items-center gap-2">
          <input
            autoFocus inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)}
            className="flex-1 bg-[#0a1715] border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono focus:border-amber-500 outline-none"
            aria-label={tr("Vsazená částka v korunách")}
          />
          <span className="text-sm text-gray-300"><T>{`Kč`}</T></span>
        </div>
        <div className="flex gap-2">
          {[50, 100, 200, 500].map((v) => (
            <button key={v} onClick={() => setStake(String(v))} className="flex-1 text-xs bg-[#0a1715] border border-gray-800 hover:border-amber-500 text-gray-200 rounded-lg py-1.5 cursor-pointer">{v}</button>
          ))}
        </div>

        {valid && <p className="text-xs text-gray-300"><T>{`Při výhře se vyplatí`}</T> <b className="text-emerald-300 font-mono">{kc(n * odds)}</b> ({tr('zisk')} {kc(n * (odds - 1))}).</p>}

        {limit !== null && (
          <p className={`text-[11px] ${over ? 'text-red-400' : 'text-gray-400'}`}>
            {tr('Tento měsíc zapsáno')} {kc(used)} {tr('z tvého limitu')} {kc(limit)}.{over && tr(' S touhle částkou bys limit překročil.')}
          </p>
        )}
        {pauseUntil && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            Máš nastavenou pauzu do {pauseUntil.toLocaleDateString(loc())}. Tikety se teď neukládají. Pauzu můžeš upravit v profilu.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"><T>{`Zrušit`}</T></button>
          <button
            disabled={!valid || blocked || busy}
            onClick={async () => { setBusy(true); try { await onConfirm(n); } finally { setBusy(false); } }}
            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-xs font-black py-2.5 rounded-xl disabled:opacity-40 cursor-pointer"
          >
            {busy ? tr('Ukládám…') : tr('Uložit tiket')}
          </button>
        </div>
      </div>
    </div>
  );
}
