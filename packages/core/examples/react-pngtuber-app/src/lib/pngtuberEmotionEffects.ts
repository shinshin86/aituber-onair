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

export function drawPngTuberEmotionEffect(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  effect: PngTuberEmotionEffect | null,
  weight: number,
  now: number,
): void {
  if (!effect || weight <= 0.002) return;
  const x = width * 0.5;
  const y = height * 0.36;
  const unit = Math.min(width, height);
  const pulse = 0.92 + Math.sin(now * 0.006) * 0.08;

  context.save();
  context.globalAlpha = Math.max(0, Math.min(weight, 1));
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (effect === 'happy') {
    const points = [
      [-0.3, -0.18],
      [0.3, -0.14],
      [-0.35, 0.05],
      [0.34, 0.08],
      [-0.22, 0.22],
      [0.24, 0.2],
    ];
    context.fillStyle = '#ffd75e';
    for (const [offsetX, offsetY] of points) {
      drawSparkle(
        context,
        x + unit * offsetX,
        y + unit * offsetY,
        unit * 0.025 * pulse,
      );
    }
  }

  if (effect === 'surprised') {
    context.strokeStyle = '#fff1a0';
    context.lineWidth = Math.max(3, unit * 0.012);
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10 - Math.PI / 2;
      context.beginPath();
      context.moveTo(
        x + Math.cos(angle) * unit * 0.25,
        y + Math.sin(angle) * unit * 0.25,
      );
      context.lineTo(
        x + Math.cos(angle) * unit * 0.39 * pulse,
        y + Math.sin(angle) * unit * 0.39 * pulse,
      );
      context.stroke();
    }
  }

  if (effect === 'sad') {
    context.fillStyle = '#65b9ff';
    const fall = ((now / 1000) % 1) * unit * 0.08;
    drawTear(context, x - unit * 0.12, y + unit * 0.07 + fall, unit * 0.02);
    drawTear(
      context,
      x + unit * 0.13,
      y + unit * 0.08 + fall * 0.7,
      unit * 0.016,
    );
  }

  if (effect === 'angry') {
    context.strokeStyle = '#ff526c';
    context.lineWidth = Math.max(4, unit * 0.014);
    const markX = x + unit * 0.24;
    const markY = y - unit * 0.18;
    context.beginPath();
    context.moveTo(markX - unit * 0.08, markY);
    context.lineTo(markX - unit * 0.025, markY + unit * 0.015);
    context.lineTo(markX - unit * 0.01, markY + unit * 0.07);
    context.moveTo(markX, markY - unit * 0.07);
    context.lineTo(markX + unit * 0.015, markY - unit * 0.015);
    context.lineTo(markX + unit * 0.075, markY);
    context.moveTo(markX + unit * 0.075, markY + unit * 0.015);
    context.lineTo(markX + unit * 0.02, markY + unit * 0.03);
    context.lineTo(markX, markY + unit * 0.085);
    context.stroke();
  }

  if (effect === 'relaxed') {
    context.strokeStyle = '#7de9d2';
    context.lineWidth = Math.max(2, unit * 0.007);
    for (let index = 0; index < 5; index += 1) {
      const drift = ((now * 0.00012 + index * 0.21) % 1) * unit * 0.18;
      context.beginPath();
      context.arc(
        x + unit * (-0.28 + index * 0.14),
        y + unit * 0.25 - drift,
        unit * (0.018 + (index % 2) * 0.009),
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
  }

  if (effect === 'thinking') {
    context.fillStyle = '#8eb8ff';
    const points = [
      [0.19, -0.03, 0.018],
      [0.25, -0.11, 0.027],
      [0.32, -0.2, 0.045],
    ];
    for (const [offsetX, offsetY, radius] of points) {
      context.beginPath();
      context.arc(
        x + unit * offsetX,
        y + unit * offsetY,
        unit * radius * pulse,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }

  context.restore();
}

function drawSparkle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
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
}

function drawTear(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x, y - radius * 1.8);
  context.bezierCurveTo(
    x + radius * 1.4,
    y - radius * 0.2,
    x + radius,
    y + radius * 1.4,
    x,
    y + radius * 1.5,
  );
  context.bezierCurveTo(
    x - radius,
    y + radius * 1.4,
    x - radius * 1.4,
    y - radius * 0.2,
    x,
    y - radius * 1.8,
  );
  context.fill();
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
