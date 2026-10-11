import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_NAME = '@aituber-onair/core-example-node-newsdesk';

/** Works from source files and the split ESM build without relying on cwd. */
export function resolveProjectRoot(
  startDir = path.dirname(fileURLToPath(import.meta.url)),
): string {
  let current = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(current, 'package.json');
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as {
        name?: string;
      };
      if (parsed.name === PACKAGE_NAME) return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Could not locate the ${PACKAGE_NAME} project root.`);
}

export function promptPath(): string {
  return path.join(resolveProjectRoot(), 'prompts', 'newsdesk.md');
}

export function resolveFrom(baseFile: string, value: string): string {
  return path.resolve(path.dirname(baseFile), value);
}
