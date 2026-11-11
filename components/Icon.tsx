// Jednotná sada ikon (čárové SVG). Na rozdíl od emoji vypadají stejně na všech zařízeních a berou barvu z textu.
type Name =
  | 'home' | 'ball' | 'flame' | 'sparkles' | 'history' | 'user' | 'chart' | 'bookmark' | 'spinner'
  | 'lock' | 'star' | 'clock' | 'search' | 'alert' | 'check' | 'x' | 'login' | 'bolt' | 'info' | 'trend';

const P: Record<Name, React.ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></>,
  ball: <><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 4.5h-5L8 10z" /><path d="M12 7V3.5M16 10l3.5-1.2M14.5 14.5l2 3M9.5 14.5l-2 3M8 10 4.5 8.8" /></>,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.7 2.3-4.8.3 1.6 1.2 2.6 2.2 2.8-.6-2.6-.3-5.3.5-8z" />,
  sparkles: <><path d="M10 3.5 11.6 8 16 9.5l-4.4 1.6L10 15.5l-1.6-4.4L4 9.5 8.4 8z" /><path d="M17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 4v4.5h4.5" /><path d="M12 7.5V12l3 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.2-4 4.2-6 8-6s6.8 2 8 6" /></>,
  chart: <><path d="M4 20h16" /><path d="M7 16v-5M12 16V7M17 16v-8" /></>,
  bookmark: <><path d="M6 3.5h12V21l-6-4-6 4z" /><path d="M12 7.5v5M9.5 10h5" /></>,
  spinner: <path d="M12 3a9 9 0 1 0 9 9" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  alert: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 9.5v4.5M12 17h.01" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  login: <><path d="M14 4h5v16h-5" /><path d="M3 12h11M10 8l4 4-4 4" /></>,
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5h.01" /></>,
  trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
};

export default function Icon({ name, className = 'w-4 h-4', title }: { name: Name; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 ${name === 'spinner' ? 'animate-spin ' : ''}${className}`} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {P[name]}
    </svg>
  );
}
