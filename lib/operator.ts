// Údaje o provozovateli. Vyplň je jednou tady, doplní se do podmínek, ochrany údajů i odpovědného hraní.
// Dokud některé pole začíná znakem "[", zobrazuje se na právních stránkách upozornění na šablonu.
export const OPERATOR = {
  name: '[jméno a příjmení nebo název firmy]',
  ico: '[IČO]',
  address: '[adresa sídla / místa podnikání]',
  email: '[kontaktní e-mail]',
  registration: '[např. Fyzická osoba zapsaná v živnostenském rejstříku / společnost zapsaná v obchodním rejstříku u ...]',
  vat: '[DPH: např. Nejsme plátci DPH. / Ceny jsou včetně DPH.]',
  price: '199 Kč měsíčně',
  site: 'ApexOdds',
};

export const operatorIncomplete = Object.values(OPERATOR).some((v) => v.startsWith('['));
