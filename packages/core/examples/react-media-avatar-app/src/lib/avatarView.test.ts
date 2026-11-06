import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_VIEW,
  MAX_SCALE,
  MIN_SCALE,
  VIEW_STORAGE_KEY,
  calculateCursorZoomTransform,
  clampScale,
  loadView,
} from './avatarView';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('avatar view scale', () => {
  it.each([
    [-2, MIN_SCALE],
    [0, MIN_SCALE],
    [MIN_SCALE, MIN_SCALE],
    [1.5, 1.5],
    [MAX_SCALE, MAX_SCALE],
    [10, MAX_SCALE],
    [Number.NaN, 1],
    [Number.POSITIVE_INFINITY, 1],
  ])('clamps %s to %s', (input, expected) => {
    expect(clampScale(input)).toBe(expected);
  });
});

describe('cursor-centred avatar zoom', () => {
  const centre = { x: 640, y: 450 };
  const cursor = { x: 710, y: 380 };

  it.each([0.1, 0.8, 1.8, 8])(
    'keeps the cursor point fixed at scale %s after panning',
    (scale) => {
      const current = { scale: 1.2, x: 90, y: -40 };
      const localPoint = {
        x: (cursor.x - centre.x - current.x) / current.scale,
        y: (cursor.y - centre.y - current.y) / current.scale,
      };

      const next = calculateCursorZoomTransform(current, scale, cursor, centre);

      expect(next.scale).toBe(clampScale(scale));
      expect(centre.x + next.x + localPoint.x * next.scale).toBeCloseTo(
        cursor.x,
      );
      expect(centre.y + next.y + localPoint.y * next.scale).toBeCloseTo(
        cursor.y,
      );
    },
  );

  it('zooms in and out without drifting', () => {
    const zoomed = calculateCursorZoomTransform(
      DEFAULT_VIEW,
      2,
      cursor,
      centre,
    );

    const restored = calculateCursorZoomTransform(zoomed, 1, cursor, centre);

    expect(restored).toEqual(DEFAULT_VIEW);
  });

  it('does not move at the scale limit', () => {
    const current = { scale: MAX_SCALE, x: 120, y: -70 };

    const next = calculateCursorZoomTransform(current, 9, cursor, centre);

    expect(next).toEqual(current);
  });
});

describe('stored avatar view', () => {
  it('loads the view from the example-specific key', () => {
    const view = { scale: 1.4, x: -25, y: 70 };
    const getItem = vi.fn(() => JSON.stringify(view));
    vi.stubGlobal('localStorage', { getItem });

    const loaded = loadView();

    expect(loaded).toEqual(view);
    expect(getItem).toHaveBeenCalledWith(VIEW_STORAGE_KEY);
  });

  it.each([
    [-4, MIN_SCALE],
    [12, MAX_SCALE],
  ])('clamps stored scale %s', (scale, expected) => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ scale, x: 35, y: -20 }),
    });

    const loaded = loadView();

    expect(loaded).toEqual({ scale: expected, x: 35, y: -20 });
  });

  it.each([
    null,
    '',
    '{',
    'null',
    'true',
    '[]',
    '"text"',
    '{}',
    '{"scale":1,"x":0}',
    '{"scale":"1","x":0,"y":0}',
    '{"scale":1,"x":null,"y":0}',
    '{"scale":1,"x":0,"y":"0"}',
    '{"scale":1e400,"x":0,"y":0}',
    '{"scale":1,"x":1e400,"y":0}',
    '{"scale":1,"x":0,"y":-1e400}',
  ])('defaults safely for invalid storage: %s', (raw) => {
    vi.stubGlobal('localStorage', { getItem: () => raw });

    const loaded = loadView();

    expect(loaded).toEqual(DEFAULT_VIEW);
  });

  it('defaults when storage access is denied', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('Storage denied');
      },
    });

    expect(loadView()).toEqual(DEFAULT_VIEW);
  });
});
