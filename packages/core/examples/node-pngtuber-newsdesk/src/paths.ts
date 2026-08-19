import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PACKAGE_NAME = '@aituber-onair/core-example-node-pngtuber-newsdesk';

let cachedRoot: string | null = null;

/**
 * Locate the example root (the directory holding `package.json`, `assets/`,
 * and `prompts/`). The CLI runs from a bundled `dist/*.cjs` while tests import
 * the TypeScript sources directly, so the root is discovered by walking up
 * from the current module instead of assuming a fixed depth.
 */
export function resolveProjectRoot(startDir: string = __dirname): string {
  if (cachedRoot) return cachedRoot;
  let current = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(current, 'package.json');
    if (existsSync(candidate)) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as {
          name?: string;
        };
        if (parsed.name === PACKAGE_NAME) {
          cachedRoot = current;
          return current;
        }
      } catch {
        // Ignore unreadable package.json files and keep walking up.
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Could not locate the ${PACKAGE_NAME} project root.`);
}

export function defaultAvatarPath(): string {
  return path.join(resolveProjectRoot(), 'assets', 'avatar');
}

export function promptPath(): string {
  return path.join(resolveProjectRoot(), 'prompts', 'newsdesk.md');
}

/** Resolve `value` relative to the directory of `baseFile`. */
export function resolveFrom(baseFile: string, value: string): string {
  if (path.isAbsolute(value)) return value;
  return path.resolve(path.dirname(baseFile), value);
}
