import { join } from 'node:path';
import { createJsonStorage } from './jsonStorage';

export { createJsonStorage };
export type { JsonStorage, JsonStorageOptions } from './jsonStorage';

export function createDefaultJsonStorage() {
  return createJsonStorage({ baseDir: join(process.cwd(), 'data') });
}
