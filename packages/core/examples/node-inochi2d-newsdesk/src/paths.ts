import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PACKAGE_NAME = '@aituber-onair/core-example-node-inochi2d-newsdesk';

let cachedRoot: string | null = null;

/**
 * Locate the example root (the directory holding `package.json`, `harness/`,
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

export const AVATAR_PATH_PLACEHOLDER = '/path/to/inochi2d/models/avatar.inx';
export const AVATAR_MOTION_PATH_PLACEHOLDER =
  '/path/to/inochi2d/models/avatar.motion.json';
export const INOCHI2D_RUNTIME_PATH_PLACEHOLDER = '/path/to/inochi2d/runtime';

export function promptPath(): string {
  return path.join(resolveProjectRoot(), 'prompts', 'newsdesk.md');
}

/** Expand a leading `~` without accepting other users' home shortcuts. */
export function expandHomePath(value: string): string {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

/** Resolve `value` relative to `baseFile`, expanding the current user's `~`. */
export function resolveFrom(baseFile: string, value: string): string {
  const expanded = expandHomePath(value);
  if (path.isAbsolute(expanded)) return expanded;
  return path.resolve(path.dirname(baseFile), expanded);
}
