// Spouští testy bez dalších závislostí (potřebuje Node 22.6+). Moduly z lib/ se zkopírují do .test-build
// s doplněnými příponami .ts v importech, aby je šlo načíst přímo v Node.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const SRC = new URL('../lib/', import.meta.url);
const OUT = new URL('../.test-build/', import.meta.url);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const f of ['poisson.ts', 'backtest.ts', 'settle.ts', 'odds.ts']) {
  const code = readFileSync(new URL(f, SRC), 'utf8').replace(/from '(\.\/[^']+)'/g, (m, p) => (p.endsWith('.ts') ? m : `from '${p}.ts'`));
  writeFileSync(new URL(f, OUT), code);
}

const tests = readdirSync(new URL('./', import.meta.url)).filter((f) => f.endsWith('.test.mjs')).map((f) => `tests/${f}`);
const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--test', ...tests], { stdio: 'inherit' });
rmSync(OUT, { recursive: true, force: true });
process.exit(r.status ?? 1);
