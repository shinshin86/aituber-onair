export const PSD_EMOTION_EFFECTS = [
  'happy',
  'surprised',
  'sad',
  'angry',
  'relaxed',
  'thinking',
] as const;

export type PsdEmotionEffect = (typeof PSD_EMOTION_EFFECTS)[number];

export const PSD_REACTION_EMOTIONS = [
  ...PSD_EMOTION_EFFECTS,
  'neutral',
] as const;

export type PsdReactionEmotion = (typeof PSD_REACTION_EMOTIONS)[number];
export type PsdEmotionEffectControlMode = 'none' | 'manual' | 'linked';
export type PsdEmotionEffectMap = Record<
  PsdReactionEmotion,
  PsdEmotionEffect | null
>;

export interface PsdEmotionEffectAnchor {
  faceX: number;
  faceY: number;
  leftEyeX: number;
  leftEyeY: number;
  rightEyeX: number;
  rightEyeY: number;
  effectScale: number;
}

export interface PsdEmotionReactionDraft {
  effect: PsdEmotionEffect;
  durationMs?: number;
}

export type PsdEmotionReaction = PsdEmotionReactionDraft & { id: number };

export interface PsdEmotionEffectGeometry {
  width: number;
  height: number;
  anchor: PsdEmotionEffectAnchor;
}

export const DEFAULT_PSD_EMOTION_EFFECT_MAP: PsdEmotionEffectMap = {
  happy: 'happy',
  surprised: 'surprised',
  sad: 'sad',
  angry: 'angry',
  relaxed: 'relaxed',
  thinking: 'thinking',
  neutral: null,
};

export const DEFAULT_PSD_EMOTION_EFFECT_ANCHOR: PsdEmotionEffectAnchor = {
  faceX: 0.5,
  faceY: 0.27,
  leftEyeX: 0.405,
  leftEyeY: 0.375,
  rightEyeX: 0.605,
  rightEyeY: 0.36,
  effectScale: 1,
};

export const MIN_PSD_EFFECT_SCALE = 0.5;
export const MAX_PSD_EFFECT_SCALE = 1.5;

const MIN_EFFECT_WEIGHT = 0.002;
const TWO_PI = Math.PI * 2;
const AURA_COLORS: Record<PsdEmotionEffect, string> = {
  happy: 'rgba(255, 205, 70, 0.34)',
  surprised: 'rgba(255, 242, 160, 0.36)',
  sad: 'rgba(72, 145, 230, 0.3)',
  angry: 'rgba(238, 52, 73, 0.36)',
  relaxed: 'rgba(114, 232, 206, 0.28)',
  thinking: 'rgba(132, 178, 255, 0.24)',
};

export function isPsdEmotionEffectControlMode(
  value: unknown,
): value is PsdEmotionEffectControlMode {
  return value === 'none' || value === 'manual' || value === 'linked';
}

export function isPsdEmotionEffect(value: unknown): value is PsdEmotionEffect {
  return PSD_EMOTION_EFFECTS.some((effect) => effect === value);
}

export function normalizePsdEmotionEffectMap(
  value: unknown,
): PsdEmotionEffectMap {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<PsdEmotionEffectMap>)
      : {};

  return Object.fromEntries(
    PSD_REACTION_EMOTIONS.map((emotion) => {
      const candidate = source[emotion];
      const effect =
        candidate === null || isPsdEmotionEffect(candidate)
          ? candidate
          : DEFAULT_PSD_EMOTION_EFFECT_MAP[emotion];
      return [emotion, effect];
    }),
  ) as PsdEmotionEffectMap;
}

export function normalizePsdEmotionEffectAnchor(
  value: Partial<PsdEmotionEffectAnchor> | undefined,
): PsdEmotionEffectAnchor {
  return {
    faceX: normalizeRatio(
      value?.faceX,
      DEFAULT_PSD_EMOTION_EFFECT_ANCHOR.faceX,
    ),
    faceY: normalizeRatio(
      value?.faceY,
      DEFAULT_PSD_EMOTION_EFFECT_ANCHOR.faceY,
    ),
    leftEyeX: normalizeRatio(
      value?.leftEyeX,
      DEFAULT_PSD_EMOTION_EFFECT_ANCHOR.leftEyeX,
    ),
    leftEyeY: normalizeRatio(
      value?.leftEyeY,
      DEFAULT_PSD_EMOTION_EFFECT_ANCHOR.leftEyeY,
    ),
    rightEyeX: normalizeRatio(
      value?.rightEyeX,
      DEFAULT_PSD_EMOTION_EFFECT_ANCHOR.rightEyeX,
    ),
    rightEyeY: normalizeRatio(
      value?.rightEyeY,
      DEFAULT_PSD_EMOTION_EFFECT_ANCHOR.rightEyeY,
    ),
    effectScale: clampFinite(
      value?.effectScale,
      MIN_PSD_EFFECT_SCALE,
      MAX_PSD_EFFECT_SCALE,
      DEFAULT_PSD_EMOTION_EFFECT_ANCHOR.effectScale,
    ),
  };
}

