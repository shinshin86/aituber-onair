import { lstat, mkdir } from 'node:fs/promises';

export async function ensureWorkspace(workspaceDir: string): Promise<void> {
  await mkdir(workspaceDir, { recursive: true });
  const existing = await lstat(workspaceDir);
  if (existing.isSymbolicLink() || !existing.isDirectory()) {
    throw new Error('Workspace must be a real directory, not a symbolic link.');
  }
}
