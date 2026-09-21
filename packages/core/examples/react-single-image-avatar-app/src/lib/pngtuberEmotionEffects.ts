export const PNGTUBER_EMOTION_EFFECTS = [
  'happy',
  'surprised',
  'sad',
  'angry',
  'relaxed',
  'thinking',
] as const;

export type PngTuberEmotionEffect = (typeof PNGTUBER_EMOTION_EFFECTS)[number];

export const PNGTUBER_REACTION_EMOTIONS = [
  ...PNGTUBER_EMOTION_EFFECTS,
  'neutral',
] as const;

export type PngTuberReactionEmotion =
  (typeof PNGTUBER_REACTION_EMOTIONS)[number];
export type PngTuberReactionControlMode = 'none' | 'manual' | 'linked';
export type PngTuberEmotionEffectMap = Record<
  PngTuberReactionEmotion,
  PngTuberEmotionEffect | null
>;

export const DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP: PngTuberEmotionEffectMap = {
  happy: 'happy',
  surprised: 'surprised',
  sad: 'sad',
  angry: 'angry',
  relaxed: 'relaxed',
  thinking: 'thinking',
  neutral: null,
};

export interface PngTuberEmotionReactionDraft {
  effect: PngTuberEmotionEffect;
  durationMs?: number;
}

export type PngTuberEmotionReaction = PngTuberEmotionReactionDraft & {
  id: number;
};

interface PngTuberEffectGeometry {
  faceX: number;
  faceY: number;
  leftEyeX: number;
  leftEyeY: number;
  rightEyeX: number;
  rightEyeY: number;
  unit: number;
}

const MIN_EFFECT_WEIGHT = 0.002;
const TWO_PI = Math.PI * 2;
const AURA_COLORS: Record<PngTuberEmotionEffect, string> = {
  happy: 'rgba(255, 205, 70, 0.34)',
  surprised: 'rgba(255, 242, 160, 0.36)',
  sad: 'rgba(72, 145, 230, 0.3)',
  angry: 'rgba(238, 52, 73, 0.36)',
  relaxed: 'rgba(114, 232, 206, 0.28)',
  thinking: 'rgba(132, 178, 255, 0.24)',
};

export function createLinkedPngTuberEmotionReaction(
  controlMode: PngTuberReactionControlMode,
  screenplay: unknown,
  effectMap: PngTuberEmotionEffectMap,
): PngTuberEmotionReactionDraft | null {
  if (
    controlMode !== 'linked' ||
    !screenplay ||
    typeof screenplay !== 'object'
  ) {
    return null;
  }
  const emotion = (screenplay as { emotion?: unknown }).emotion;
  if (typeof emotion !== 'string') return null;
  const normalized = emotion.toLowerCase().trim();
  if (!isPngTuberReactionEmotion(normalized)) return null;
  const effect = effectMap[normalized];
  return effect ? { effect } : null;
}

export function normalizePngTuberEmotionEffectMap(
  value: unknown,
): PngTuberEmotionEffectMap {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<PngTuberEmotionEffectMap>)
      : {};

  return Object.fromEntries(
    PNGTUBER_REACTION_EMOTIONS.map((emotion) => {
      const candidate = source[emotion];
      const effect =
        candidate === null || isPngTuberEmotionEffect(candidate)
          ? candidate
          : DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP[emotion];
      return [emotion, effect];
    }),
  ) as PngTuberEmotionEffectMap;
}

export function isPngTuberReactionControlMode(
  value: unknown,
): value is PngTuberReactionControlMode {
  return value === 'none' || value === 'manual' || value === 'linked';
}

export function withPngTuberEmotionReactionId(
  draft: PngTuberEmotionReactionDraft,
  id: number,
): PngTuberEmotionReaction {
  return { ...draft, id };
}

export function drawPngTuberEmotionEffectBack(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  effect: PngTuberEmotionEffect | null,
  weight: number,
  now: number,
  anchor: EmotionEffectAnchor,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;
  const geometry = createEffectGeometry(width, height, anchor);
  const pulse = 0.94 + Math.sin(now * 0.004) * 0.06;
  const radiusScale = effect === 'angry' ? 0.45 : 0.39;
  drawAura(
    context,
    geometry.faceX,
    geometry.faceY,
    geometry.unit * radiusScale * pulse,
    AURA_COLORS[effect],
    amount,
  );

  if (effect === 'surprised') {
    const ringProgress = (now % 1100) / 1100;
    context.save();
    context.globalAlpha = amount * (1 - ringProgress) * 0.7;
    context.strokeStyle = '#fff0a0';
    context.lineWidth = Math.max(2, geometry.unit * 0.008);
    context.beginPath();
    context.arc(
      geometry.faceX,
      geometry.faceY,
      geometry.unit * (0.2 + ringProgress * 0.22),
      0,
      TWO_PI,
    );
    context.stroke();
    context.restore();
  }
}

