import type {
  PuruPuruAvatarPackage,
  PuruPuruAvatarSettings,
  PuruPuruItemLayer,
  PuruPuruMouthState,
} from './purupuruPackage';
import type { PuruPuruReaction } from './purupuruReactions';
import type { HairSpringOutput } from './hairSpring';
import {
  createHairSpringState,
  resetHairSpring,
  triggerHairSpringBounce,
  updateHairSpring,
} from './hairSpring';
import {
  createIdleGazeState,
  resetIdleGaze,
  updateIdleGaze,
} from './idleGaze';
import { selectFaceKey } from './purupuruPackage';
import type { AvatarViewTransform } from '../types/settings';

interface RendererOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  getAvatarPackage: () => PuruPuruAvatarPackage | null;
  getVoiceLevel: () => number;
  getIsSpeaking: () => boolean;
  getIdleMotionEnabled: () => boolean;
  getViewTransform: () => AvatarViewTransform;
}

interface Pose {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

interface BlinkState {
  eyesClosed: boolean;
  nextBlinkAt: number;
  reopenAt: number;
}

export interface PuruPuruRendererControls {
  dispose: () => void;
  triggerBounce: (strength: number) => void;
  applyReaction: (reaction: PuruPuruReaction) => void;
  resetReaction: () => void;
}

interface HairRigOutput {
  back: HairSpringOutput;
  front: HairSpringOutput;
}

interface LayerParallax {
  backHair: number;
  face: number;
  frontHair: number;
}

type ItemLayerSlot =
  | 'stageBack'
  | 'characterBack'
  | 'faceBack'
  | 'faceFront'
  | 'frontHairFront'
  | 'stageFront';

interface NormalizedReaction {
  impulse: {
    bounce: number;
    tilt: number;
    shake: number;
    scalePop: number;
  };
  sustain: {
    offsetY: number;
    tilt: number;
    idleScale: number;
    idleSpeedScale: number;
  };
  fadeMs: number;
}

interface ReactionState {
  current: NormalizedReaction | null;
  weight: number;
  targetWeight: number;
  transientTilt: number;
  transientTiltVelocity: number;
  transientScale: number;
  transientScaleVelocity: number;
  shakeStrength: number;
}

const RMS_CEILING = 0.12;
const HALF_MOUTH_THRESHOLD = 0.22;
const OPEN_MOUTH_THRESHOLD = 0.78;
const MIN_BLINK_DELAY_MS = 2000;
const MAX_BLINK_DELAY_MS = 6000;
const MIN_BLINK_HOLD_MS = 100;
const MAX_BLINK_HOLD_MS = 200;
const POSE_FOLLOW = 0.08;
const DEFAULT_REACTION_FADE_MS = 360;
const GAZE_TURN_OFFSET_RATIO = 0.014;
const GAZE_TURN_TILT = 0.026;
const BACK_HAIR_PARALLAX_RATIO = 0.006;
const FACE_PARALLAX_RATIO = 0.034;
const FRONT_HAIR_PARALLAX_RATIO = 0.01;
const FALLBACK_ITEM_LAYER_SLOT: ItemLayerSlot = 'frontHairFront';
const AVATAR_VIEW_MIN_SCALE = 0.2;
const AVATAR_VIEW_MAX_SCALE = 3;
const AVATAR_VIEW_MAX_OFFSET = 100_000;
const ITEM_LAYER_SLOTS = new Set<string>([
  'stageBack',
  'characterBack',
  'faceBack',
  'faceFront',
  'frontHairFront',
  'stageFront',
]);

export function createPuruPuruRenderer(
  options: RendererOptions,
): PuruPuruRendererControls {
  const context = options.canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D rendering is not supported.');
  }

  const pose: Pose = { x: 0, y: 0, rotation: 0, scale: 1 };
  const targetPose: Pose = { x: 0, y: 0, rotation: 0, scale: 1 };
  const previousPose: Pose = { ...pose };
  const backHairSpring = createHairSpringState();
  const frontHairSpring = createHairSpringState();
  const idleGaze = createIdleGazeState();
  const reactionState: ReactionState = {
    current: null,
    weight: 0,
    targetWeight: 0,
    transientTilt: 0,
    transientTiltVelocity: 0,
    transientScale: 0,
    transientScaleVelocity: 0,
    shakeStrength: 0,
  };
  const blink: BlinkState = {
    eyesClosed: false,
    nextBlinkAt: performance.now() + randomBlinkDelay(),
    reopenAt: 0,
  };

