import path from 'node:path';

export function resolveFrom(baseFile: string, value: string): string {
  return path.resolve(path.dirname(baseFile), value);
}
