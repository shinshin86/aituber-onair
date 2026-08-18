import { readFile, rename, rm, writeFile } from 'node:fs/promises';

export interface StoredSession {
  readonly backendSessionId: string;
  readonly threadTurnCount?: number;
}

export async function readStoredSession(
  filePath: string
): Promise<StoredSession | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.backendSessionId !== 'string' ||
      !record.backendSessionId.trim()
    ) {
      return undefined;
    }
    const threadTurnCount =
      typeof record.threadTurnCount === 'number' &&
      Number.isInteger(record.threadTurnCount) &&
      record.threadTurnCount >= 0
        ? record.threadTurnCount
        : undefined;
    return {
      backendSessionId: record.backendSessionId,
      ...(threadTurnCount === undefined ? {} : { threadTurnCount }),
    };
  } catch {
    return undefined;
  }
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