  let animationFrameId = 0;
  let disposed = false;
  let previousFrameAt = performance.now();
  let previousAvatarPackage: PuruPuruAvatarPackage | null = null;
  let idlePhaseSeconds = 0;

  const resizeObserver = new ResizeObserver(() => resizeCanvas(options));
  resizeObserver.observe(options.container);
  resizeCanvas(options);

  const triggerBounce = (strength: number) => {
    const avatarPackage = options.getAvatarPackage();
    if (!avatarPackage || avatarPackage.settings.hairSpring <= 0) return;
    triggerHairSpringBounce(backHairSpring, strength * 0.7);
    triggerHairSpringBounce(frontHairSpring, strength);
  };

  const applyReaction = (reaction: PuruPuruReaction) => {
    if (!reaction || typeof reaction !== 'object') {
      resetReaction();
      return;
    }

    const normalizedReaction = normalizeReaction(reaction);
    reactionState.current = normalizedReaction;
    reactionState.targetWeight = 1;
    reactionState.transientTiltVelocity += normalizedReaction.impulse.tilt * 0.1;
    reactionState.transientScaleVelocity +=
      normalizedReaction.impulse.scalePop * 0.055;
    reactionState.shakeStrength = Math.max(
      reactionState.shakeStrength,
      normalizedReaction.impulse.shake,
    );
    triggerBounce(normalizedReaction.impulse.bounce);
  };

  const resetReaction = () => {
    reactionState.targetWeight = 0;
  };

  const frame = (now: number) => {
    if (disposed) return;
    const avatarPackage = options.getAvatarPackage();
    const deltaSeconds = Math.max(0, (now - previousFrameAt) / 1000);
    const phaseDeltaSeconds = clamp(deltaSeconds, 0, 0.05);
    previousFrameAt = now;

    if (avatarPackage !== previousAvatarPackage) {
      resetHairSpring(backHairSpring);
      resetHairSpring(frontHairSpring);
      resetIdleGaze(idleGaze);
      copyPose(previousPose, pose);
      previousAvatarPackage = avatarPackage;
    }

    resizeCanvas(options);
    updateReactionState(reactionState, deltaSeconds);
    const idleMotionEnabled = options.getIdleMotionEnabled();
    idlePhaseSeconds +=
      phaseDeltaSeconds * getReactionIdleSpeedScale(reactionState);
    if (updateBlink(blink, now)) {
      triggerBounce(0.42);
    }
    const gaze = updateIdleGaze(idleGaze, {
      deltaSeconds,
      enabled: Boolean(avatarPackage && idleMotionEnabled),
      amplitudeScale: getReactionIdleAmplitudeScale(reactionState),
      frequencyScale: getReactionIdleSpeedScale(reactionState),
    });
    if (gaze.justSettled && Math.random() < 0.6) {
      blink.nextBlinkAt = now;
    }
    updateIdleTarget(
      targetPose,
      avatarPackage,
      idlePhaseSeconds,
      now,
      reactionState,
      gaze.gaze,
      idleMotionEnabled,
    );
    followPose(pose, targetPose);

    const poseVelocity = calculatePoseVelocity(pose, previousPose, deltaSeconds);
    const hair = updateHairRig(
      avatarPackage,
      backHairSpring,
      frontHairSpring,
      deltaSeconds,
      poseVelocity,
    );

    renderFrame(context, options, pose, blink.eyesClosed, hair, gaze.gaze);
    copyPose(previousPose, pose);
    animationFrameId = requestAnimationFrame(frame);
  };

  animationFrameId = requestAnimationFrame(frame);

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    },
    triggerBounce,
    applyReaction,
    resetReaction,
  };
}

function resizeCanvas({ canvas, container }: RendererOptions): void {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.floor(width * pixelRatio);
  const nextHeight = Math.floor(height * pixelRatio);

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
}

function updateBlink(blink: BlinkState, now: number): boolean {
  if (blink.eyesClosed) {
    if (now >= blink.reopenAt) {
      blink.eyesClosed = false;
      blink.nextBlinkAt = now + randomBlinkDelay();
    }
    return false;
  }

  if (now >= blink.nextBlinkAt) {
    blink.eyesClosed = true;
    blink.reopenAt =
      now + randomBetween(MIN_BLINK_HOLD_MS, MAX_BLINK_HOLD_MS);
    return true;
  }

  return false;
}

