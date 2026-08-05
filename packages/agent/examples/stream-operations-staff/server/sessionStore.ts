import { readFile, rename, rm, writeFile } from 'node:fs/promises';

export interface StoredSession {
  readonly backendSessionId: string;
}

export async function readStoredSession(
  filePath: string
): Promise<StoredSession | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as StoredSession).backendSessionId === 'string' &&
      (parsed as StoredSession).backendSessionId.trim().length > 0
    ) {
      return { backendSessionId: (parsed as StoredSession).backendSessionId };
    }
  } catch {
    // Missing or malformed state means a fresh Session.
  }
  return undefined;
}

export async function writeStoredSession(
  filePath: string,
  stored: StoredSession
): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(stored, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