export function drawPngTuberEmotionEffectFront(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  effect: PngTuberEmotionEffect | null,
  weight: number,
  now: number,
  anchor: EmotionEffectAnchor,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;
  const geometry = createEffectGeometry(width, height, anchor);
  if (effect === 'happy') drawHappy(context, geometry, amount, now);
  if (effect === 'surprised') drawSurprised(context, geometry, amount, now);
  if (effect === 'sad') drawSad(context, geometry, amount, now);
  if (effect === 'angry') drawAngry(context, geometry, amount, now);
  if (effect === 'relaxed') drawRelaxed(context, geometry, amount, now);
  if (effect === 'thinking') drawThinking(context, geometry, amount, now);
}

function drawHappy(
  context: CanvasRenderingContext2D,
  geometry: PngTuberEffectGeometry,
  amount: number,
  now: number,
): void {
  const positions = [
    [-0.3, -0.16],
    [0.31, -0.12],
    [-0.34, 0.05],
    [0.34, 0.09],
    [-0.22, 0.2],
    [0.24, 0.22],
  ];
  positions.forEach(([offsetX, offsetY], index) => {
    const twinkle = 0.7 + Math.sin(now * 0.006 + index * 1.7) * 0.3;
    drawSparkle(
      context,
      geometry.faceX + geometry.unit * offsetX,
      geometry.faceY + geometry.unit * offsetY,
      geometry.unit * (0.025 + (index % 2) * 0.009) * twinkle,
      amount,
    );
  });
}

function drawSurprised(
  context: CanvasRenderingContext2D,
  geometry: PngTuberEffectGeometry,
  amount: number,
  now: number,
): void {
  const pulse = 0.92 + Math.sin(now * 0.008) * 0.08;
  context.save();
  context.globalAlpha = amount;
  context.strokeStyle = '#fff2a7';
  context.lineCap = 'round';
  context.lineWidth = Math.max(3, geometry.unit * 0.012);
  for (let index = 0; index < 10; index += 1) {
    const angle = (TWO_PI * index) / 10 - Math.PI / 2;
    const inner = geometry.unit * 0.27 * pulse;
    const outer = geometry.unit * (index % 2 ? 0.38 : 0.43) * pulse;
    context.beginPath();
    context.moveTo(
      geometry.faceX + Math.cos(angle) * inner,
      geometry.faceY + Math.sin(angle) * inner,
    );
    context.lineTo(
      geometry.faceX + Math.cos(angle) * outer,
      geometry.faceY + Math.sin(angle) * outer,
    );
    context.stroke();
  }
  context.restore();
}

function drawSad(
  context: CanvasRenderingContext2D,
  geometry: PngTuberEffectGeometry,
  amount: number,
  now: number,
): void {
  const fall = ((now / 1000) % 1.1) * geometry.unit * 0.1;
  drawTear(
    context,
    geometry.leftEyeX,
    geometry.leftEyeY + geometry.unit * 0.045 + fall,
    geometry.unit * 0.018,
    amount,
  );
  drawTear(
    context,
    geometry.rightEyeX,
    geometry.rightEyeY + geometry.unit * 0.05 + fall * 0.7,
    geometry.unit * 0.014,
    amount * 0.85,
  );
}

function drawAngry(
  context: CanvasRenderingContext2D,
  geometry: PngTuberEffectGeometry,
  amount: number,
  now: number,
): void {
  const pulse = 0.9 + Math.sin(now * 0.012) * 0.1;
  const centerX = geometry.faceX + geometry.unit * 0.25;
  const centerY = geometry.faceY - geometry.unit * 0.17;
  const size = geometry.unit * 0.07 * pulse;
  context.save();
  context.globalAlpha = amount;
  context.strokeStyle = '#ef4359';
  context.lineWidth = Math.max(4, geometry.unit * 0.014);
  context.lineCap = 'round';
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    context.beginPath();
    context.moveTo(centerX + sx * size, centerY + sy * size);
    context.lineTo(centerX + sx * size * 0.25, centerY + sy * size * 0.25);
    context.lineTo(centerX + sx * size * 0.25, centerY - sy * size * 0.45);
    context.stroke();
  }
  context.restore();
}

function drawRelaxed(
  context: CanvasRenderingContext2D,
  geometry: PngTuberEffectGeometry,
  amount: number,
  now: number,
): void {
  const bubbles = [
    [-0.3, 0.13, 0.035],
    [0.31, 0.05, 0.024],
    [-0.24, -0.12, 0.02],
    [0.27, 0.2, 0.042],
  ];
  bubbles.forEach(([offsetX, offsetY, radius], index) => {
    const drift = Math.sin(now * 0.0015 + index) * geometry.unit * 0.015;
    context.save();
    context.globalAlpha = amount * 0.8;
    context.strokeStyle = '#9af1df';
    context.lineWidth = Math.max(2, geometry.unit * 0.007);
    context.beginPath();
    context.arc(
      geometry.faceX + geometry.unit * offsetX + drift,
      geometry.faceY + geometry.unit * offsetY - drift,
      geometry.unit * radius,
      0,
      TWO_PI,
    );
    context.stroke();
    context.restore();
  });
}

