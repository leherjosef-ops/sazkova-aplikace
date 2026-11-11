'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { T, tr, loc } from '@/lib/i18n';

const pc = (x: number, d = 1) => `${(x * 100).toFixed(d)} %`;
const NAMES: Record<string, string> = { PL: 'Premier League', PD: 'La Liga', SA: 'Serie A', BL1: 'Bundesliga', FL1: 'Ligue 1', CL: 'Liga mistrů', DED: 'Eredivisie', PPL: 'Primeira Liga', BSA: 'Brazílie Série A', ELC: 'Championship' };

function Metric({ label, hint, full, basic, mle, base, lower }: { label: string; hint: string; full: number; basic: number; mle?: number; base: number; lower?: boolean }) {
  const rows = ([[tr('Základní model'), basic], [tr('Vylepšený model'), full], ...(mle !== undefined ? [[tr('Nový model (síla soupeřů)'), mle]] : []), [tr('Naivní odhad'), base]] as [string, number][]);
  const vals = rows.map((r) => r[1]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const best = lower ? lo : hi;
  // Délka sloupce ukazuje pořadí (nejlepší = nejdelší). Skutečná čísla jsou vpravo.
  const width = (v: number) => 30 + 70 * (hi === lo ? 1 : (lower ? hi - v : v - lo) / (hi - lo));
  return (
    <div className="bg-[#0a1715] border border-gray-800/80 p-5 rounded-2xl space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white">{label}</h3>
        <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{hint}</p>
      </div>
      {rows.map(([n, v]) => (
        <div key={n} className="flex items-center gap-3 text-xs">
          <span className="w-32 text-gray-300">{n}</span>
          <div className="flex-1 h-3 bg-[#14292a] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${v === best ? 'bg-amber-400' : 'bg-gray-500'}`} style={{ width: `${width(v)}%` }} />
          </div>
          <b className={`w-16 text-right font-mono ${v === best ? 'text-amber-300' : 'text-gray-200'}`}>{lower ? v.toFixed(3) : pc(v)}</b>
        </div>
      ))}
    </div>
  );
}

function CalibrationChart({ data }: { data: { predicted: number; actual: number; count: number }[] }) {
  const S = 260, P = 30;
  const x = (v: number) => P + v * (S - P - 8);
  const y = (v: number) => S - P - v * (S - P - 8);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-sm mx-auto" role="img" aria-label={tr("Kalibrace modelu: předpovězená šance proti skutečné četnosti")}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="#2f4a42" strokeWidth="0.5" />
          <line y1={y(0)} y2={y(1)} x1={x(t)} x2={x(t)} stroke="#2f4a42" strokeWidth="0.5" />
          <text x={x(t)} y={S - 12} fontSize="8" fill="#92a79a" textAnchor="middle">{Math.round(t * 100)}</text>
          <text x={P - 6} y={y(t) + 3} fontSize="8" fill="#92a79a" textAnchor="end">{Math.round(t * 100)}</text>
        </g>
      ))}
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="#92a79a" strokeDasharray="3 3" strokeWidth="1" />
      <polyline fill="none" stroke="#5fdc97" strokeWidth="1.5" points={data.map((d) => `${x(d.predicted)},${y(d.actual)}`).join(' ')} />
      {data.map((d, i) => (
        <circle key={i} cx={x(d.predicted)} cy={y(d.actual)} r={2 + Math.min(4, Math.sqrt(d.count) / 8)} fill="#5fdc97">
          <title>{`Model řekl ${Math.round(d.predicted * 100)} % → stalo se ${Math.round(d.actual * 100)} % (${d.count} předpovědí)`}</title>
        </circle>
      ))}
      <text x={S / 2} y={S - 1} fontSize="8" fill="#92a79a" textAnchor="middle">{tr('šance podle modelu (%)')}</text>
      <text x={8} y={S / 2} fontSize="8" fill="#92a79a" textAnchor="middle" transform={`rotate(-90 8 ${S / 2})`}>{tr('skutečně se stalo (%)')}</text>
    </svg>
  );
}

