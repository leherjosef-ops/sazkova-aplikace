import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Podmínky použití' };

export default function Terms() {
  return (
    <LegalPage title="Podmínky použití">
      <p>Provozovatelem služby ApexOdds je [jméno / název, IČO, adresa, e-mail]. Používáním služby souhlasíš s těmito podmínkami.</p>
      <h2>1. Co služba je a co není</h2>
      <p>ApexOdds je informační a analytický nástroj. Zobrazuje statistické odhady výsledků fotbalových zápasů a kurzy sázkových kanceláří převzaté od třetích stran. Neprovozuje sázky, nepřijímá sázky a nikdy nesází za tebe. Částky, které si v aplikaci zapisuješ, slouží jen k tvé vlastní evidenci.</p>
      <h2>2. Žádné záruky</h2>
      <p>Odhady vycházejí z jednoduchého statistického modelu, který nezná sestavy, zranění ani další okolnosti zápasů. Nejsou radou ani zárukou výhry. Jak model dopadl při zpětném ověření, vidíš na stránce Jak dobrý je model. Kurzy a data třetích stran se mohou zpozdit nebo být chybná. Za ztráty z tvých sázek neneseme odpovědnost.</p>
      <h2>3. Věk a odpovědné hraní</h2>
      <p>Službu smí používat jen osoby starší 18 let. Hazardní hry mohou způsobit závislost. Víc najdeš na stránce Odpovědné hraní.</p>
      <h2>4. VIP předplatné</h2>
      <ul>
        <li>Cena: [199 Kč měsíčně / dle aktuálního ceníku], platba kartou přes Stripe.</li>
        <li>Předplatné se prodlužuje automaticky. Zrušit ho můžeš kdykoli v profilu přes zákaznický portál, platí do konce zaplaceného období.</li>
        <li>[Doplnit podmínky vrácení peněz a odstoupení od smlouvy u digitálního obsahu podle platné legislativy.]</li>
      </ul>
      <h2>5. Účet</h2>
      <p>Za bezpečnost svého hesla odpovídáš ty. Účet můžeme zablokovat při zneužití služby (například automatizovaném stahování dat nebo sdílení přístupu).</p>
      <h2>6. Změny</h2>
      <p>Podmínky i službu můžeme měnit. O podstatných změnách tě budeme informovat. Rozhodné právo: [právo České republiky]. Kontakt: [e-mail].</p>
    </LegalPage>
  );
}