export function getPsdEmotionEffectAnchor(
  anchors: Record<string, PsdEmotionEffectAnchor>,
  profileId: string | undefined,
): PsdEmotionEffectAnchor {
  return normalizePsdEmotionEffectAnchor(
    profileId ? anchors[profileId] : undefined,
  );
}

export function createPsdEmotionReactionFromScreenplay(
  screenplay: unknown,
  effectMap: PsdEmotionEffectMap = DEFAULT_PSD_EMOTION_EFFECT_MAP,
): PsdEmotionReactionDraft | null {
  if (!screenplay || typeof screenplay !== 'object') return null;
  const emotion = (screenplay as { emotion?: unknown }).emotion;
  if (typeof emotion !== 'string') return null;
  const normalized = emotion.toLowerCase().trim();
  if (!isPsdReactionEmotion(normalized)) return null;
  const effect = effectMap[normalized];
  return effect ? { effect } : null;
}

export function withPsdEmotionReactionId(
  draft: PsdEmotionReactionDraft,
  id: number,
): PsdEmotionReaction {
  return { ...draft, id };
}

export function drawPsdEmotionEffectBack(
  context: CanvasRenderingContext2D,
  geometry: PsdEmotionEffectGeometry,
  effect: PsdEmotionEffect | null,
  weight: number,
  now: number,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;

  const { x, y } = facePoint(geometry);
  const unit = effectUnit(geometry);
  const pulse = 0.94 + Math.sin(now * 0.004) * 0.06;
  const radiusScale = effect === 'angry' ? 0.45 : 0.39;
  drawAura(
    context,
    x,
    y,
    unit * radiusScale * pulse,
    AURA_COLORS[effect],
    amount,
  );

  if (effect === 'surprised') {
    const ringProgress = (now % 1100) / 1100;
    context.save();
    context.globalAlpha = amount * (1 - ringProgress) * 0.7;
    context.strokeStyle = '#fff0a0';
    context.lineWidth = Math.max(2, unit * 0.008);
    context.beginPath();
    context.arc(x, y, unit * (0.2 + ringProgress * 0.22), 0, TWO_PI);
    context.stroke();
    context.restore();
  }
}

export function drawPsdEmotionEffectFront(
  context: CanvasRenderingContext2D,
  geometry: PsdEmotionEffectGeometry,
  effect: PsdEmotionEffect | null,
  weight: number,
  now: number,
): void {
  const amount = clampWeight(weight);
  if (!effect || amount < MIN_EFFECT_WEIGHT) return;

  if (effect === 'happy') drawHappy(context, geometry, amount, now);
  if (effect === 'surprised') drawSurprised(context, geometry, amount, now);
  if (effect === 'sad') drawSad(context, geometry, amount, now);
  if (effect === 'angry') drawAngry(context, geometry, amount, now);
  if (effect === 'relaxed') drawRelaxed(context, geometry, amount, now);
  if (effect === 'thinking') drawThinking(context, geometry, amount, now);
}

export function drawPsdEmotionEffectAnchorGuides(
  context: CanvasRenderingContext2D,
  geometry: PsdEmotionEffectGeometry,
): void {
  const points = [
    { label: '顔', color: '#ffd05e', ...facePoint(geometry) },
    {
      label: '左目',
      color: '#60d6ff',
      x: geometry.width * geometry.anchor.leftEyeX,
      y: geometry.height * geometry.anchor.leftEyeY,
    },
    {
      label: '右目',
      color: '#ff8dd8',
      x: geometry.width * geometry.anchor.rightEyeX,
      y: geometry.height * geometry.anchor.rightEyeY,
    },
  ];
  const size = Math.max(8, effectUnit(geometry) * 0.025);

  for (const point of points) {
    context.save();
    context.strokeStyle = point.color;
    context.fillStyle = point.color;
    context.lineWidth = Math.max(2, size * 0.16);
    context.beginPath();
    context.moveTo(point.x - size, point.y);
    context.lineTo(point.x + size, point.y);
    context.moveTo(point.x, point.y - size);
    context.lineTo(point.x, point.y + size);
    context.stroke();
    context.font = `600 ${Math.max(12, size * 0.8)}px sans-serif`;
    context.fillText(point.label, point.x + size * 0.7, point.y - size * 0.7);
    context.restore();
  }
}

function drawHappy(
  context: CanvasRenderingContext2D,
  geometry: PsdEmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const { x, y } = facePoint(geometry);
  const unit = effectUnit(geometry);
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
      x + unit * offsetX,
      y + unit * offsetY,
      unit * (0.025 + (index % 2) * 0.009) * twinkle,
      amount,
    );
  });
}

function drawSurprised(
  context: CanvasRenderingContext2D,
  geometry: PsdEmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const { x, y } = facePoint(geometry);
  const unit = effectUnit(geometry);
  const pulse = 0.92 + Math.sin(now * 0.008) * 0.08;
  context.save();
  context.globalAlpha = amount;
  context.strokeStyle = '#fff2a7';
  context.lineCap = 'round';
  context.lineWidth = Math.max(3, unit * 0.012);
  for (let index = 0; index < 10; index += 1) {
    const angle = (TWO_PI * index) / 10 - Math.PI / 2;
    const inner = unit * 0.27 * pulse;
    const outer = unit * (index % 2 ? 0.38 : 0.43) * pulse;
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    context.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    context.stroke();
  }
  context.restore();
}