function updateIdleTarget(
  targetPose: Pose,
  avatarPackage: PuruPuruAvatarPackage | null,
  idlePhaseSeconds: number,
  now: number,
  reactionState: ReactionState,
  gaze: number,
  idleMotionEnabled: boolean,
): void {
  const reaction = reactionState.current;
  const reactionWeight = reaction ? reactionState.weight : 0;
  const idleScale = reaction
    ? mix(1, reaction.sustain.idleScale, reactionWeight)
    : 1;
  const reactionTilt = reaction
    ? reaction.sustain.tilt * reactionWeight
    : 0;
  const reactionOffsetY = reaction
    ? reaction.sustain.offsetY * reactionWeight
    : 0;
  const shake =
    reactionState.shakeStrength > 0
      ? Math.sin((now / 1000) * 56) * reactionState.shakeStrength
      : 0;

  const settings = avatarPackage?.settings;
  const sourceWidth =
    avatarPackage?.settings.sourceImageWidth ||
    avatarPackage?.images.eyesOpenMouthClosed.width ||
    1024;
  const gazeOffset = gaze * sourceWidth * GAZE_TURN_OFFSET_RATIO;
  const gazeTilt = gaze * GAZE_TURN_TILT;
  if (!settings) {
    targetPose.x = shake * 2;
    targetPose.y = reactionOffsetY;
    targetPose.rotation = reactionState.transientTilt;
    targetPose.scale = 1 + reactionState.transientScale;
    return;
  }

  if (!idleMotionEnabled) {
    targetPose.x = shake * 2;
    targetPose.y = reactionOffsetY;
    targetPose.rotation = reactionTilt + reactionState.transientTilt;
    targetPose.scale = 1 + reactionState.transientScale;
    return;
  }

  const seconds = idlePhaseSeconds;
  const breathPixels = settings.breathStrength * 0.18 * idleScale;
  const rollRadians = settings.rollStrength * 0.0016 * idleScale;
  targetPose.x =
    Math.sin(seconds * 0.72) * settings.rollStrength * 0.18 * idleScale +
    shake * 2 +
    gazeOffset;
  targetPose.y =
    Math.sin(seconds * Math.PI * 2 * 0.34) * breathPixels -
    Math.max(0, settings.breathStrength) * 0.08 +
    reactionOffsetY;
  targetPose.rotation =
    Math.sin(seconds * 0.64) * rollRadians +
    gazeTilt +
    reactionTilt +
    reactionState.transientTilt +
    shake * 0.006;
  targetPose.scale =
    1 +
    Math.sin(seconds * Math.PI * 2 * 0.34) * 0.006 * idleScale +
    reactionState.transientScale;
}

function followPose(pose: Pose, targetPose: Pose): void {
  pose.x += (targetPose.x - pose.x) * POSE_FOLLOW;
  pose.y += (targetPose.y - pose.y) * POSE_FOLLOW;
  pose.rotation += (targetPose.rotation - pose.rotation) * POSE_FOLLOW;
  pose.scale += (targetPose.scale - pose.scale) * POSE_FOLLOW;
}

function renderFrame(
  context: CanvasRenderingContext2D,
  options: RendererOptions,
  pose: Pose,
  eyesClosed: boolean,
  hair: HairRigOutput,
  gaze: number,
): void {
  const canvas = options.canvas;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const avatarPackage = options.getAvatarPackage();
  if (!avatarPackage) {
    return;
  }

  const mouthState = resolveMouthState(
    options.getVoiceLevel(),
    options.getIsSpeaking(),
  );
  const faceKey = selectFaceKey(
    eyesClosed ? 'closed' : 'open',
    mouthState,
  );
  const { images, itemLayers } = avatarPackage;
  const parallax = createLayerParallax(
    images.eyesOpenMouthClosed,
    gaze,
    avatarPackage.settings,
  );
  const viewTransform = sanitizeViewTransform(options.getViewTransform());

  drawStageItemLayers(context, canvas, avatarPackage, itemLayers, 'stageBack');

  context.save();
  applyAvatarTransform(context, canvas, avatarPackage, pose, viewTransform);
  drawRigidItemLayers(context, itemLayers, 'characterBack');
  drawHairLayer(context, images.backHair, hair.back, parallax.backHair);
  drawSpringItemLayers(
    context,
    itemLayers,
    'faceBack',
    hair.back,
    images.backHair,
    parallax.backHair,
  );
  drawImageCentered(context, images[faceKey], parallax.face);
  drawRigidItemLayers(context, itemLayers, 'faceFront', parallax.face);
  drawHairLayer(context, images.frontHair, hair.front, parallax.frontHair);
  drawSpringItemLayers(
    context,
    itemLayers,
    'frontHairFront',
    hair.front,
    images.frontHair,
    parallax.frontHair,
  );
  context.restore();

  drawStageItemLayers(context, canvas, avatarPackage, itemLayers, 'stageFront');
}

