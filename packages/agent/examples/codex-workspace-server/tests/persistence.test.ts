import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readStoredSession, writeStoredSession } from '../src/sessionStore.js';
import { ensureWorkspace } from '../src/workspace.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true }))
  );
});

async function createTemporaryRoot(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'codex-workspace-server-'));
  temporaryRoots.push(path);
  return path;
}

describe('workspace persistence', () => {
  it('seeds nested template files without overwriting existing files', async () => {
    const root = await createTemporaryRoot();
    const templateDir = join(root, 'template');
    const workspaceDir = join(root, 'workspace');
    await mkdir(join(templateDir, 'nested'), { recursive: true });
    await mkdir(workspaceDir, { recursive: true });
    await writeFile(join(templateDir, 'NOTES.md'), 'template notes\n');
    await writeFile(join(templateDir, 'nested', 'CHECKLIST.md'), 'check\n');
    await writeFile(join(workspaceDir, 'NOTES.md'), 'operator notes\n');

    await ensureWorkspace(workspaceDir, templateDir);

    expect(await readFile(join(workspaceDir, 'NOTES.md'), 'utf8')).toBe(
      'operator notes\n'
    );
    expect(
      await readFile(join(workspaceDir, 'nested', 'CHECKLIST.md'), 'utf8')
    ).toBe('check\n');
  });

  it('persists and validates a backend Session ID', async () => {
    const root = await createTemporaryRoot();
    const sessionFile = join(root, '.agent-session.json');

    await writeStoredSession(sessionFile, { backendSessionId: 'thread-123' });
    expect(await readStoredSession(sessionFile)).toEqual({
      backendSessionId: 'thread-123',
    });

    await writeFile(sessionFile, '{"backendSessionId":""}\n');
    expect(await readStoredSession(sessionFile)).toBeUndefined();
  });

  it.skipIf(process.platform === 'win32')(
    'rejects a workspace symlink instead of seeding outside the workspace',
    async () => {
      const root = await createTemporaryRoot();
      const templateDir = join(root, 'template');
      const workspaceDir = join(root, 'workspace');
      const outsideDir = join(root, 'outside');
      await mkdir(join(templateDir, 'nested'), { recursive: true });
      await mkdir(workspaceDir);
      await mkdir(outsideDir);
      await writeFile(join(templateDir, 'nested', 'CHECKLIST.md'), 'check\n');
      await symlink(outsideDir, join(workspaceDir, 'nested'), 'dir');

      await expect(ensureWorkspace(workspaceDir, templateDir)).rejects.toThrow(
        'must not be a symbolic link'
      );
      await expect(
        readFile(join(outsideDir, 'CHECKLIST.md'), 'utf8')
      ).rejects.toThrow();
    }
  );
});
