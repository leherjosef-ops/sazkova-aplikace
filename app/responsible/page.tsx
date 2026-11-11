import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Odpovědné hraní' };

export default function Responsible() {
  return (
    <LegalPage title="Odpovědné hraní">
      <p>
        Sázení má být zábava, ne zdroj příjmu. Žádný model ani odhad nezaručí výhru a sázkové kanceláře mají v kurzech zabudovanou marži,
        takže se při dlouhodobém sázení prodělává. ApexOdds nepřijímá sázky, poskytuje jen statistické odhady. Hazardní hry jsou jen pro osoby starší 18 let.
      </p>

      <h2>Základní pravidla</h2>
      <ul>
        <li>Sázej jen peníze, o které se bez problému můžeš přijít.</li>
        <li>Předem si urči částku na měsíc a nepřekračuj ji. V profilu si můžeš nastavit měsíční limit a aplikace tě upozorní, než ho překročíš.</li>
        <li>Neprodělané peníze si nezkoušej „vyhrát zpátky".</li>
        <li>Nesázej pod vlivem alkoholu, ve stresu nebo když jsi naštvaný.</li>
        <li>Dělej si pauzy. V profilu si můžeš nastavit pauzu na 24 hodin, týden nebo měsíc, během ní se tikety neukládají.</li>
      </ul>

      <h2>Varovné signály</h2>
      <ul>
        <li>Přemýšlíš o sázení i mimo hru a těžko se soustředíš na jiné věci.</li>
        <li>Sázíš víc, než jsi chtěl, nebo se snažíš ztráty dohnat.</li>
        <li>Půjčuješ si peníze, lžeš okolí nebo tě sázení stresuje.</li>
      </ul>

      <h2>Kde najdeš pomoc v Česku</h2>
      <ul>
        <li>
          <b>Národní linka pro odvykání hraní:</b> <a href="tel:800350000">800 35 00 00</a>, pondělí až pátek 10:00 až 18:00, bezplatná.
          E-mail: poradte@chciodvykat.cz, informace: <a href="https://www.hazardni-hrani.cz" rel="noopener noreferrer">hazardni-hrani.cz</a>.
        </li>
        <li>
          <b>Linka pomoci Naberte kurz:</b> <a href="tel:+420777477877">+420 777 477 877</a>, nepřetržitě, a on-line poradna na{' '}
          <a href="https://www.nabertekurz.cz" rel="noopener noreferrer">nabertekurz.cz</a>.
        </li>
        <li>
          <b>Mapa pomoci</b> s poradnami ve tvém okolí: <a href="https://www.zodpovednehrani.cz/mapa-pomoci" rel="noopener noreferrer">zodpovednehrani.cz/mapa-pomoci</a>.
        </li>
        <li>
          <b>Rejstřík vyloučených osob (RVO):</b> můžeš se na vlastní žádost nechat zapsat do rejstříku Ministerstva financí a tím si zablokovat vstup do licencovaných sázkových kanceláří.
          Informace na <a href="https://mf.gov.cz" rel="noopener noreferrer">mf.gov.cz</a>.
        </li>
      </ul>
      <p>Pokud ti hrozí bezprostřední nebezpečí, volej tísňovou linku 112.</p>
    </LegalPage>
  );
}