export default function ModelPage() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/backtest').then((r) => r.json()).then((j) => (j.success ? setD(j) : setErr(j.error || tr('Nepodařilo se načíst.')))).catch(() => setErr(tr('Nepodařilo se načíst. Zkus to za chvíli.')));
  }, []);

  const t = d?.total;
  const act = t ? (t[d.active] ?? t.basic) : null;
  const beats = t && act.logLoss < t.baseline.logLoss;

  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100">
      <SiteHeader active="/model" />
      <main className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
        <Link href="/" className="text-xs text-gray-400 hover:text-white"><T>{`← Zpět na hlavní stránku`}</T></Link>
        <div>
          <h1 className="text-2xl font-black text-white"><T>{`Jak dobrý model opravdu je`}</T></h1>
          <p className="text-sm text-gray-300 mt-1 leading-relaxed">
            <T>{`Model jsme zpětně otestovali na odehraných zápasech. Každý zápas se předpovídal jen z těch, které se odehrály před ním, takže model nikdy „nepodvádí" a nevidí výsledek předem.`}</T>
          </p>
        </div>

        {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-2xl p-5">{err}</div>}
        {!d && !err && <div className="text-sm text-gray-400 p-4"><T>{`Počítám ověření na odehraných zápasech, může to pár sekund trvat…`}</T></div>}

        {t && (
          <>
            <div className={`border rounded-2xl p-5 text-sm leading-relaxed ${beats ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
              {beats
                ? <>{tr('Na')} {t.n.toLocaleString(loc())} {tr('ověřených zápasech je model přesnější než naivní odhad, který zná jen průměrnou četnost výher domácích, remíz a výher hostů. Neznamená to ale, že porazí sázkovky. To tahle stránka neměří.')}</>
                : <>{tr('Na')} {t.n.toLocaleString(loc())} {tr('ověřených zápasech model nepřekonal naivní odhad. Jeho šance proto neber jako užitečný signál.')}</>}
            </div>

            <p className="text-[11px] text-gray-400"><T>{`Aplikace teď používá:`}</T> <b className="text-gray-200">{d.active === 'full' ? tr('vylepšený model') : d.active === 'mle' ? tr('nový model (síla soupeřů)') : tr('základní model')}</b><T>{`. Délka sloupce ukazuje pořadí, přesná čísla jsou vpravo. Rozdíl mezi základním a vylepšeným modelem je malý a při takhle málo zápasech může být náhoda.`}</T></p>

            <div className="grid md:grid-cols-3 gap-4">
              <Metric label={tr("Trefa výsledku")} hint={tr("Jak často nejpravděpodobnější výsledek (výhra domácích, remíza, výhra hostů) skutečně nastal. Vyšší je lepší.")} full={t.full.accuracy} basic={t.basic.accuracy} mle={t.mle?.accuracy} base={t.baseline.accuracy} />
              <Metric lower label={tr("Brierovo skóre")} hint={tr("Trestá špatně odhadnuté šance, i když tip vyšel. Nižší je lepší.")} full={t.full.brier} basic={t.basic.brier} mle={t.mle?.brier} base={t.baseline.brier} />
              <Metric lower label="Log-loss" hint={tr("Trestá hlavně sebejisté chyby. Nižší je lepší. Nejpřísnější z měřítek.")} full={t.full.logLoss} basic={t.basic.logLoss} mle={t.mle?.logLoss} base={t.baseline.logLoss} />
            </div>

            {d.picks && d.picks.matches > 0 && (
              <div className="bg-[#0a1715] border border-gray-800/80 p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white"><T>{`Úspěšnost vybraných tipů`}</T></h3>
                  <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                    <T>{`U každého ověřeného zápasu jsme vybrali tipy stejně jako na webu (nejvyšší šance, kurz aspoň 1,30) a podívali se, jestli vyšly.`}</T>
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[['Tip č. 1 u zápasu', d.picks.top], ['Všechny vybrané tipy', d.picks.all]].map(([label, x]: any) => (
                    <div key={label} className="bg-[#14292a] border border-gray-800 rounded-xl p-4">
                      <div className="text-[11px] text-gray-400 font-semibold">{tr(label)}</div>
                      <div className="text-3xl font-black text-emerald-300 font-mono mt-1">{pc(x.hitRate, 0)}</div>
                      <div className="h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full" style={{ width: `${x.hitRate * 100}%` }} />
                      </div>
                      <div className="text-[11px] text-gray-400 mt-2 space-y-0.5">
                        <div>{tr('Model čekal')} <b className="text-gray-200">{pc(x.expected, 0)}</b> · {tr('průměrný kurz')} <b className="text-gray-200 font-mono">{x.avgOdds.toFixed(2)}</b></div>
                        <div>{x.n.toLocaleString(loc())} {tr('tipů')}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  <T>{`Vysoká úspěšnost u nízkých kurzů neznamená zisk. Když tip s kurzem 1,40 vyjde v 70 % případů, je to zhruba nula, a sázkovky navíc nabízejí kurzy o svou marži nižší.`}</T>
                </p>
              </div>
            )}

            <div className="bg-[#0a1715] border border-gray-800/80 p-5 rounded-2xl space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white">{tr('Kalibrace: dá se šancím věřit?')}</h3>
                <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                  <T>{`Když model řekne „60 %", mělo by se to stát zhruba v 60 % případů. Čím blíž je zelená čára přerušované úhlopříčce, tím lépe. Pod úhlopříčkou je model příliš sebejistý, nad ní příliš opatrný. Větší tečka znamená víc předpovědí.`}</T>
                </p>
              </div>
              <CalibrationChart data={d.calibration} />
            </div>

            <div className="bg-[#0a1715] border border-gray-800/80 p-5 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-3"><T>{`Po soutěžích`}</T></h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 text-left">
                    <th className="py-1.5 pr-3 font-semibold"><T>{`Soutěž`}</T></th><th className="pr-3 font-semibold"><T>{`Zápasů`}</T></th><th className="pr-3 font-semibold">{tr('Trefa (model)')}</th><th className="pr-3 font-semibold">{tr('Trefa (naivní)')}</th><th className="font-semibold"><T>{`Log-loss model / naivní`}</T></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-800/70">
                    {d.leagues.map((l: any) => (
                      <tr key={l.code} className="text-gray-200">
                        <td className="py-1.5 pr-3 font-semibold text-white">{tr(NAMES[l.code] || l.code)}</td>
                        <td className="pr-3 font-mono">{l.n}</td>
                        <td className="pr-3 font-mono">{pc((l.model ?? l.full).accuracy, 0)}</td>
                        <td className="pr-3 font-mono">{pc(l.baseline.accuracy, 0)}</td>
                        <td className={`font-mono ${(l.model ?? l.full).logLoss < l.baseline.logLoss ? 'text-emerald-300' : 'text-red-400'}`}>{(l.model ?? l.full).logLoss.toFixed(3)} / {l.baseline.logLoss.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 leading-relaxed bg-[#14292a] border border-gray-800/80 rounded-2xl p-5 space-y-1.5">
              <p><b className="text-gray-200"><T>{`Co tahle stránka neříká.`}</T></b> <T>{`Neměří zisk. K tomu bychom potřebovali historické kurzy sázkovek, které v aplikaci nemáme. Sázkovky mají víc informací než náš model (sestavy, zranění), takže jim většinou odpovídají přesněji.`}</T></p>
              <p><b className="text-gray-200"><T>{`Základní vs. vylepšený.`}</T></b> <T>{`Výchozí je ten, který vyšel lépe. Přepnout jde v`}</T> <span className="font-mono"><T>{`.env.local`}</T></span> <T>{`pomocí`}</T> <span className="font-mono">MODEL_PROFILE=basic</span> <T>{`nebo`}</T> <span className="font-mono"><T>{`full`}</T></span>.</p>
              <p><T>{`První zápasy každé soutěže se jen učí a do ověření se nepočítají. Čísla se mění, jak se hrají další zápasy.`}</T></p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
