import LegalPage from '@/components/LegalPage';
import { OPERATOR as O } from '@/lib/operator';

export const metadata = { title: 'Podmínky použití' };

export default function Terms() {
  return (
    <LegalPage title="Podmínky použití">
      <p>
        Provozovatelem služby {O.site} je {O.name}, IČO {O.ico}, se sídlem {O.address} ({O.registration}). Kontakt: {O.email}.
        Používáním služby nebo registrací souhlasíš s těmito podmínkami.
      </p>

      <h2>1. Co služba je</h2>
      <p>
        {O.site} je webová aplikace se statistickými odhady výsledků fotbalových zápasů. Odhady počítá matematický model z veřejně dostupných výsledků
        a porovnává je s kurzy sázkových kanceláří převzatými od třetích stran. Služba také umožňuje zapisovat si vlastní tikety a sledovat osobní statistiky.
      </p>

      <h2>2. Co služba není</h2>
      <ul>
        <li>Nepřijímáme sázky a nezprostředkováváme jejich uzavírání. Nesázíme za tebe.</li>
        <li>Nedržíme ani nevyplácíme žádné výhry a neorganizujeme soutěže ani hry o ceny.</li>
        <li>Služba neobsahuje placené odkazy na provozovatele sázek ani od nich nepobíráme provizi.</li>
        <li>Odhady nejsou investiční, finanční ani jiné poradenství a nejsou doporučením, na co vsadit.</li>
        <li>Částky, které si zapisuješ, slouží jen k tvé vlastní evidenci.</li>
      </ul>

      <h2>3. Žádné záruky</h2>
      <p>
        Odhady vycházejí z jednoduchého modelu, který nezná sestavy, zranění ani další okolnosti zápasů, a jsou jen pravděpodobnostmi, nikoli jistotou.
        Jak model dopadl při zpětném ověření, vidíš na stránce Model. Kurzy a data třetích stran se mohou zpozdit nebo být chybná.
        Za rozhodnutí o sázení a za případné ztráty z nich odpovídáš ty.
      </p>

      <h2>4. Věk a odpovědné hraní</h2>
      <p>
        Službu smí používat jen osoby starší 18 let. Věk potvrzuješ při první návštěvě a při registraci. Hazardní hry mohou způsobit závislost.
        V profilu si můžeš nastavit měsíční limit a pauzu, kontakty na pomoc najdeš na stránce <a href="/responsible">Odpovědné hraní</a>.
      </p>

      <h2>5. Účet</h2>
      <p>
        K plné funkci je nutná registrace e-mailem nebo přes účet Google. Za bezpečnost hesla a za činnost na svém účtu odpovídáš ty.
        Přístup nesmíš sdílet s dalšími osobami. Účet můžeš kdykoli zrušit na požádání na {O.email}.
      </p>

      <h2>6. VIP předplatné a platba</h2>
      <ul>
        <li>Cena: {O.price}. {O.vat}</li>
        <li>Platba probíhá kartou přes platební bránu Stripe. Údaje o kartě nevidíme ani neukládáme.</li>
        <li>Předplatné se každý měsíc automaticky obnovuje, dokud ho nezrušíš.</li>
        <li>Zrušit ho můžeš kdykoli v profilu přes tlačítko „Spravovat nebo zrušit předplatné". VIP přístup ti zůstane do konce zaplaceného období a další platba se už nestrhne.</li>
        <li>Před platbou ti Stripe zobrazí cenu a opakování platby. Platbou potvrzuješ souhlas s těmito podmínkami.</li>
      </ul>

      <h2>7. Odstoupení od smlouvy a vrácení peněz</h2>
      <p>
        Jako spotřebitel máš ze zákona právo odstoupit od smlouvy do 14 dnů. Protože VIP přístup poskytujeme ihned po zaplacení jako digitální obsah,
        při platbě výslovně souhlasíš se zahájením plnění před uplynutím lhůty a bereš na vědomí, že tím právo na odstoupení v rozsahu
        již poskytnutého plnění ztrácíš. Zaplacené období se proto zpravidla nevrací. Zákonné nároky spotřebitele tím nejsou dotčeny.
        Pokud došlo k chybě na naší straně (například platba bez poskytnutí přístupu, dvojí platba), napiš na {O.email} a vrátíme platbu.
      </p>

      <h2>8. Dostupnost a změny služby</h2>
      <p>
        Službu poskytujeme tak, jak je, a nezaručujeme nepřetržitou dostupnost. Fungování může omezit výpadek dodavatelů dat. Službu i tyto podmínky můžeme měnit.
        O podstatných změnách a o změně ceny tě budeme předem informovat e-mailem a máš právo předplatné před změnou zrušit.
      </p>

      <h2>9. Zakázané použití</h2>
      <p>Nesmíš automaticky stahovat data služby, obcházet limity, sdílet přístup ani službu používat způsobem, který poškozuje nás nebo ostatní uživatele. Při porušení můžeme účet zablokovat.</p>

      <h2>10. Odpovědnost</h2>
      <p>
        V rozsahu, který zákon dovoluje, neneseme odpovědnost za škodu vzniklou použitím odhadů nebo dat třetích stran. Tím není dotčena odpovědnost,
        kterou nelze vyloučit (například za újmu na zdraví nebo za škodu způsobenou úmyslně).
      </p>

      <h2>11. Stížnosti a řešení sporů</h2>
      <p>
        Stížnosti a reklamace zasílej na {O.email}, odpovíme do 30 dnů. Pokud se nedohodneme, můžeš se obrátit na mimosoudní řešení spotřebitelských sporů:
        Česká obchodní inspekce, <a href="https://www.coi.cz" rel="noopener noreferrer">www.coi.cz</a>.
      </p>

      <h2>12. Závěrečná ustanovení</h2>
      <p>Smlouva se řídí právem České republiky. Tyto podmínky platí od data uvedeného níže.</p>
    </LegalPage>
  );
}
