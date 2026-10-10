import {
  baseConfig,
  configObject,
  configNumber,
  modelPath,
} from '../config.js';
import type { BrowserAvatarAdapter, MeshAvatarConfig } from '../types.js';

export function resolveConfig(
  raw: unknown,
  configFile: string,
): MeshAvatarConfig {
  const value = configObject(raw, 'mesh', [
    'model',
    'scale',
    'x',
    'y',
    'padTop',
    'padSide',
    'talkGain',
  ]);
  return {
    kind: 'mesh',
    ...baseConfig(value, { scale: 1, x: 0.5, y: 0.5 }),
    model: modelPath(
      value.model,
      configFile,
      '../react-mesh-avatar-app/public/avatar/qipao',
    ),
    padTop: configNumber(value, 'padTop', -0.07, -0.5, 1),
    padSide: configNumber(value, 'padSide', -0.18, -0.45, 1),
    talkGain: configNumber(value, 'talkGain', 0.55, 0, 3),
  };
}
export function createAdapter(): BrowserAvatarAdapter {
  return { kind: 'mesh', runtime: 'browser', resolveConfig };
}