function applyAvatarTransform(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  avatarPackage: PuruPuruAvatarPackage,
  pose: Pose,
  viewTransform: AvatarViewTransform,
): void {
  const settings = avatarPackage.settings;
  const baseScale = calculateAvatarBaseScale(canvas, avatarPackage);
  const ratioX = canvas.width / Math.max(1, canvas.clientWidth || canvas.width);
  const ratioY =
    canvas.height / Math.max(1, canvas.clientHeight || canvas.height);

  context.translate(
    canvas.width / 2 + settings.avatarX + pose.x + viewTransform.x * ratioX,
    canvas.height / 2 + settings.avatarY + pose.y + viewTransform.y * ratioY,
  );
  context.rotate(pose.rotation);
  context.scale(
    baseScale * viewTransform.scale,
    baseScale * viewTransform.scale * pose.scale,
  );
}

function calculateAvatarBaseScale(
  canvas: HTMLCanvasElement,
  avatarPackage: PuruPuruAvatarPackage,
): number {
  const settings = avatarPackage.settings;
  const sourceWidth =
    settings.sourceImageWidth || avatarPackage.images.eyesOpenMouthClosed.width;
  const sourceHeight =
    settings.sourceImageHeight ||
    avatarPackage.images.eyesOpenMouthClosed.height;
  const fitScale = Math.min(
    (canvas.width * 0.78) / sourceWidth,
    (canvas.height * 0.94) / sourceHeight,
  );
  const packageScale = Math.max(0.1, settings.avatarSize / 100);
  return fitScale * packageScale;
}

function drawImageCentered(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  offsetX = 0,
): void {
  context.drawImage(image, -image.width / 2 + offsetX, -image.height / 2);
}

function drawHairLayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  spring: HairSpringOutput,
  parallaxX: number,
): void {
  context.save();
  context.translate(parallaxX, 0);
  applyHairSpringTransform(context, image, spring, 1);
  drawImageCentered(context, image);
  context.restore();
}

function drawStageItemLayers(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  avatarPackage: PuruPuruAvatarPackage,
  itemLayers: PuruPuruItemLayer[],
  slot: ItemLayerSlot,
): void {
  context.save();
  const baseScale = calculateAvatarBaseScale(canvas, avatarPackage);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.scale(baseScale, baseScale);
  drawRigidItemLayers(context, itemLayers, slot);
  context.restore();
}

function drawRigidItemLayers(
  context: CanvasRenderingContext2D,
  itemLayers: PuruPuruItemLayer[],
  slot: ItemLayerSlot,
  offsetX = 0,
): void {
  for (const layer of itemLayers) {
    if (!shouldDrawItemLayer(layer, slot)) continue;
    context.save();
    context.translate(offsetX, 0);
    applyItemLayerTransform(context, layer);
    drawImageCentered(context, layer.image);
    context.restore();
  }
}

function drawSpringItemLayers(
  context: CanvasRenderingContext2D,
  itemLayers: PuruPuruItemLayer[],
  slot: ItemLayerSlot,
  spring: HairSpringOutput,
  hairImage: HTMLImageElement,
  parallaxX: number,
): void {
  for (const layer of itemLayers) {
    if (!shouldDrawItemLayer(layer, slot)) continue;
    context.save();
    context.translate(parallaxX, 0);
    applyHairSpringTransform(
      context,
      hairImage,
      spring,
      layer.followStrength / 100,
    );
    applyItemLayerTransform(context, layer);
    drawImageCentered(context, layer.image);
    context.restore();
  }
}

function shouldDrawItemLayer(
  layer: PuruPuruItemLayer,
  slot: ItemLayerSlot,
): boolean {
  return layer.visible && normalizeItemLayerSlot(layer.slot) === slot;
}

function normalizeItemLayerSlot(slot: string): ItemLayerSlot {
  return ITEM_LAYER_SLOTS.has(slot)
    ? (slot as ItemLayerSlot)
    : FALLBACK_ITEM_LAYER_SLOT;
}

