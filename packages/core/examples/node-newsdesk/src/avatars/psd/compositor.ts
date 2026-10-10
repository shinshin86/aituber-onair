import type { RenderConfig } from '../../types.js';
import type { CompositorSession } from '../../gen/compositor/index.js';
import { selectAvatarMode } from './mode.js';

/** Forced static never loads Chromium; auto retains the rigger-first fallback. */
export async function openPsdCompositor(
  config: RenderConfig,
  mouthValues: Float32Array,
): Promise<CompositorSession> {
  if (config.avatarConfig.kind !== 'psd')
    throw new Error('Expected PSD configuration.');
  let detection: { usable: boolean; reason: string } | undefined;
  if (config.avatarConfig.mode !== 'static') {
    const browser = await import('../../gen/compositor/browser.js');
    const candidate = await browser.openBrowserCompositor(config, mouthValues);
    const result = candidate.avatarDiagnostics?.detection;
    if (
      !result ||
      typeof result !== 'object' ||
      !('usable' in result) ||
      !('reason' in result)
    ) {
      await candidate.close();
      throw new Error('PSD motion detector did not return a diagnostic.');
    }
    detection = {
      usable: result.usable === true,
      reason: String(result.reason),
    };
    try {
      if (selectAvatarMode(config.avatarConfig.mode, detection) === 'motion')
        return candidate;
    } catch (error) {
      await candidate.close();
      throw error;
    }
    await candidate.close();
  }
  const { createStaticAdapter } = await import('./static.js');
  const { openNodeCompositor } = await import('../../gen/compositor/node.js');
  const session = await openNodeCompositor(
    config,
    mouthValues,
    createStaticAdapter(),
  );
  return {
    ...session,
    avatarDiagnostics: {
      ...session.avatarDiagnostics,
      requestedMode: config.avatarConfig.mode,
      detection,
    },
  };
}
