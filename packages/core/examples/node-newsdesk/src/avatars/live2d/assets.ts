import { stat } from 'node:fs/promises';
import type { Live2dAvatarConfig } from '../types.js';
import { CUBISM_DOWNLOAD_URL } from './defaults.js';

/** Fail before serving files or launching Chromium; never acquire assets. */
export async function requireLive2dAssets(
  config: Live2dAvatarConfig,
): Promise<void> {
  const core = await stat(config.cubismCore).catch(() => null);
  if (!core?.isFile())
    throw new Error(
      `Cubism Core file was not found: ${config.cubismCore}. Set cubismCore in --avatar-config to your licensed Core/live2dcubismcore.min.js file from ${CUBISM_DOWNLOAD_URL}. Cubism Core is not bundled or downloaded.`,
    );
  const model = await stat(config.model).catch(() => null);
  if (!model?.isFile())
    throw new Error(
      `Live2D model file was not found: ${config.model}. Set model in --avatar-config to a licensed Cubism 4 .model3.json file.`,
    );
}
