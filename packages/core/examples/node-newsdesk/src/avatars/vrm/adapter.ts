import {
  baseConfig,
  configNumber,
  configObject,
  modelPath,
} from '../config.js';
import type { BrowserAvatarAdapter, VrmAvatarConfig } from '../types.js';
import { DEFAULT_AVATAR_FRAMING, DEFAULT_AVATAR_LIGHTING } from './defaults.js';

export function resolveConfig(
  raw: unknown,
  configFile: string,
): VrmAvatarConfig {
  const value = configObject(raw, 'vrm', [
    'model',
    'animation',
    'scale',
    'x',
    'y',
    'intensity',
    'framing',
    'lighting',
  ]);
  const framing = configObject(
    value.framing === undefined ? {} : value.framing,
    'vrm framing',
    ['visibleHeightRatio', 'lookAtHeightRatio'],
  );
  const lighting = configObject(
    value.lighting === undefined ? {} : value.lighting,
    'vrm lighting',
    ['ambientIntensity', 'directionalIntensity'],
  );
  return {
    kind: 'vrm',
    ...baseConfig(value, { scale: 1, x: 0.5, y: 0.5 }),
    model: modelPath(
      value.model,
      configFile,
      '../react-vrm-app/public/avatar/miko.vrm',
    ),
    animation:
      value.animation === null
        ? null
        : modelPath(
            value.animation,
            configFile,
            '../react-vrm-app/public/avatar/idle_loop.vrma',
          ),
    intensity: configNumber(value, 'intensity', 1, 0, 3),
    framing: {
      visibleHeightRatio: configNumber(
        framing,
        'visibleHeightRatio',
        DEFAULT_AVATAR_FRAMING.visibleHeightRatio,
        0.05,
        2,
      ),
      lookAtHeightRatio: configNumber(
        framing,
        'lookAtHeightRatio',
        DEFAULT_AVATAR_FRAMING.lookAtHeightRatio,
        0,
        1.5,
      ),
    },
    lighting: {
      ambientIntensity: configNumber(
        lighting,
        'ambientIntensity',
        DEFAULT_AVATAR_LIGHTING.ambientIntensity,
        0,
        10,
      ),
      directionalIntensity: configNumber(
        lighting,
        'directionalIntensity',
        DEFAULT_AVATAR_LIGHTING.directionalIntensity,
        0,
        10,
      ),
    },
  };
}
export function createAdapter(): BrowserAvatarAdapter {
  return { kind: 'vrm', runtime: 'browser', resolveConfig };
}