function drawSad(
  context: CanvasRenderingContext2D,
  geometry: PsdEmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const unit = effectUnit(geometry);
  const fall = ((now / 1000) % 1.1) * unit * 0.1;
  drawTear(
    context,
    geometry.width * geometry.anchor.leftEyeX,
    geometry.height * geometry.anchor.leftEyeY + unit * 0.045 + fall,
    unit * 0.018,
    amount,
  );
  drawTear(
    context,
    geometry.width * geometry.anchor.rightEyeX,
    geometry.height * geometry.anchor.rightEyeY + unit * 0.05 + fall * 0.7,
    unit * 0.014,
    amount * 0.85,
  );
}

function drawAngry(
  context: CanvasRenderingContext2D,
  geometry: PsdEmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const { x, y } = facePoint(geometry);
  const unit = effectUnit(geometry);
  const pulse = 0.9 + Math.sin(now * 0.012) * 0.1;
  const centerX = x + unit * 0.25;
  const centerY = y - unit * 0.17;
  const size = unit * 0.07 * pulse;
  context.save();
  context.globalAlpha = amount;
  context.strokeStyle = '#ef4359';
  context.lineWidth = Math.max(4, unit * 0.014);
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
  geometry: PsdEmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const { x, y } = facePoint(geometry);
  const unit = effectUnit(geometry);
  const bubbles = [
    [-0.3, 0.13, 0.035],
    [0.31, 0.05, 0.024],
    [-0.24, -0.12, 0.02],
    [0.27, 0.2, 0.042],
  ];
  bubbles.forEach(([offsetX, offsetY, radius], index) => {
    const drift = Math.sin(now * 0.0015 + index) * unit * 0.015;
    context.save();
    context.globalAlpha = amount * 0.8;
    context.strokeStyle = '#9af1df';
    context.lineWidth = Math.max(2, unit * 0.007);
    context.beginPath();
    context.arc(
      x + unit * offsetX + drift,
      y + unit * offsetY - drift,
      unit * radius,
      0,
      TWO_PI,
    );
    context.stroke();
    context.restore();
  });
}

function drawThinking(
  context: CanvasRenderingContext2D,
  geometry: PsdEmotionEffectGeometry,
  amount: number,
  now: number,
): void {
  const { x, y } = facePoint(geometry);
  const unit = effectUnit(geometry);
  const drift = Math.sin(now * 0.002) * unit * 0.012;
  const centerX = x + unit * 0.29;
  const centerY = y - unit * 0.16 + drift;
  context.save();
  context.globalAlpha = amount;
  context.fillStyle = 'rgba(210, 228, 255, 0.88)';
  context.strokeStyle = '#79a9ed';
  context.lineWidth = Math.max(2, unit * 0.007);
  for (const [offsetX, offsetY, radius] of [
    [0, 0, 0.055],
    [0.055, -0.01, 0.045],
    [-0.05, 0.008, 0.04],
  ]) {
    context.beginPath();
    context.arc(
      centerX + unit * offsetX,
      centerY + unit * offsetY,
      unit * radius,
      0,
      TWO_PI,
    );
    context.fill();
    context.stroke();
  }
  for (const [offsetX, offsetY, radius] of [
    [-0.08, 0.08, 0.018],
    [-0.13, 0.13, 0.012],
  ]) {
    context.beginPath();
    context.arc(
      centerX + unit * offsetX,
      centerY + unit * offsetY,
      unit * radius,
      0,
      TWO_PI,
    );
    context.fill();
    context.stroke();
  }
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
  context.lineTo(x + radius * 0.38, y - radius * 0.38);
  context.lineTo(x + radius * 1.8, y);
  context.lineTo(x + radius * 0.38, y + radius * 0.38);
  context.lineTo(x, y + radius * 1.8);
  context.lineTo(x - radius * 0.38, y + radius * 0.38);
  context.lineTo(x - radius * 1.8, y);
  context.lineTo(x - radius * 0.38, y - radius * 0.38);
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

function facePoint(geometry: PsdEmotionEffectGeometry): {
  x: number;
  y: number;
} {
  return {
    x: geometry.width * geometry.anchor.faceX,
    y: geometry.height * geometry.anchor.faceY,
  };
}

function effectUnit(geometry: PsdEmotionEffectGeometry): number {
  return (
    Math.min(geometry.width, geometry.height) * geometry.anchor.effectScale
  );
}

function isPsdReactionEmotion(value: unknown): value is PsdReactionEmotion {
  return PSD_REACTION_EMOTIONS.some((emotion) => emotion === value);
}

function normalizeRatio(value: number | undefined, fallback: number): number {
  return clampFinite(value, 0, 1, fallback);
}

function clampWeight(weight: number): number {
  return clampFinite(weight, 0, 1, 0);
}

function clampFinite(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const normalized =
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(Math.max(normalized, min), max);
}
