'use client';

import { useEffect, useState } from 'react';
import { T, tr, loc } from '@/lib/i18n';
import { authFetch } from '@/lib/auth-fetch';

const pc = (x: number) => `${Math.round(x * 100)}%`;
const day = (d: string) => new Date(d).toLocaleDateString(loc(), { day: 'numeric', month: 'numeric', year: '2-digit' });
const CHIP: Record<string, string> = {
  W: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40',
  D: 'bg-gray-500/25 text-gray-200 border-gray-500/40',
  L: 'bg-red-500/25 text-red-400 border-red-500/40',
};
const CZ: Record<string, string> = { W: 'V', D: 'R', L: 'P' };

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0a1715] border border-gray-800/80 p-5 rounded-2xl space-y-3">
      <div>
        <h4 className="text-xs font-bold text-gray-200">{title}</h4>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SplitBar({ a, b, c, labels }: { a: number; b: number; c: number; labels: [string, string, string] }) {
  const t = a + b + c || 1;
  const seg = (v: number, cls: string, l: string) => (
    <div className={`${cls} h-full flex items-center justify-center text-[11px] font-bold text-black/80 min-w-[2rem]`} style={{ width: `${(v / t) * 100}%` }} title={`${l}: ${v}`}>
      {v > 0 ? (v <= 1 && a + b + c <= 1.01 ? pc(v) : v) : ''}
    </div>
  );
  return (
    <div>
      <div className="flex h-7 rounded-lg overflow-hidden border border-gray-800">
        {seg(a, 'bg-amber-400', labels[0])}
        {seg(b, 'bg-gray-400', labels[1])}
        {seg(c, 'bg-sky-400', labels[2])}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{labels[0]}</span><span>{labels[1]}</span><span>{labels[2]}</span>
      </div>
    </div>
  );
}

function Form({ name, f }: { name: string; f: any }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-white">{name}</span>
        <span className="text-[10px] text-gray-400 font-mono">∅ {f.avgFor} {tr('vstřelených')} / {f.avgAgainst} {tr('inkasovaných')}</span>
      </div>
      <div className="flex gap-1.5">
        {f.last5.length === 0 && <span className="text-[11px] text-gray-500"><T>{`Zatím žádné odehrané zápasy.`}</T></span>}
        {[...f.last5].reverse().map((m: any, i: number) => (
          <span key={i} title={`${day(m.date)} · ${m.home ? tr('doma') : tr('venku')} ${tr('proti')} ${m.opponent} ${m.gf}:${m.ga}`}
            className={`w-8 h-8 rounded-lg border text-[11px] font-black flex items-center justify-center ${CHIP[m.result]}`}>
            {CZ[m.result]}
          </span>
        ))}
        <span className="text-[10px] text-gray-500 self-center ml-1"><T>{`starší → novější`}</T></span>
      </div>
    </div>
  );
}

