import { readFileSync } from 'node:fs';

const browserEntrySources = [
  '../src/index.ts',
  '../src/errors.ts',
  '../src/types.ts',
  '../src/chat.ts',
] as const;

describe('browser entry boundary', () => {
  it.each(browserEntrySources)(
    '%s has no Node.js built-in imports',
    (relativePath) => {
      const source = readFileSync(
        new URL(relativePath, import.meta.url),
        'utf8'
      );

      expect(source).not.toMatch(
        /(?:from\s+|import\s*\(|require\s*\()\s*['"]node:/
      );
    }
  );
});
