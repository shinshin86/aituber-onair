import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_EMOTION_EFFECT_ANCHOR } from './emotionEffectAnchor';
import {
  createLinkedPngTuberEmotionReaction,
  DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP,
  drawPngTuberEmotionEffectBack,
  drawPngTuberEmotionEffectFront,
  PNGTUBER_EMOTION_EFFECTS,
  type PngTuberEmotionEffect,
} from './pngtuberEmotionEffects';

function createCanvasContextMock() {
  const gradient = { addColorStop: vi.fn() };
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    bezierCurveTo: vi.fn(),
    closePath: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return { context, gradient };
}

describe('createLinkedPngTuberEmotionReaction', () => {
  it('creates the mapped reaction immediately in linked mode', () => {
    expect(
      createLinkedPngTuberEmotionReaction(
        'linked',
        { emotion: 'happy' },
        DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP,
      ),
    ).toEqual({ effect: 'happy' });
  });

  it('uses a customized emotion effect mapping', () => {
    expect(
      createLinkedPngTuberEmotionReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP, happy: 'surprised' },
      ),
    ).toEqual({ effect: 'surprised' });
  });

  it('returns null when the mapping is none', () => {
    expect(
      createLinkedPngTuberEmotionReaction(
        'linked',
        { emotion: 'happy' },
        { ...DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP, happy: null },
      ),
    ).toBeNull();
  });

  it.each(['none', 'manual'] as const)(
    'does not create an automatic reaction in %s mode',
    (mode) => {
      expect(
        createLinkedPngTuberEmotionReaction(
          mode,
          { emotion: 'happy' },
          DEFAULT_PNGTUBER_EMOTION_EFFECT_MAP,
        ),
      ).toBeNull();
    },
  );
});

describe('canonical PNGTuber emotion effect drawing', () => {
  it('draws the angry mark with all four arms', () => {
    const { context } = createCanvasContextMock();

    drawPngTuberEmotionEffectFront(
      context,
      800,
      600,
      'angry',
      1,
      0,
      DEFAULT_EMOTION_EFFECT_ANCHOR,
    );

    expect(context.moveTo).toHaveBeenCalledTimes(4);
    expect(context.lineTo).toHaveBeenCalledTimes(8);
    expect(context.stroke).toHaveBeenCalledTimes(4);
  });

  it.each<
    [
      PngTuberEmotionEffect,
      Partial<Record<'arc' | 'bezierCurveTo' | 'fill' | 'stroke', number>>,
    ]
  >([
    ['happy', { fill: 6, stroke: 6 }],
    ['surprised', { stroke: 10 }],
    ['sad', { bezierCurveTo: 4, fill: 2, stroke: 2 }],
    ['angry', { stroke: 4 }],
    ['relaxed', { arc: 4, stroke: 4 }],
    ['thinking', { arc: 5, fill: 5, stroke: 5 }],
  ])('draws the canonical %s foreground', (effect, expectedCalls) => {
    const { context } = createCanvasContextMock();

    drawPngTuberEmotionEffectFront(
      context,
      800,
      600,
      effect,
      1,
      500,
      DEFAULT_EMOTION_EFFECT_ANCHOR,
    );

    for (const [method, count] of Object.entries(expectedCalls)) {
      expect(
        context[method as keyof CanvasRenderingContext2D],
      ).toHaveBeenCalledTimes(count);
    }
  });

  it.each(PNGTUBER_EMOTION_EFFECTS)(
    'draws the canonical %s background aura',
    (effect) => {
      const { context, gradient } = createCanvasContextMock();

      drawPngTuberEmotionEffectBack(
        context,
        800,
        600,
        effect,
        1,
        500,
        DEFAULT_EMOTION_EFFECT_ANCHOR,
      );

      expect(context.createRadialGradient).toHaveBeenCalledTimes(1);
      expect(gradient.addColorStop).toHaveBeenCalledTimes(3);
      expect(context.fill).toHaveBeenCalledTimes(1);
      expect(context.arc).toHaveBeenCalledTimes(effect === 'surprised' ? 2 : 1);
    },
  );
});
