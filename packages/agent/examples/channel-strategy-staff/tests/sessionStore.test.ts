import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readStoredSession,
  writeStoredSession,
} from '../server/sessionStore.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))
  );
});

describe('channel strategy Session store', () => {
  it('atomically round-trips the thread ID and Turn count', async () => {
    const root = await temporaryDirectory();
    const filePath = join(root, 'session.json');

    await writeStoredSession(filePath, {
      backendSessionId: 'thread-1',
      threadTurnCount: 7,
    });

    expect(await readStoredSession(filePath)).toEqual({
      backendSessionId: 'thread-1',
      threadTurnCount: 7,
    });
    expect(await readFile(filePath, 'utf8')).toContain('"threadTurnCount": 7');
  });

  it('reads the legacy ID-only format with an implicit zero count', async () => {
    const root = await temporaryDirectory();
    const filePath = join(root, 'session.json');
    await writeFile(
      filePath,
      `${JSON.stringify({ backendSessionId: 'legacy-thread' })}\n`
    );

    const stored = await readStoredSession(filePath);
    expect(stored).toEqual({ backendSessionId: 'legacy-thread' });
    expect(stored?.threadTurnCount ?? 0).toBe(0);
  });
});

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'channel-staff-session-'));
  temporaryDirectories.push(path);
  return path;
}
