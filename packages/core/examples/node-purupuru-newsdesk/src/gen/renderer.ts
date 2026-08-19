import {
  type Canvas,
  type Image,
  type SKRSContext2D,
  createCanvas,
  loadImage,
} from '@napi-rs/canvas';
import type { RenderConfig, ScriptAvatarLayout } from '../types.js';
import {
  createHairSpringState,
  type HairSpringOutput,
  type HairSpringState,
  updateHairSpring,
} from './hairSpring.js';
import {
  type MouthState,
  type PuruPuruAvatarPackage,
  type PuruPuruAvatarSettings,
  type PuruPuruItemLayer,
  selectFaceKey,
} from './purupuruPackage.js';

const HALF_MOUTH_THRESHOLD = 0.22;
const OPEN_MOUTH_THRESHOLD = 0.78;
const POSE_FOLLOW = 0.08;
const LINE_START_PROHIBITED = /^[、。！？）」』】〕］｝〉》]$/;

interface Pose {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface HairMotion {
  back: HairSpringOutput;
  front: HairSpringOutput;
}

interface MotionState {
  pose: Pose;
  previousPose: Pose;
  backHair: HairSpringState;
  frontHair: HairSpringState;
  nextFrame: number;
}

export interface MotionDiagnostics {
  pose: Pose;
  hair: HairMotion;
}

export interface NewsdeskRenderer {
  canvas: Canvas;
  render(
    frameNumber: number,
    mouthValue: number,
    eyesClosed: boolean,
  ): MotionDiagnostics;
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
  avatarPackage: PuruPuruAvatarPackage,
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
  const state: MotionState = {
    pose: { x: 0, y: 0, rotation: 0, scale: 1 },
    previousPose: { x: 0, y: 0, rotation: 0, scale: 1 },
    backHair: createHairSpringState(),
    frontHair: createHairSpringState(),
    nextFrame: 0,
  };

