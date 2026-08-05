import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Creates the working directory and seeds template files that do not exist
 * yet. Existing files are never overwritten, so Agent-created state survives
 * restarts.
 */
export async function ensureWorkspace(
  workspaceDir: string,
  templateDir: string
): Promise<void> {
  await mkdir(workspaceDir, { recursive: true });
  await assertSafeDirectory(workspaceDir);
  await seedDirectory(templateDir, workspaceDir);
}

async function seedDirectory(
  templateDir: string,
  workspaceDir: string
): Promise<void> {
  const entries = await readdir(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    const source = join(templateDir, entry.name);
    const target = join(workspaceDir, entry.name);
    if (entry.isDirectory()) {
      if (!(await ensureSafeDirectory(target))) continue;
      await seedDirectory(source, target);
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Unsupported workspace template entry: ${entry.name}`);
    }
    try {
      await copyFile(source, target, constants.COPYFILE_EXCL);
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
    }
  }
}

async function ensureSafeDirectory(path: string): Promise<boolean> {
  try {
    const existing = await lstat(path);
    if (existing.isSymbolicLink()) {
      throw new Error('Workspace template target must not be a symbolic link.');
    }
    return existing.isDirectory();
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  try {
    await mkdir(path);
    return true;
  } catch (error) {
    if (isAlreadyExists(error)) return ensureSafeDirectory(path);
    throw error;
  }
}

async function assertSafeDirectory(path: string): Promise<void> {
  const existing = await lstat(path);
  if (existing.isSymbolicLink() || !existing.isDirectory()) {
    throw new Error('Workspace must be a real directory, not a symbolic link.');
  }
}

function isAlreadyExists(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'EEXIST'
  );
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
