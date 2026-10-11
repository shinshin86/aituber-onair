import {
  type Canvas,
  type Image,
  type SKRSContext2D,
  createCanvas,
} from '@napi-rs/canvas';
import type {
  PurupuruAvatarConfig,
  AvatarFrameInput,
  NodeAvatarAdapter,
} from '../types.js';
import {
  configObject,
  baseConfig,
  configNumber,
  modelPath,
} from '../config.js';
import {
  createHairSpringState,
  type HairSpringOutput,
  type HairSpringState,
  updateHairSpring,
} from './hairSpring.js';
import {
  type MouthState,
  loadPuruPuruPackage,
  type PuruPuruAvatarPackage,
  type PuruPuruAvatarSettings,
  type PuruPuruItemLayer,
  selectFaceKey,
} from './package.js';

const HALF_MOUTH_THRESHOLD = 0.22;
const OPEN_MOUTH_THRESHOLD = 0.78;
const POSE_FOLLOW = 0.08;

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
}

export interface MotionDiagnostics {
  pose: Pose;
  hair: HairMotion;
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

function drawAvatar(
  context: SKRSContext2D,
  canvas: Canvas,
  avatar: PuruPuruAvatarPackage,
  layout: PurupuruAvatarConfig,
  pose: Pose,
  hair: HairMotion,
  mouthValue: number,
  eyesClosed: boolean,
): void {
  const { images, settings, itemLayers } = avatar;
  const faceKey = selectFaceKey(eyesClosed, resolveMouthState(mouthValue));
  const baseScale = calculateBaseScale(canvas, avatar) * layout.scale;
  const x = canvas.width * layout.x + settings.avatarX * baseScale;
  const y = canvas.height * layout.y + settings.avatarY * baseScale;

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

export function resolveConfig(
  raw: unknown,
  configFile: string,
): PurupuruAvatarConfig {
  const value = configObject(raw, 'purupuru', [
    'model',
    'scale',
    'x',
    'y',
    'intensity',
  ]);
  return {
    kind: 'purupuru',
    ...baseConfig(value, { scale: 1.5, x: 0.5, y: 0.65 }),
    model: modelPath(value.model, configFile, 'assets/miko.purupuru'),
    intensity: configNumber(value, 'intensity', 1, 0, 3),
  };
}

/** Precompute the original spring simulation on a fixed virtual clock.
 * Rendering then only samples the immutable pose table, so seeks and restarts
 * reproduce exactly the same hair motion without startup impulses.
 */
export function createAdapter(): NodeAvatarAdapter {
  let canvas: Canvas | null = null;
  let avatar: PuruPuruAvatarPackage | null = null;
  let config: PurupuruAvatarConfig;
  let poses: MotionDiagnostics[] = [];
  return {
    kind: 'purupuru',
    runtime: 'node',
    resolveConfig,
    async prepare(input) {
      if (input.config.kind !== 'purupuru')
        throw new Error('Expected purupuru avatar configuration.');
      config = input.config;
      avatar = await loadPuruPuruPackage(config.model);
      canvas = createCanvas(input.width, input.height);
      const state: MotionState = {
        pose: { x: 0, y: 0, rotation: 0, scale: 1 },
        previousPose: { x: 0, y: 0, rotation: 0, scale: 1 },
        backHair: createHairSpringState(),
        frontHair: createHairSpringState(),
      };
      // Keep the original 30 fps dynamics independent of output frame rate.
      const count = Math.ceil(input.duration * 30) + 1;
      const settings = avatar.settings;
      poses = Array.from({ length: count }, (_, frame) =>
        updateMotion(state, settings, frame, 30, config.intensity),
      );
    },
    render(input: AvatarFrameInput) {
      if (!canvas || !avatar)
        throw new Error('Purupuru adapter is not prepared.');
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      const motion =
        poses[Math.min(poses.length - 1, Math.floor(input.time * 30 + 1e-8))];
      drawAvatar(
        context,
        canvas,
        avatar,
        config,
        motion.pose,
        motion.hair,
        input.speaking ? input.mouth : 0,
        input.eyesClosed,
      );
      return canvas;
    },
    async dispose() {
      canvas = null;
      avatar = null;
      poses = [];
    },
  };
}