  return {
    canvas,
    render(frameNumber, mouthValue, eyesClosed) {
      if (frameNumber !== state.nextFrame) {
        throw new Error(
          `Frames must be rendered sequentially (expected ${state.nextFrame}, ` +
            `got ${frameNumber}).`,
        );
      }
      const diagnostics = updateMotion(
        state,
        avatarPackage.settings,
        frameNumber,
        config.fps,
        motionIntensity,
      );
      drawBackground(context, canvas, config.background, backgroundImage);
      drawAvatar(
        context,
        canvas,
        avatarPackage,
        config.avatarLayout,
        state.pose,
        diagnostics.hair,
        mouthValue,
        eyesClosed,
      );
      drawTextOverlays(context, canvas, config, frameNumber / config.fps);
      state.nextFrame += 1;
      return diagnostics;
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

/** Map a normalized RMS mouth value to one of the three avatar states. */
export function resolveMouthState(value: number): MouthState {
  if (value >= OPEN_MOUTH_THRESHOLD) return 'open';
  if (value >= HALF_MOUTH_THRESHOLD) return 'half';
  return 'closed';
}

function updateMotion(
  state: MotionState,
  settings: PuruPuruAvatarSettings,
  frameNumber: number,
  fps: number,
  intensity: number,
): MotionDiagnostics {
  const seconds = frameNumber / fps;
  const target: Pose = {
    x: Math.sin(seconds * 0.72) * settings.rollStrength * 0.18 * intensity,
    y:
      (Math.sin(seconds * Math.PI * 2 * 0.34) * settings.breathStrength * 0.18 -
        Math.max(0, settings.breathStrength) * 0.08) *
      intensity,
    rotation:
      Math.sin(seconds * 0.64) * settings.rollStrength * 0.0016 * intensity,
    scale: 1 + Math.sin(seconds * Math.PI * 2 * 0.34) * 0.006,
  };
  const pose = state.pose;
  pose.x += (target.x - pose.x) * POSE_FOLLOW;
  pose.y += (target.y - pose.y) * POSE_FOLLOW;
  pose.rotation += (target.rotation - pose.rotation) * POSE_FOLLOW;
  pose.scale += (target.scale - pose.scale) * POSE_FOLLOW;
  const deltaSeconds = 1 / fps;
  const velocity = {
    x: (pose.x - state.previousPose.x) / deltaSeconds,
    y: (pose.y - state.previousPose.y) / deltaSeconds,
    rotation: (pose.rotation - state.previousPose.rotation) / deltaSeconds,
  };
  const hair: HairMotion = {
    back: updateHairSpring(state.backHair, {
      deltaSeconds,
      hairSpring: settings.hairSpring,
      poseVelocityX: velocity.x,
      poseVelocityY: velocity.y,
      poseRotationVelocity: velocity.rotation,
      layerResponse: 0.72,
    }),
    front: updateHairSpring(state.frontHair, {
      deltaSeconds,
      hairSpring: settings.hairSpring,
      poseVelocityX: velocity.x,
      poseVelocityY: velocity.y,
      poseRotationVelocity: velocity.rotation,
      layerResponse: 1,
    }),
  };
  Object.assign(state.previousPose, pose);
  return {
    pose: { ...pose },
    hair: { back: { ...hair.back }, front: { ...hair.front } },
  };
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
  avatar: PuruPuruAvatarPackage,
  layout: ScriptAvatarLayout,
  pose: Pose,
  hair: HairMotion,
  mouthValue: number,
  eyesClosed: boolean,
): void {
  const { images, settings, itemLayers } = avatar;
  const faceKey = selectFaceKey(eyesClosed, resolveMouthState(mouthValue));
  const baseScale = calculateBaseScale(canvas, avatar) * Number(layout.scale);
  const x = canvas.width * Number(layout.x) + settings.avatarX * baseScale;
  const y = canvas.height * Number(layout.y) + settings.avatarY * baseScale;

  context.save();
  context.translate(x + pose.x * baseScale, y + pose.y * baseScale);
  context.rotate(pose.rotation);
  context.scale(baseScale, baseScale * pose.scale);
  drawItems(context, itemLayers, 'characterBack');
  drawHair(context, images.backHair, hair.back);
  drawSpringItems(context, itemLayers, 'faceBack', images.backHair, hair.back);
  drawCentered(context, images[faceKey]);
  drawItems(context, itemLayers, 'faceFront');
  drawHair(context, images.frontHair, hair.front);
  drawSpringItems(
    context,
    itemLayers,
    'frontHairFront',
    images.frontHair,
    hair.front,
  );
  context.restore();
}

function calculateBaseScale(
  canvas: Canvas,
  avatar: PuruPuruAvatarPackage,
): number {
  const width =
    avatar.settings.sourceImageWidth || avatar.images.eyesOpenMouthClosed.width;
  const height =
    avatar.settings.sourceImageHeight ||
    avatar.images.eyesOpenMouthClosed.height;
  const fit = Math.min(
    (canvas.width * 0.78) / width,
    (canvas.height * 0.94) / height,
  );
  return fit * Math.max(0.1, avatar.settings.avatarSize / 100);
}

function drawCentered(context: SKRSContext2D, image: Image): void {
  context.drawImage(image, -image.width / 2, -image.height / 2);
}

function drawHair(
  context: SKRSContext2D,
  image: Image,
  spring: HairSpringOutput,
): void {
  context.save();
  applyHairTransform(context, image, spring, 1);
  drawCentered(context, image);
  context.restore();
}

function applyHairTransform(
  context: SKRSContext2D,
  image: Image,
  spring: HairSpringOutput,
  strength: number,
): void {
  const follow = Math.max(0, Math.min(2, strength));
  const anchorY = -image.height * 0.38;
  context.translate(spring.offsetX * follow, spring.offsetY * follow);
  context.translate(0, anchorY);
  context.rotate(spring.angle * follow);
  context.scale(
    1 + (spring.stretchX - 1) * follow,
    1 + (spring.stretchY - 1) * follow,
  );
  context.translate(0, -anchorY);
}

function drawItems(
  context: SKRSContext2D,
  layers: PuruPuruItemLayer[],
  slot: string,
): void {
  for (const layer of layers) {
    if (normalizeSlot(layer.slot) !== slot) continue;
    context.save();
    applyItemTransform(context, layer);
    drawCentered(context, layer.image);
    context.restore();
  }
}

function drawSpringItems(
  context: SKRSContext2D,
  layers: PuruPuruItemLayer[],
  slot: string,
  hairImage: Image,
  spring: HairSpringOutput,
): void {
  for (const layer of layers) {
    if (normalizeSlot(layer.slot) !== slot) continue;
    context.save();
    applyHairTransform(context, hairImage, spring, layer.followStrength / 100);
    applyItemTransform(context, layer);
    drawCentered(context, layer.image);
    context.restore();
  }
}

function normalizeSlot(slot: string): string {
  return ['characterBack', 'faceBack', 'faceFront', 'frontHairFront'].includes(
    slot,
  )
    ? slot
    : 'frontHairFront';
}

function applyItemTransform(
  context: SKRSContext2D,
  layer: PuruPuruItemLayer,
): void {
  context.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));
  context.translate(layer.x, layer.y);
  context.rotate((layer.rotation * Math.PI) / 180);
  const scale = Math.max(0.01, layer.scale / 100);
  context.scale(scale, scale);
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
