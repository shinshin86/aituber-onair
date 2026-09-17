import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

it('keeps Node modules outside the root and web local import graphs', () => {
  const seen = new Set<string>();
  function visit(file: string) {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    const imports = source.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g);
    for (const match of imports) {
      const specifier = match[2];
      expect(specifier.startsWith('node:')).toBe(false);
      if (!specifier.startsWith('.')) continue;
      const next = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
      expect(next.includes('/src/node/')).toBe(false);
      visit(next);
    }
  }
  visit(resolve('src/index.ts'));
  visit(resolve('src/web.ts'));
  expect(seen.size).toBeGreaterThan(10);
});
