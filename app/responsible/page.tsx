import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Odpovědné hraní' };

export default function Responsible() {
  return (
    <LegalPage title="Odpovědné hraní">
      <p>Sázení má být zábava, ne zdroj příjmu. Žádný model ani tip nezaručí výhru a sázkovky mají v kurzech zabudovanou marži, takže se při dlouhodobém sázení prodělává.</p>
      <h2>Pár pravidel</h2>
      <ul>
        <li>Sázej jen peníze, o které se bez problému můžeš přijít.</li>
        <li>Předem si urči částku na měsíc a nepřekračuj ji. V <Link href="/profile" className="text-amber-400 underline">profilu</Link> si můžeš nastavit měsíční limit a aplikace tě upozorní, než ho překročíš.</li>
        <li>Neprodělané peníze si nezkoušej „vyhrát zpátky".</li>
        <li>Nesázej pod vlivem alkoholu, ve stresu nebo když jsi naštvaný.</li>
        <li>Dělej si pauzy. V profilu si můžeš nastavit pauzu na 24 hodin, týden nebo měsíc, během ní se tikety neukládají.</li>
      </ul>
      <h2>Varovné signály</h2>
      <ul>
        <li>Přemýšlíš o sázení i mimo hru a těžko se soustředíš na jiné věci.</li>
        <li>Sázíš víc, než jsi chtěl, nebo se snažíš ztráty dohnat.</li>
        <li>Půjčuješ si, lžeš okolí nebo tě sázení stresuje.</li>
      </ul>
      <p>Pokud poznáváš něco z toho, promluv si s někým blízkým a vyhledej odbornou pomoc u praktického lékaře nebo v adiktologických službách ve svém okolí. [Doplnit odkazy na aktuální kontakty podpůrných linek a poraden.]</p>
    </LegalPage>
  );
}
