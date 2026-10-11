import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { Inochi2dAvatarConfig } from '../types.js';
import { REQUIRED_RUNTIME_FILES } from './defaults.js';

/** Validate local files before launching Chromium; never acquire assets. */
export async function requireInochi2dAssets(
  config: Inochi2dAvatarConfig,
): Promise<void> {
  const files: [string, string][] = REQUIRED_RUNTIME_FILES.map((name) => [
    path.join(config.runtime, name),
    `Inochi2D runtime file ${name}`,
  ]);
  files.push([config.model, 'Inochi2D model']);
  if (config.motion) files.push([config.motion, 'Inochi2D motion']);
  for (const [filename, label] of files) {
    const metadata = await stat(filename).catch(() => null);
    if (!metadata?.isFile())
      throw new Error(
        `${label} was not found: ${filename}. Keep the sibling react-inochi2d-app assets available or provide paths with --avatar-config.`,
      );
  }
}