function applyItemLayerTransform(
  context: CanvasRenderingContext2D,
  layer: PuruPuruItemLayer,
): void {
  context.globalAlpha = Math.max(0, Math.min(layer.opacity / 100, 1));
  context.translate(layer.x, layer.y);
  context.rotate((layer.rotation * Math.PI) / 180);
  const scale = Math.max(0.01, layer.scale / 100);
  context.scale(scale, scale);
}

function createLayerParallax(
  faceImage: HTMLImageElement,
  gaze: number,
  settings: PuruPuruAvatarSettings,
): LayerParallax {
  const width = faceImage.width || 1024;
  const backHairRatio =
    settings.backHairParallaxRatio ?? BACK_HAIR_PARALLAX_RATIO;
  const faceRatio = settings.faceParallaxRatio ?? FACE_PARALLAX_RATIO;
  const frontHairRatio =
    settings.frontHairParallaxRatio ?? FRONT_HAIR_PARALLAX_RATIO;

  return {
    backHair: gaze * width * backHairRatio,
    face: gaze * width * faceRatio,
    frontHair: gaze * width * frontHairRatio,
  };
}

function applyHairSpringTransform(
  context: CanvasRenderingContext2D,
  hairImage: HTMLImageElement,
  spring: HairSpringOutput,
  followStrength: number,
): void {
  const follow = clamp(followStrength, 0, 2);
  if (follow <= 0) return;

  const anchorY = -hairImage.height * 0.38;
  context.translate(spring.offsetX * follow, spring.offsetY * follow);
  context.translate(0, anchorY);
  context.rotate(spring.angle * follow);
  context.scale(
    1 + (spring.stretchX - 1) * follow,
    1 + (spring.stretchY - 1) * follow,
  );
  context.translate(0, -anchorY);
}

function sanitizeViewTransform(
  transform: AvatarViewTransform,
): AvatarViewTransform {
  return {
    x: clampFinite(transform.x, -AVATAR_VIEW_MAX_OFFSET, AVATAR_VIEW_MAX_OFFSET),
    y: clampFinite(transform.y, -AVATAR_VIEW_MAX_OFFSET, AVATAR_VIEW_MAX_OFFSET),
    scale: clampFinite(
      transform.scale,
      AVATAR_VIEW_MIN_SCALE,
      AVATAR_VIEW_MAX_SCALE,
      1,
    ),
  };
}

function clampFinite(
  value: number,
  min: number,
  max: number,
  fallback = 0,
): number {
  return clamp(Number.isFinite(value) ? value : fallback, min, max);
}

function updateHairRig(
  avatarPackage: PuruPuruAvatarPackage | null,
  backHairSpring: ReturnType<typeof createHairSpringState>,
  frontHairSpring: ReturnType<typeof createHairSpringState>,
  deltaSeconds: number,
  poseVelocity: Pick<Pose, 'x' | 'y' | 'rotation'>,
): HairRigOutput {
  const hairSpring = avatarPackage?.settings.hairSpring ?? 0;
  return {
    back: updateHairSpring(backHairSpring, {
      deltaSeconds,
      hairSpring,
      poseVelocityX: poseVelocity.x,
      poseVelocityY: poseVelocity.y,
      poseRotationVelocity: poseVelocity.rotation,
      layerResponse: 0.72,
    }),
    front: updateHairSpring(frontHairSpring, {
      deltaSeconds,
      hairSpring,
      poseVelocityX: poseVelocity.x,
      poseVelocityY: poseVelocity.y,
      poseRotationVelocity: poseVelocity.rotation,
      layerResponse: 1,
    }),
  };
}

function calculatePoseVelocity(
  pose: Pose,
  previousPose: Pose,
  deltaSeconds: number,
): Pick<Pose, 'x' | 'y' | 'rotation'> {
  if (deltaSeconds <= 0) {
    return { x: 0, y: 0, rotation: 0 };
  }

  return {
    x: (pose.x - previousPose.x) / deltaSeconds,
    y: (pose.y - previousPose.y) / deltaSeconds,
    rotation: (pose.rotation - previousPose.rotation) / deltaSeconds,
  };
}

function copyPose(target: Pose, source: Pose): void {
  target.x = source.x;
  target.y = source.y;
  target.rotation = source.rotation;
  target.scale = source.scale;
}

