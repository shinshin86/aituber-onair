import { createCanvas, type Canvas } from '@napi-rs/canvas';
import type {
  AvatarConfig,
  AvatarFrameInput,
  NodeAvatarAdapter,
} from '../types.js';
import {
  loadPngtuberAvatar,
  selectImageKey,
  type PngtuberAvatar,
} from './images.js';

/** Preserve the four-state images and the original small breathing/roll pose. */
export function createAdapter(): NodeAvatarAdapter {
  let avatar: PngtuberAvatar | null = null;
  let canvas: Canvas | null = null;
  let config: AvatarConfig;
  return {
    kind: 'pngtuber',
    runtime: 'node',
    async prepare(input) {
      avatar = await loadPngtuberAvatar(input.config.model);
      canvas = createCanvas(input.width, input.height);
      config = input.config;
    },
    render(input: AvatarFrameInput) {
      if (!avatar || !canvas)
        throw new Error('PNGTuber adapter is not prepared.');
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, canvas.width, canvas.height);
      const breath = Math.sin(input.time * Math.PI * 2 * 0.34);
      const roll = Math.sin(input.time * Math.PI * 2 * 0.12 + 0.35);
      const fit =
        Math.min(
          (canvas.width * 0.96) / avatar.width,
          (canvas.height * 0.9) / avatar.height,
        ) * config.scale;
      const image =
        avatar.images[
          selectImageKey(
            input.speaking && input.mouth >= 0.45,
            input.eyesClosed,
          )
        ];
      g.save();
      g.translate(
        canvas.width * config.x,
        canvas.height * config.y + breath * 8 * config.intensity * fit,
      );
      g.rotate(roll * 0.008 * config.intensity);
      g.scale(
        fit * (1 + breath * 0.004 * config.intensity),
        fit * (1 + breath * 0.004 * config.intensity),
      );
      g.drawImage(image, -image.width / 2, -image.height / 2);
      g.restore();
      return canvas;
    },
    async dispose() {
      avatar = null;
      canvas = null;
    },
  };
}
