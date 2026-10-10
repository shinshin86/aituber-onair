import {
  AVATAR_KINDS,
  type AvatarConfig,
  type AvatarKind,
  type LoadedAvatar,
} from './types.js';

export function parseAvatarKind(value: string): AvatarKind {
  if (!AVATAR_KINDS.includes(value as AvatarKind))
    throw new Error(
      `Unknown avatar "${value}". Choose ${AVATAR_KINDS.join(', ')}.`,
    );
  return value as AvatarKind;
}

/** No runtime module is loaded until its avatar is explicitly selected. */
export async function loadAvatar(kind: AvatarKind): Promise<LoadedAvatar> {
  switch (kind) {
    case 'pngtuber':
      return (await import('./pngtuber/adapter.js')).createAdapter();
    case 'vrm':
      return (await import('./vrm/adapter.js')).createAdapter();
    case 'live2d':
      return (await import('./live2d/adapter.js')).createAdapter();
    case 'inochi2d':
      return (await import('./inochi2d/adapter.js')).createAdapter();
    case 'mesh':
      return (await import('./mesh/adapter.js')).createAdapter();
    case 'purupuru':
      return (await import('./purupuru/adapter.js')).createAdapter();
    default:
      throw new Error(
        `Avatar "${kind}" is not available in this example yet. Available: pngtuber, purupuru, mesh, vrm, live2d, inochi2d.`,
      );
  }
}

export async function resolveAvatarConfig(
  kind: AvatarKind,
  raw: unknown,
  configFile: string,
): Promise<AvatarConfig> {
  return (await loadAvatar(kind)).resolveConfig(raw, configFile);
}
