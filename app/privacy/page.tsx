import LegalPage from '@/components/LegalPage';
import { OPERATOR as O } from '@/lib/operator';

export const metadata = { title: 'Ochrana osobních údajů' };

export default function Privacy() {
  return (
    <LegalPage title="Ochrana osobních údajů">
      <p>
        Správcem osobních údajů je {O.name}, IČO {O.ico}, se sídlem {O.address}. Kontakt: {O.email}.
        Údaje zpracováváme v souladu s nařízením GDPR a zákonem o zpracování osobních údajů.
      </p>

      <h2>Jaké údaje zpracováváme</h2>
      <ul>
        <li>E-mail a heslo (heslo ukládáme jen zašifrované) nebo e-mail a základní údaje z účtu Google, pokud se přihlásíš přes Google.</li>
        <li>Tvoje uložené tikety, zapsané částky, osobní limity a pauzy, abys je viděl v profilu.</li>
        <li>Stav předplatného a identifikátor zákazníka u platební brány. Údaje o kartě zpracovává výhradně Stripe, my je nevidíme ani neukládáme.</li>
        <li>Technické údaje (například adresa IP, čas a typ požadavku) v provozních záznamech serveru a při platbě.</li>
        <li>V úložišti prohlížeče si pamatujeme potvrzení věku, zvolený jazyk a údaje o přihlášení. Reklamní ani analytické sledování nepoužíváme.</li>
      </ul>

      <h2>Proč a na jakém základě</h2>
      <ul>
        <li>Poskytnutí služby a předplatného, správa účtu: plnění smlouvy (čl. 6 odst. 1 písm. b GDPR).</li>
        <li>Účetní a daňové povinnosti: plnění právní povinnosti (písm. c).</li>
        <li>Zabezpečení služby, předcházení zneužití a vyřizování stížností: oprávněný zájem (písm. f).</li>
      </ul>

      <h2>Komu údaje předáváme</h2>
      <ul>
        <li>Supabase (databáze a přihlášení), Stripe (platby), Railway (hosting aplikace) a případně Google (přihlášení přes účet Google).</li>
        <li>Poskytovatelé dat o zápasech a kurzech (football-data.org, The Odds API) o tobě žádné údaje nedostávají.</li>
        <li>Někteří zpracovatelé sídlí nebo ukládají data mimo Evropskou unii (například v USA). Předání probíhá na základě standardních smluvních doložek nebo rozhodnutí o odpovídající ochraně.</li>
      </ul>

      <h2>Jak dlouho údaje uchováváme</h2>
      <p>
        Údaje o účtu po dobu jeho existence a po jeho zrušení je vymažeme, s výjimkou těch, které musíme ze zákona uchovat (například doklady o platbách po dobu stanovenou
        účetními a daňovými předpisy, obvykle 10 let).
      </p>

      <h2>Tvoje práva</h2>
      <p>
        Máš právo na přístup k údajům, opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku. Napiš na {O.email}.
        Máš také právo podat stížnost u Úřadu pro ochranu osobních údajů (<a href="https://www.uoou.gov.cz" rel="noopener noreferrer">www.uoou.gov.cz</a>).
      </p>
    </LegalPage>
  );
}