function drawThinking(
  context: CanvasRenderingContext2D,
  geometry: PngTuberEffectGeometry,
  amount: number,
  now: number,
): void {
  const drift = Math.sin(now * 0.002) * geometry.unit * 0.012;
  const centerX = geometry.faceX + geometry.unit * 0.29;
  const centerY = geometry.faceY - geometry.unit * 0.16 + drift;
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = 'rgba(210, 228, 255, 0.88)';
  context.strokeStyle = '#79a9ed';
  context.lineWidth = Math.max(2, geometry.unit * 0.007);
  for (const [offsetX, offsetY, radius] of [
    [0, 0, 0.055],
    [0.055, -0.01, 0.045],
    [-0.05, 0.008, 0.04],
    [-0.08, 0.08, 0.018],
    [-0.13, 0.13, 0.012],
  ]) {
    context.beginPath();
    context.arc(
      centerX + geometry.unit * offsetX,
      centerY + geometry.unit * offsetY,
      geometry.unit * radius,
      0,
      TWO_PI,
    );
    context.fill();
    context.stroke();
  }
  context.restore();
}

export function drawPngTuberEmotionEffectAnchorGuides(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  anchor: EmotionEffectAnchor,
): void {
  drawAnchorMarker(
    context,
    width * anchor.faceX,
    height * anchor.faceY,
    '#ffcf5a',
    '顔',
  );
  drawAnchorMarker(
    context,
    width * anchor.leftEyeX,
    height * anchor.leftEyeY,
    '#63c8ff',
    '左目',
  );
  drawAnchorMarker(
    context,
    width * anchor.rightEyeX,
    height * anchor.rightEyeY,
    '#ff82b2',
    '右目',
  );
}

function drawAnchorMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: string,
) {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, 8, 0, Math.PI * 2);
  context.moveTo(x - 12, y);
  context.lineTo(x + 12, y);
  context.moveTo(x, y - 12);
  context.lineTo(x, y + 12);
  context.stroke();
  context.font = 'bold 12px sans-serif';
  context.fillText(label, x + 12, y - 10);
  context.restore();
}

function drawSparkle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  amount: number,
): void {
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = '#ffe775';
  context.strokeStyle = '#fff6bf';
  context.lineWidth = Math.max(1.5, radius * 0.18);
  context.beginPath();
  context.moveTo(x, y - radius * 1.8);
  context.lineTo(x + radius * 0.45, y - radius * 0.45);
  context.lineTo(x + radius * 1.8, y);
  context.lineTo(x + radius * 0.45, y + radius * 0.45);
  context.lineTo(x, y + radius * 1.8);
  context.lineTo(x - radius * 0.45, y + radius * 0.45);
  context.lineTo(x - radius * 1.8, y);
  context.lineTo(x - radius * 0.45, y - radius * 0.45);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawTear(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  amount: number,
): void {
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = 'rgba(93, 190, 255, 0.92)';
  context.strokeStyle = '#d6f3ff';
  context.lineWidth = Math.max(1.5, radius * 0.18);
  context.beginPath();
  context.moveTo(x, y - radius * 1.4);
  context.bezierCurveTo(
    x + radius * 1.15,
    y - radius * 0.2,
    x + radius,
    y + radius * 1.2,
    x,
    y + radius * 1.35,
  );
  context.bezierCurveTo(
    x - radius,
    y + radius * 1.2,
    x - radius * 1.15,
    y - radius * 0.2,
    x,
    y - radius * 1.4,
  );
  context.fill();
  context.stroke();
  context.restore();
}

function drawAura(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  amount: number,
): void {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.6, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, TWO_PI);
  context.fill();
  context.restore();
}

function createEffectGeometry(
  width: number,
  height: number,
  anchor: EmotionEffectAnchor,
): PngTuberEffectGeometry {
  return {
    faceX: width * anchor.faceX,
    faceY: height * anchor.faceY,
    leftEyeX: width * anchor.leftEyeX,
    leftEyeY: height * anchor.leftEyeY,
    rightEyeX: width * anchor.rightEyeX,
    rightEyeY: height * anchor.rightEyeY,
    unit: Math.min(width, height) * anchor.effectScale,
  };
}

function clampWeight(weight: number): number {
  return Math.min(Math.max(Number.isFinite(weight) ? weight : 0, 0), 1);
}

function isPngTuberEmotionEffect(
  value: unknown,
): value is PngTuberEmotionEffect {
  return PNGTUBER_EMOTION_EFFECTS.some((effect) => effect === value);
}

function isPngTuberReactionEmotion(
  value: unknown,
): value is PngTuberReactionEmotion {
  return PNGTUBER_REACTION_EMOTIONS.some((emotion) => emotion === value);
}
import type { EmotionEffectAnchor } from './emotionEffectAnchor';
