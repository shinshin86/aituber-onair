export interface ScreenplayLike {
  emotion?: string;
  text?: string;
}

export interface PuruPuruReactionDraft {
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

  if (emotion === 'happy') {
    return {
      impulse: { bounce: 1, scalePop: 0.34 },
      sustain: { offsetY: -5, idleScale: 1.08, idleSpeedScale: 1.08 },
      fadeMs: 340,
    };
  }

  if (emotion === 'surprised') {
    return {
      impulse: { bounce: 0.8, tilt: -0.65, scalePop: 0.48 },
      sustain: { offsetY: -2, tilt: -0.025, idleScale: 1.12 },
      fadeMs: 320,
    };
  }

  if (emotion === 'sad') {
    return {
      sustain: {
        offsetY: 10,
        tilt: 0.025,
        idleScale: 0.5,
        idleSpeedScale: 0.72,
      },
      fadeMs: 420,
    };
  }

  if (emotion === 'angry') {
    return {
      impulse: { bounce: 0.45, tilt: 0.42, shake: 0.8 },
      sustain: { tilt: -0.012, idleScale: 0.9, idleSpeedScale: 1.28 },
      fadeMs: 280,
    };
  }

  if (emotion === 'relaxed') {
    return {
      impulse: { bounce: 0.18 },
      sustain: { offsetY: 2, idleScale: 0.62, idleSpeedScale: 0.68 },
      fadeMs: 460,
    };
  }

  if (emotion === 'neutral') {
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
