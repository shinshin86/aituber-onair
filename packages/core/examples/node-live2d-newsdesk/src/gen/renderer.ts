import {
  type Canvas,
  type Image,
  type SKRSContext2D,
  createCanvas,
  loadImage,
} from '@napi-rs/canvas';
import type { RenderConfig, ScriptAvatarLayout } from '../types.js';
import type { Live2DFrameSource } from './live2dAvatar.js';

/** A normalized RMS value at or above this level uses an open-mouth image. */
export const MOUTH_OPEN_THRESHOLD = 0.45;
const LINE_START_PROHIBITED = /^[、。！？）」』】〕］｝〉》]$/;

export type MouthState = 'closed' | 'open';

export interface MotionDiagnostics {
  mouthState: MouthState;
  eyesClosed: boolean;
  avatarFrameMs: number;
}

export interface NewsdeskRenderer {
  canvas: Canvas;
  render(
    frameNumber: number,
    mouthValue: number,
    eyesClosed: boolean,
  ): Promise<MotionDiagnostics>;
  rgba(): Buffer;
}

interface TextBoxOptions {
  centerY: number;
  fontSize: number;
  maxWidth: number;
  fill: string;
  background: string;
  maxLines: number;
  borderColor?: string;
  borderWidth?: number;
}

/** Create a sequential deterministic canvas renderer for a resolved config. */
export async function createRenderer(
  config: RenderConfig,
  avatar: Live2DFrameSource,
): Promise<NewsdeskRenderer> {
  const canvas = createCanvas(config.width, config.height);
  const context = canvas.getContext('2d');
  const backgroundImage = config.background.image
    ? await loadImage(config.background.image)
    : null;
  const configuredIntensity = Number(config.motion.intensity ?? 1);
  const motionIntensity = Number.isFinite(configuredIntensity)
    ? Math.max(0, Math.min(3, configuredIntensity))
    : 1;
  let nextFrame = 0;

  return {
    canvas,
    async render(frameNumber, mouthValue, eyesClosed) {
      if (frameNumber !== nextFrame) {
        throw new Error(
          `Frames must be rendered sequentially (expected ${nextFrame}, ` +
            `got ${frameNumber}).`,
        );
      }
      const mouthState = resolveMouthState(mouthValue);
      const avatarFrame = await avatar.renderFrame({
        frameNumber,
        time: frameNumber / config.fps,
        deltaSeconds: frameNumber === 0 ? 0 : motionIntensity / config.fps,
        mouth: Math.max(0, Math.min(1, mouthValue)),
        eyesClosed,
      });
      drawBackground(context, canvas, config.background, backgroundImage);
      drawAvatar(context, canvas, avatarFrame.image, config.avatarLayout);
      drawTextOverlays(context, canvas, config, frameNumber / config.fps);
      nextFrame += 1;
      return {
        mouthState,
        eyesClosed,
        avatarFrameMs: avatarFrame.elapsedMs,
      };
    },
    rgba() {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      return Buffer.from(
        imageData.data.buffer,
        imageData.data.byteOffset,
        imageData.data.byteLength,
      );
    },
  };
}

/** Map normalized RMS to the two available mouth states. */
export function resolveMouthState(value: number): MouthState {
  return value >= MOUTH_OPEN_THRESHOLD ? 'open' : 'closed';
}

function drawBackground(
  context: SKRSContext2D,
  canvas: Canvas,
  background: RenderConfig['background'],
  image: Image | null,
): void {
  context.save();
  context.fillStyle = background.color || '#20242c';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (image) {
    const scale = Math.max(
      canvas.width / image.width,
      canvas.height / image.height,
    );
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(
      image,
      (canvas.width - width) / 2,
      (canvas.height - height) / 2,
      width,
      height,
    );
  }
  context.restore();
}

function drawAvatar(
  context: SKRSContext2D,
  canvas: Canvas,
  image: Image,
  layout: ScriptAvatarLayout,
): void {
  const scale = Number(layout.scale);
  const x = canvas.width * Number(layout.x);
  const y = canvas.height * Number(layout.y);
  const width = image.width * scale;
  const height = image.height * scale;

  context.save();
  context.drawImage(image, x - width / 2, y - height / 2, width, height);
  context.restore();
}

