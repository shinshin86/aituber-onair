import path from 'node:path';
import { loadImage, type Image } from '@napi-rs/canvas';
import {
  AVATAR_STATES,
  type AvatarImages,
  type AvatarState,
  type PerformanceOptions,
} from '../types.js';

/** Directory names and explicit paths are both relative to the script file. */
export function resolveImagePaths(
  images: AvatarImages,
  baseDir: string,
): Record<AvatarState, string> {
  return Object.fromEntries(
    AVATAR_STATES.map((state) => [
      state,
      path.resolve(
        baseDir,
        typeof images === 'string'
          ? path.join(images, `${state}.png`)
          : images[state],
      ),
    ]),
  ) as Record<AvatarState, string>;
}

export async function loadAvatarStates(
  images: AvatarImages,
  speakerId: string,
): Promise<Record<AvatarState, Image>> {
  const paths = resolveImagePaths(images, '.');
  const loaded = {} as Record<AvatarState, Image>;
  for (const state of AVATAR_STATES) {
    try {
      loaded[state] = await loadImage(paths[state]);
    } catch (error) {
      throw new Error(
        `Cannot load ${state} for speaker "${speakerId}": ${paths[state]}`,
        { cause: error },
      );
    }
  }
  const anchor = loaded.mouth_open_eyes_open;
  for (const state of AVATAR_STATES) {
    if (
      loaded[state].width !== anchor.width ||
      loaded[state].height !== anchor.height
    )
      throw new Error(
        `All avatar states for speaker "${speakerId}" must have the same dimensions.`,
      );
  }
  return loaded;
}

export function performanceOptions(
  speaker: PerformanceOptions,
  script: PerformanceOptions,
): Required<PerformanceOptions> {
  return {
    mouthMode: speaker.mouthMode ?? script.mouthMode ?? 'flap',
    flapInterval: speaker.flapInterval ?? script.flapInterval ?? 0.12,
    mouthThreshold: speaker.mouthThreshold ?? script.mouthThreshold ?? 0.08,
    motion: speaker.motion ?? script.motion ?? 'subtle',
  };
}

/** A listener or silent segment always closes its mouth, including line gaps. */
export function isMouthOpen(
  speaking: boolean,
  level: number,
  elapsedSeconds: number,
  options: Required<PerformanceOptions>,
): boolean {
  if (!speaking || level < options.mouthThreshold) return false;
  if (options.mouthMode === 'rms') return true;
  // Tolerance prevents exact cadence boundaries from moving due to float error.
  return (
    Math.floor((Math.max(0, elapsedSeconds) + 1e-9) / options.flapInterval) %
      2 ===
    0
  );
}

export function avatarState(
  mouthOpen: boolean,
  eyesClosed: boolean,
): AvatarState {
  return `mouth_${mouthOpen ? 'open' : 'close'}_eyes_${eyesClosed ? 'close' : 'open'}`;
}
