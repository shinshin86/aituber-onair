import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { type Image, loadImage } from '@napi-rs/canvas';

export const AVATAR_IMAGE_FILES = {
  mouth_close_eyes_open: 'mouth_close_eyes_open.png',
  mouth_close_eyes_close: 'mouth_close_eyes_close.png',
  mouth_open_eyes_open: 'mouth_open_eyes_open.png',
  mouth_open_eyes_close: 'mouth_open_eyes_close.png',
} as const;

export type AvatarImageKey = keyof typeof AVATAR_IMAGE_FILES;
export type MouthState = 'closed' | 'open';

export interface PngtuberAvatar {
  directory: string;
  width: number;
  height: number;
  images: Record<AvatarImageKey, Image>;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Select the four-state image used by the React PNGTuber example. */
export function selectImageKey(
  mouthOpen: boolean,
  eyesClosed: boolean,
): AvatarImageKey {
  if (mouthOpen) {
    return eyesClosed ? 'mouth_open_eyes_close' : 'mouth_open_eyes_open';
  }
  return eyesClosed ? 'mouth_close_eyes_close' : 'mouth_close_eyes_open';
}

/** Load and validate the four PNG files that form a PNGTuber avatar. */
export async function loadPngtuberAvatar(
  directory: string,
): Promise<PngtuberAvatar> {
  const entries = await Promise.all(
    Object.entries(AVATAR_IMAGE_FILES).map(async ([key, fileName]) => {
      const filePath = path.join(directory, fileName);
      let data: Buffer;
      try {
        data = await readFile(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error(`Missing PNGTuber avatar image: ${fileName}.`);
        }
        throw error;
      }
      if (!hasPngSignature(data)) {
        throw new Error(`PNGTuber avatar image is not a PNG: ${fileName}.`);
      }
      return [key as AvatarImageKey, await loadImage(data)] as const;
    }),
  );
  const images = Object.fromEntries(entries) as Record<AvatarImageKey, Image>;
  const first = images.mouth_close_eyes_open;
  if (first.width <= 0 || first.height <= 0) {
    throw new Error('PNGTuber avatar images must have non-zero dimensions.');
  }
  for (const [key, image] of Object.entries(images)) {
    if (image.width !== first.width || image.height !== first.height) {
      throw new Error(
        `PNGTuber avatar images must have equal dimensions: ${key} is ` +
          `${image.width}x${image.height}, expected ${first.width}x${first.height}.`,
      );
    }
  }
  return {
    directory,
    width: first.width,
    height: first.height,
    images,
  };
}

function hasPngSignature(data: Buffer): boolean {
  return (
    data.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => data[index] === byte)
  );
}
