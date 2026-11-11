import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0c1c19] text-slate-100">
      <SiteHeader />
      <main className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
        <Link href="/" className="text-xs text-gray-400 hover:text-white">← Zpět na hlavní stránku</Link>
        <h1 className="text-2xl font-black text-white">{title}</h1>
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-xl p-4 leading-relaxed">
          Tohle je výchozí šablona, ne právní dokument. Před spuštěním pro platící zákazníky ji nech zkontrolovat právníkem a doplň údaje v hranatých závorkách.
        </div>
        <article className="space-y-4 text-sm text-gray-200 leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h2]:pt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </article>
      </main>
    </div>
  );
}