const CHAPTER_STYLE = {
  centerY: 150,
  fontSize: 62,
  fill: '#ffffff',
  background: 'rgba(196, 42, 62, 0.95)',
  borderColor: 'rgba(255, 255, 255, 0.9)',
  borderWidth: 5,
  maxLines: 2,
};

function drawTextOverlays(
  context: SKRSContext2D,
  canvas: Canvas,
  config: RenderConfig,
  time: number,
): void {
  const chapter = config.chapters.find(
    (entry) => time >= entry.start && time < entry.end,
  );
  if (chapter) {
    drawTextBox(context, canvas, chapter.text, {
      ...CHAPTER_STYLE,
      maxWidth: canvas.width - 120,
    });
  } else if (config.telop) {
    drawTextBox(context, canvas, config.telop, {
      centerY: 150,
      fontSize: 58,
      maxWidth: canvas.width - 120,
      fill: '#ffffff',
      background: 'rgba(0, 0, 0, 0.62)',
      maxLines: 2,
    });
  }
  const subtitle = config.subtitles.find(
    (entry) => time >= entry.start && time < entry.end,
  );
  if (subtitle) {
    drawTextBox(context, canvas, subtitle.text, {
      centerY: canvas.height - 235,
      fontSize: 56,
      maxWidth: canvas.width - 120,
      fill: '#ffffff',
      background: 'rgba(0, 0, 0, 0.72)',
      maxLines: 3,
    });
  }
}

function drawTextBox(
  context: SKRSContext2D,
  canvas: Canvas,
  text: string,
  options: TextBoxOptions,
): void {
  context.save();
  context.font = `700 ${options.fontSize}px "Hiragino Sans", "Yu Gothic", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  const lines = wrapText(context, text, options.maxWidth, options.maxLines);
  const lineHeight = options.fontSize * 1.32;
  const boxWidth = Math.min(
    options.maxWidth + 48,
    Math.max(...lines.map((line) => context.measureText(line).width)) + 72,
  );
  const boxHeight = lines.length * lineHeight + 36;
  const left = (canvas.width - boxWidth) / 2;
  const top = options.centerY - boxHeight / 2;
  roundedRect(context, left, top, boxWidth, boxHeight, 24);
  context.fillStyle = options.background;
  context.fill();
  if (options.borderColor && options.borderWidth) {
    context.strokeStyle = options.borderColor;
    context.lineWidth = options.borderWidth;
    context.stroke();
  }
  context.strokeStyle = '#111111';
  context.lineWidth = 8;
  context.fillStyle = options.fill;
  lines.forEach((line, index) => {
    const y = options.centerY + (index - (lines.length - 1) / 2) * lineHeight;
    context.strokeText(line, canvas.width / 2, y, options.maxWidth);
    context.fillText(line, canvas.width / 2, y, options.maxWidth);
  });
  context.restore();
}

function wrapText(
  context: SKRSContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let current = '';
  for (const char of chars) {
    const overflows =
      Boolean(current) && context.measureText(current + char).width > maxWidth;
    if (char === '\n' || (overflows && !LINE_START_PROHIBITED.test(char))) {
      lines.push(current);
      current = char === '\n' ? '' : char;
    } else {
      current += char;
    }
  }
  if (current || lines.length === 0) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  const finalLine = visible[maxLines - 1] ?? '';
  visible[maxLines - 1] = `${finalLine.slice(0, -1)}…`;
  return visible;
}

function roundedRect(
  context: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const resolvedRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + resolvedRadius, y);
  context.arcTo(x + width, y, x + width, y + height, resolvedRadius);
  context.arcTo(x + width, y + height, x, y + height, resolvedRadius);
  context.arcTo(x, y + height, x, y, resolvedRadius);
  context.arcTo(x, y, x + width, y, resolvedRadius);
  context.closePath();
}
