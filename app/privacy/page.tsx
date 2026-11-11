import LegalPage from '@/components/LegalPage';

export const metadata = { title: 'Ochrana osobních údajů' };

export default function Privacy() {
  return (
    <LegalPage title="Ochrana osobních údajů">
      <p>Správcem osobních údajů je [jméno / název, IČO, adresa, e-mail].</p>
      <h2>Jaké údaje zpracováváme</h2>
      <ul>
        <li>E-mail a heslo (heslo ukládáme jen v zašifrované podobě) pro přihlášení.</li>
        <li>Tvoje uložené tikety, vsazené částky, osobní limity a pauzy, abys je viděl v profilu.</li>
        <li>Stav předplatného a identifikátor zákazníka u platební brány. Údaje o kartě zpracovává výhradně Stripe, my je nevidíme ani neukládáme.</li>
        <li>V prohlížeči si pamatujeme potvrzení věku (úložiště prohlížeče). Žádné reklamní sledování nepoužíváme.</li>
      </ul>
      <h2>Proč a na jakém základě</h2>
      <p>Abychom ti mohli poskytnout službu a předplatné (plnění smlouvy), a plnili zákonné povinnosti, například účetní. [Doplnit právní tituly.]</p>
      <h2>Komu údaje předáváme</h2>
      <ul>
        <li>Supabase (databáze a přihlášení), Stripe (platby), poskytovatel hostingu [doplnit].</li>
        <li>Zdroje zápasů a kurzů (football-data.org, The Odds API) o tobě žádné údaje nedostávají.</li>
      </ul>
      <h2>Jak dlouho</h2>
      <p>Po dobu existence účtu. Po jeho smazání údaje odstraníme, kromě těch, které musíme uchovat ze zákona. [Doplnit lhůty.]</p>
      <h2>Tvoje práva</h2>
      <p>Máš právo na přístup, opravu, výmaz, omezení zpracování, přenositelnost a vznést námitku. Napiš na [e-mail]. Můžeš také podat stížnost u Úřadu pro ochranu osobních údajů.</p>
    </LegalPage>
  );
}
