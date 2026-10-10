import { loadAvatar } from '../../avatars/registry.js';
import type { RenderConfig } from '../../types.js';

export interface CompositorSession {
  frameFormat: 'rgba' | 'png';
  launchMode: string;
  actions: number;
  avatarDiagnostics?: Record<string, unknown>;
  renderFrame(
    frame: number,
    mouth: number,
  ): Promise<{ bytes: Buffer; png(): Buffer; elapsedMs: number }>;
  close(): Promise<void>;
}
export async function openCompositor(
  config: RenderConfig,
  mouthValues: Float32Array,
): Promise<CompositorSession> {
  const avatar = await loadAvatar(config.avatar);
  if (avatar.runtime === 'node')
    return (await import('./node.js')).openNodeCompositor(
      config,
      mouthValues,
      avatar,
    );
  return (await import('./browser.js')).openBrowserCompositor(
    config,
    mouthValues,
  );
}
