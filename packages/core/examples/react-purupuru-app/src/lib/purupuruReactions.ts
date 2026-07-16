export interface ScreenplayLike {
  emotion?: string;
  text?: string;
}

export const PURUPURU_EMOTION_EFFECTS = [
  'happy',
  'surprised',
  'sad',
  'angry',
  'relaxed',
  'thinking',
] as const;

export type PuruPuruEmotionEffect =
  (typeof PURUPURU_EMOTION_EFFECTS)[number];

export interface PuruPuruReactionDraft {
  effect?: PuruPuruEmotionEffect;
  impulse?: {
    bounce?: number;
    tilt?: number;
    shake?: number;
    scalePop?: number;
  };
  sustain?: {
    offsetY?: number;
    tilt?: number;
    idleScale?: number;
    idleSpeedScale?: number;
  };
  fadeMs?: number;
}

export type PuruPuruReaction = PuruPuruReactionDraft & { id: number };

export function createPuruPuruReactionFromScreenplay(
  screenplay: unknown,
): PuruPuruReactionDraft | null {
  if (!screenplay || typeof screenplay !== 'object') return null;

  const source = screenplay as ScreenplayLike;
  const emotion =
    typeof source.emotion === 'string'
      ? source.emotion.toLowerCase().trim()
      : '';

  return createPuruPuruReactionFromEmotion(emotion);
}

export function createPuruPuruReactionFromEmotion(
  emotion: string,
): PuruPuruReactionDraft | null {
  const normalizedEmotion = emotion.toLowerCase().trim();

  if (normalizedEmotion === 'happy') {
    return {
      effect: 'happy',
      impulse: { bounce: 0.55, scalePop: 0.12 },
      sustain: { idleScale: 1.08, idleSpeedScale: 1.08 },
      fadeMs: 340,
    };
  }

  if (normalizedEmotion === 'surprised') {
    return {
      effect: 'surprised',
      impulse: { bounce: 0.5, scalePop: 0.3 },
      sustain: { idleScale: 1.08 },
      fadeMs: 320,
    };
  }

  if (normalizedEmotion === 'sad') {
    return {
      effect: 'sad',
      sustain: { idleScale: 0.5, idleSpeedScale: 0.72 },
      fadeMs: 420,
    };
  }

  if (normalizedEmotion === 'angry') {
    return {
      effect: 'angry',
      impulse: { bounce: 0.2, shake: 0.45 },
      sustain: { idleScale: 0.9, idleSpeedScale: 1.28 },
      fadeMs: 280,
    };
  }

  if (normalizedEmotion === 'relaxed') {
    return {
      effect: 'relaxed',
      impulse: { bounce: 0.1 },
      sustain: { idleScale: 0.62, idleSpeedScale: 0.68 },
      fadeMs: 460,
    };
  }

  if (normalizedEmotion === 'thinking') {
    return {
      effect: 'thinking',
      sustain: { idleScale: 0.55, idleSpeedScale: 0.75 },
      fadeMs: 420,
    };
  }

  if (normalizedEmotion === 'neutral') {
    return null;
  }

  return null;
}

export function withReactionId(
  draft: PuruPuruReactionDraft,
  id: number,
): PuruPuruReaction {
  return { ...draft, id };
}

export function isPuruPuruEmotionEffect(
  value: unknown,
): value is PuruPuruEmotionEffect {
  return PURUPURU_EMOTION_EFFECTS.some((effect) => effect === value);
}
