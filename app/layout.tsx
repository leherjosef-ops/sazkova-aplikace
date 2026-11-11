import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import SiteGuards from "@/components/SiteGuards";
import Toaster from "@/components/Toaster";
import MobileNav from "@/components/MobileNav";
import { LangProvider } from "@/lib/i18n";
import { T } from '@/lib/i18n';

const body = Barlow({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "ApexOdds – statistické předpovědi a kurzy", template: "%s | ApexOdds" },
  description: "Poissonův model, porovnání kurzů sázkových kanceláří a přehled tvých tiketů. Odhady nejsou záruka výhry.",
};

export const viewport: Viewport = { themeColor: "#0c1c19", colorScheme: "dark" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="cs"
      className={`${body.variable} ${display.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col pb-16 lg:pb-0 bg-[#0c1c19] text-slate-100 selection:bg-amber-500 selection:text-black">
        <LangProvider>
        <SiteGuards />
        <Toaster />
        {children}
        <footer className="mt-auto border-t border-gray-800 px-6 py-5 text-center text-xs text-gray-400">
          <T>{`Pouze 18+. Hazardní hry mohou způsobit závislost. Modelové šance nejsou záruka výhry, sázej jen tolik, o co můžeš přijít.`}</T>
          <span className="block mt-2 space-x-4">
            <Link href="/terms" className="underline hover:text-white"><T>{`Podmínky použití`}</T></Link>
            <Link href="/privacy" className="underline hover:text-white"><T>{`Ochrana osobních údajů`}</T></Link>
            <Link href="/responsible" className="underline hover:text-white"><T>{`Odpovědné hraní`}</T></Link>
            <Link href="/model" className="underline hover:text-white"><T>{`Jak dobrý je model`}</T></Link>
          </span>
        </footer>
        <MobileNav />
        </LangProvider>
      </body>
    </html>
  );
}