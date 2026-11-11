import AppHeader from '@/components/AppHeader';

// Hlavička pro stránky bez vlastního přihlašování (právní stránky).
export default function SiteHeader({ active }: { active?: string }) {
  return <AppHeader active={active} />;
}