function updateReactionState(
  state: ReactionState,
  deltaSeconds: number,
): void {
  const delta = clamp(deltaSeconds, 0, 0.05);
  if (delta <= 0) return;

  const fadeMs = state.current?.fadeMs ?? DEFAULT_REACTION_FADE_MS;
  const fadeSeconds = clamp(fadeMs / 1000, 0.12, 0.8);
  const weightFollow = 1 - Math.exp((-delta * 5.5) / fadeSeconds);
  state.weight += (state.targetWeight - state.weight) * weightFollow;
  if (state.targetWeight === 0 && state.weight < 0.002) {
    state.weight = 0;
    state.current = null;
  }

  integrateTransientAxis(
    state,
    'transientTilt',
    'transientTiltVelocity',
    42,
    13,
    delta,
  );
  integrateTransientAxis(
    state,
    'transientScale',
    'transientScaleVelocity',
    52,
    15,
    delta,
  );
  state.shakeStrength = Math.max(0, state.shakeStrength - delta * 2.8);
  clampReactionState(state);
}

function getReactionIdleSpeedScale(state: ReactionState): number {
  const reaction = state.current;
  if (!reaction) return 1;
  return mix(1, reaction.sustain.idleSpeedScale, state.weight);
}

function getReactionIdleAmplitudeScale(state: ReactionState): number {
  const reaction = state.current;
  if (!reaction) return 1;
  return mix(1, reaction.sustain.idleScale, state.weight);
}

function integrateTransientAxis(
  state: ReactionState,
  positionKey: 'transientTilt' | 'transientScale',
  velocityKey: 'transientTiltVelocity' | 'transientScaleVelocity',
  stiffness: number,
  damping: number,
  deltaSeconds: number,
): void {
  state[velocityKey] +=
    (-state[positionKey] * stiffness - state[velocityKey] * damping) *
    deltaSeconds;
  state[positionKey] += state[velocityKey] * deltaSeconds;
}

function normalizeReaction(reaction: unknown): NormalizedReaction {
  const source: Partial<PuruPuruReaction> =
    reaction && typeof reaction === 'object'
      ? (reaction as PuruPuruReaction)
      : {};

  return {
    impulse: {
      bounce: clampNumber(source.impulse?.bounce, 0, -1.2, 1.2),
      tilt: clampNumber(source.impulse?.tilt, 0, -1, 1),
      shake: clampNumber(source.impulse?.shake, 0, 0, 1),
      scalePop: clampNumber(source.impulse?.scalePop, 0, -1, 1),
    },
    sustain: {
      offsetY: clampNumber(source.sustain?.offsetY, 0, -24, 24),
      tilt: clampNumber(source.sustain?.tilt, 0, -0.08, 0.08),
      idleScale: clampNumber(source.sustain?.idleScale, 1, 0.35, 1.5),
      idleSpeedScale: clampNumber(
        source.sustain?.idleSpeedScale,
        1,
        0.45,
        1.6,
      ),
    },
    fadeMs: clampNumber(source.fadeMs, DEFAULT_REACTION_FADE_MS, 120, 800),
  };
}

function clampReactionState(state: ReactionState): void {
  state.weight = sanitize(clamp(state.weight, 0, 1), 0);
  state.targetWeight = sanitize(clamp(state.targetWeight, 0, 1), 0);
  state.transientTilt = sanitize(clamp(state.transientTilt, -0.08, 0.08), 0);
  state.transientTiltVelocity = sanitize(
    clamp(state.transientTiltVelocity, -1.2, 1.2),
    0,
  );
  state.transientScale = sanitize(clamp(state.transientScale, -0.035, 0.035), 0);
  state.transientScaleVelocity = sanitize(
    clamp(state.transientScaleVelocity, -0.8, 0.8),
    0,
  );
  state.shakeStrength = sanitize(clamp(state.shakeStrength, 0, 1), 0);
}

function resolveMouthState(
  smoothedValue: number,
  isSpeaking: boolean,
): PuruPuruMouthState {
  if (!isSpeaking) return 'closed';
  const normalized = Math.min(Math.max(smoothedValue / RMS_CEILING, 0), 1);
  if (normalized >= OPEN_MOUTH_THRESHOLD) return 'open';
  if (normalized >= HALF_MOUTH_THRESHOLD) return 'half';
  return 'closed';
}

function randomBlinkDelay(): number {
  return randomBetween(MIN_BLINK_DELAY_MS, MAX_BLINK_DELAY_MS);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitize(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
