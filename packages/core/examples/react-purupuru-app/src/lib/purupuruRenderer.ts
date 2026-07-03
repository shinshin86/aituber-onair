import type {
  PuruPuruAvatarPackage,
  PuruPuruItemLayer,
  PuruPuruMouthState,
} from './purupuruPackage';
import { selectFaceKey } from './purupuruPackage';

interface RendererOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  getAvatarPackage: () => PuruPuruAvatarPackage | null;
  getVoiceLevel: () => number;
  getIsSpeaking: () => boolean;
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

const RMS_CEILING = 0.12;
const HALF_MOUTH_THRESHOLD = 0.22;
const OPEN_MOUTH_THRESHOLD = 0.78;
const MIN_BLINK_DELAY_MS = 2000;
const MAX_BLINK_DELAY_MS = 6000;
const MIN_BLINK_HOLD_MS = 100;
const MAX_BLINK_HOLD_MS = 200;
const POSE_FOLLOW = 0.08;

export function createPuruPuruRenderer(options: RendererOptions): () => void {
  const context = options.canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D rendering is not supported.');
  }

  const pose: Pose = { x: 0, y: 0, rotation: 0, scale: 1 };
  const targetPose: Pose = { x: 0, y: 0, rotation: 0, scale: 1 };
  const blink: BlinkState = {
    eyesClosed: false,
    nextBlinkAt: performance.now() + randomBlinkDelay(),
    reopenAt: 0,
  };

  let animationFrameId = 0;
  let disposed = false;

  const resizeObserver = new ResizeObserver(() => resizeCanvas(options));
  resizeObserver.observe(options.container);
  resizeCanvas(options);

  const frame = (now: number) => {
    if (disposed) return;
    resizeCanvas(options);
    updateBlink(blink, now);
    updateIdleTarget(targetPose, options.getAvatarPackage(), now);
    followPose(pose, targetPose);
    renderFrame(context, options, pose, blink.eyesClosed);
    animationFrameId = requestAnimationFrame(frame);
  };

  animationFrameId = requestAnimationFrame(frame);

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrameId);
    resizeObserver.disconnect();
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

function updateBlink(blink: BlinkState, now: number): void {
  if (blink.eyesClosed) {
    if (now >= blink.reopenAt) {
      blink.eyesClosed = false;
      blink.nextBlinkAt = now + randomBlinkDelay();
    }
    return;
  }

  if (now >= blink.nextBlinkAt) {
    blink.eyesClosed = true;
    blink.reopenAt =
      now + randomBetween(MIN_BLINK_HOLD_MS, MAX_BLINK_HOLD_MS);
  }
}

function updateIdleTarget(
  targetPose: Pose,
  avatarPackage: PuruPuruAvatarPackage | null,
  now: number,
): void {
  const settings = avatarPackage?.settings;
  if (!settings?.idleMotionEnabled) {
    targetPose.x = 0;
    targetPose.y = 0;
    targetPose.rotation = 0;
    targetPose.scale = 1;
    return;
  }

  const seconds = now / 1000;
  const breathPixels = settings.breathStrength * 0.18;
  const rollRadians = settings.rollStrength * 0.0016;
  targetPose.x = Math.sin(seconds * 0.72) * settings.rollStrength * 0.18;
  targetPose.y =
    Math.sin(seconds * Math.PI * 2 * 0.34) * breathPixels -
    Math.max(0, settings.breathStrength) * 0.08;
  targetPose.rotation = Math.sin(seconds * 0.64) * rollRadians;
  targetPose.scale = 1 + Math.sin(seconds * Math.PI * 2 * 0.34) * 0.006;
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
): void {
  const canvas = options.canvas;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const avatarPackage = options.getAvatarPackage();
  if (!avatarPackage) {
    drawFallbackAvatar(
      context,
      canvas.width,
      canvas.height,
      resolveMouthState(options.getVoiceLevel(), options.getIsSpeaking()),
      eyesClosed,
      pose,
    );
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

  context.save();
  applyAvatarTransform(context, canvas, avatarPackage, pose);
  drawImageCentered(context, images.backHair);
  drawImageCentered(context, images[faceKey]);
  drawItemLayers(context, itemLayers, 'backHairFront');
  drawImageCentered(context, images.frontHair);
  drawItemLayers(context, itemLayers, 'frontHairFront');
  context.restore();
}

function applyAvatarTransform(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  avatarPackage: PuruPuruAvatarPackage,
  pose: Pose,
): void {
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

  context.translate(
    canvas.width / 2 + settings.avatarX + pose.x,
    canvas.height / 2 + settings.avatarY + pose.y,
  );
  context.rotate(pose.rotation);
  context.scale(fitScale * packageScale * pose.scale, fitScale * packageScale);
}

function drawImageCentered(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
): void {
  context.drawImage(image, -image.width / 2, -image.height / 2);
}

function drawItemLayers(
  context: CanvasRenderingContext2D,
  itemLayers: PuruPuruItemLayer[],
  slot: string,
): void {
  for (const layer of itemLayers) {
    if (!layer.visible || layer.slot !== slot) continue;
    context.save();
    context.globalAlpha = Math.max(0, Math.min(layer.opacity / 100, 1));
    context.translate(layer.x, layer.y);
    context.rotate((layer.rotation * Math.PI) / 180);
    const scale = Math.max(0.01, layer.scale / 100);
    context.scale(scale, scale);
    drawImageCentered(context, layer.image);
    context.restore();
  }
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

function drawFallbackAvatar(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  mouthState: PuruPuruMouthState,
  eyesClosed: boolean,
  pose: Pose,
): void {
  const size = Math.min(width, height) * 0.46;
  const centerX = width / 2 + pose.x;
  const centerY = height / 2 + pose.y;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(pose.rotation);
  context.scale(pose.scale, pose.scale);

  context.fillStyle = '#fde2c7';
  context.strokeStyle = '#7c4a2d';
  context.lineWidth = Math.max(3, size * 0.025);
  context.beginPath();
  context.arc(0, 0, size, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = '#3c2f2f';
  context.fillStyle = '#3c2f2f';
  context.lineCap = 'round';
  context.lineWidth = Math.max(3, size * 0.045);
  drawFallbackEye(context, -size * 0.36, -size * 0.18, eyesClosed, size);
  drawFallbackEye(context, size * 0.36, -size * 0.18, eyesClosed, size);

  const mouthWidth =
    mouthState === 'open'
      ? size * 0.28
      : mouthState === 'half'
        ? size * 0.22
        : size * 0.18;
  const mouthHeight =
    mouthState === 'open'
      ? size * 0.22
      : mouthState === 'half'
        ? size * 0.1
        : size * 0.025;
  context.fillStyle = mouthState === 'closed' ? '#3c2f2f' : '#9d2735';
  context.beginPath();
  context.ellipse(
    0,
    size * 0.26,
    mouthWidth,
    mouthHeight,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawFallbackEye(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  eyesClosed: boolean,
  size: number,
): void {
  if (eyesClosed) {
    context.beginPath();
    context.moveTo(x - size * 0.1, y);
    context.lineTo(x + size * 0.1, y);
    context.stroke();
    return;
  }

  context.beginPath();
  context.arc(x, y, size * 0.075, 0, Math.PI * 2);
  context.fill();
}

function randomBlinkDelay(): number {
  return randomBetween(MIN_BLINK_DELAY_MS, MAX_BLINK_DELAY_MS);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