export default function MatchAnalysis({ matchId }: { matchId: number | string }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    setD(null); setErr('');
    authFetch(`/api/match-analysis?id=${matchId}`)
      .then((r) => r.json())
      .then((j) => { if (!live) return; j.success ? setD(j) : setErr(j.error ? tr(j.error) : tr('Analýzu se nepodařilo načíst.')); })
      .catch(() => live && setErr(tr('Analýzu se nepodařilo načíst. Zkus to za chvíli.')));
    return () => { live = false; };
  }, [matchId]);

  if (err) return <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-4">{err}</div>;
  if (!d) return <div className="text-xs text-gray-400 p-4"><T>{`Načítám rozbor zápasu…`}</T></div>;

  const m = d.model;
  const maxP = Math.max(...d.matrix.flat());
  const maxL = Math.max(m.lambdaHome, m.lambdaAway, 0.1);

  return (
    <div className="space-y-4">
      <Card title={tr("Kdo je podle modelu favorit")} hint={`${tr("Šance na výsledek po 90 minutách. Model se učil z")} ${m.sample} ${tr("odehraných zápasů soutěže.")}`}>
        <SplitBar a={m.homeWin} b={m.draw} c={m.awayWin} labels={[`${d.homeName} ${tr('vyhraje')}`, tr('Remíza'), `${d.awayName} ${tr('vyhraje')}`]} />
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#14292a] rounded-xl p-3 border border-gray-800"><T>{`Oba týmy dají gól`}</T> <b className="text-amber-400 font-mono float-right">{pc(m.btts)}</b></div>
          <div className="bg-[#14292a] rounded-xl p-3 border border-gray-800"><T>{`Více než 2,5 gólu`}</T> <b className="text-amber-400 font-mono float-right">{pc(m.over25)}</b></div>
        </div>
      </Card>

      <Card title={tr("Očekávaný počet gólů")} hint={`${tr('Průměr soutěže:')} ${m.leagueAvgHome} ${tr('gólu domácích a')} ${m.leagueAvgAway} ${tr('hostů na zápas. Čím víc nad průměrem, tím silnější útok proti slabé obraně.')}`}>
        {[[d.homeName, m.lambdaHome, 'bg-amber-400'], [d.awayName, m.lambdaAway, 'bg-sky-400']].map(([n, v, c]: any) => (
          <div key={n} className="flex items-center gap-3 text-xs">
            <span className="w-28 truncate text-gray-200">{n}</span>
            <div className="flex-1 h-3 bg-[#14292a] rounded-full overflow-hidden"><div className={`${c} h-full rounded-full`} style={{ width: `${(v / maxL) * 100}%` }} /></div>
            <b className="w-10 text-right font-mono text-white">{v}</b>
          </div>
        ))}
      </Card>

      <Card title={tr("Forma a sezóna")} hint={tr("Posledních 5 zápasů v soutěži: V = výhra, R = remíza, P = prohra. Najeď myší na kolečko pro soupeře a skóre.")}>
        <Form name={d.homeName} f={d.form.home} />
        <Form name={d.awayName} f={d.form.away} />
      </Card>

      <Card title={tr("Nejpravděpodobnější skóre")} hint={`${tr('Řádky = góly')} ${d.homeName}, ${tr('sloupce = góly')} ${d.awayName}. ${tr('Světlejší políčko = pravděpodobnější výsledek.')}`}>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(6, minmax(0, 1fr))' }}>
          <span />
          {[0, 1, 2, 3, 4, 5].map((j) => <span key={j} className="text-[10px] text-gray-400 text-center font-mono">{j}</span>)}
          {d.matrix.map((row: number[], i: number) => (
            <div key={i} className="contents">
              <span className="text-[10px] text-gray-400 font-mono pr-1 self-center">{i}</span>
              {row.map((p, j) => (
                <div key={j} title={`${i}:${j} – ${(p * 100).toFixed(1)} %`} className="aspect-square rounded flex items-center justify-center text-[10px] font-mono"
                  style={{ backgroundColor: `rgba(95,220,151,${0.08 + (p / maxP) * 0.85})`, color: p / maxP > 0.5 ? '#0c1c19' : '#d3ded6' }}>
                  {p >= 0.02 ? Math.round(p * 100) : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400"><T>{`Nejčastější:`}</T> {d.topScores.map((s: any) => `${s.home}:${s.away} (${(s.prob * 100).toFixed(0)} %)`).join(', ')}<T>{`. Čísla v mřížce jsou procenta.`}</T></p>
      </Card>

      <Card title={tr("Vzájemné zápasy")} hint={d.h2h.source === 'head2head' ? tr('Posledních až 10 vzájemných zápasů ve všech soutěžích.') : tr('Zdroj vzájemných zápasů nebyl dostupný, ukazuji jen zápasy z letošní sezóny soutěže.')}>
        {d.h2h.total === 0 ? (
          <p className="text-xs text-gray-400"><T>{`Tyhle týmy spolu v dostupných datech ještě nehrály.`}</T></p>
        ) : (
          <>
            <SplitBar a={d.h2h.homeWins} b={d.h2h.draws} c={d.h2h.awayWins} labels={[`${d.homeName} ${tr('vyhrál')}`, tr('Remíz'), `${d.awayName} ${tr('vyhrál')}`]} />
            <p className="text-[11px] text-gray-300">{tr('Průměr')} {d.h2h.avgGoals} {tr('gólu na zápas z')} {d.h2h.total} {tr('zápasů.')}</p>
            <div className="divide-y divide-gray-800/70 text-xs">
              {d.h2h.matches.slice(0, 6).map((x: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-gray-400 font-mono w-16 shrink-0">{day(x.date)}</span>
                  <span className="flex-1 truncate text-gray-200">{x.home} – {x.away}</span>
                  <b className="font-mono text-white">{x.hg}:{x.ag}</b>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
      <p className="text-[11px] text-gray-500 leading-snug"><T>{`Model zná jen výsledky a góly. Nevidí sestavy, zranění ani přesvědčivost výkonů, takže ber čísla jako orientaci, ne jistotu.`}</T></p>
    </div>
  );
}

export function ValueExplainer() {
  return (
    <div className="bg-[#14292a] border border-amber-500/20 p-5 rounded-2xl space-y-2 text-xs text-gray-200 leading-relaxed">
      <h4 className="font-bold text-amber-400"><T>{`Co znamená „Value“ (třeba −12 %)`}</T></h4>
      <p><T>{`Je to průměrný zisk (+) nebo ztráta (−) na každých vsazených 100 Kč, kdyby sis stejnou sázku zopakoval mnohokrát. Vzorec:`}</T> <span className="font-mono"><T>{`šance × kurz − 1`}</T></span>.</p>
      <p>Příklad: šance 45 % a kurz 1,90 dává 0,45 × 1,90 − 1 = −14,5 %. V průměru bys na 100 Kč prodělal asi 14,50 Kč. Hodnota +5 % by naopak znamenala průměrný zisk 5 Kč.</p>
      <ul className="list-disc pl-5 space-y-1 text-gray-300">
        <li><T>{`Většina tipů vychází záporně, protože sázkovka má v kurzech svou marži. To je normální.`}</T></li>
        <li><T>{`Šance v tomhle výpočtu je průměr našeho modelu a trhu (kurzů sázkovek bez marže), protože samotný model je hrubý.`}</T></li>
        <li><T>{`⚠ „model ≠ trh“ značí tip, kde se model a trh liší o víc než 10 procentních bodů. Častěji je chyba v modelu než příležitost.`}</T></li>
        <li><T>{`Value je odhad, ne záruka. I tip s kladným číslem může jednotlivě prohrát.`}</T></li>
      </ul>
    </div>
  );
}
