import { describe, expect, it, vi } from 'vitest';
import type { Live2DModelInstance } from '../types/live2d';
import {
  configureLive2DMaskBuffers,
  getLive2DMaskBufferCount,
} from './live2dModel';

function createModel(maskCount: number, currentBufferCount = 1) {
  const clippingManager = {
    getClippingMaskCount: () => maskCount,
    release: vi.fn(),
  };
  const renderer = {
    _clippingManager: clippingManager,
    getRenderTextureCount: () => currentBufferCount,
    initialize: vi.fn(() => {
      expect(clippingManager.release).toHaveBeenCalledOnce();
    }),
    release: vi.fn(),
  };
  const coreModel = {
    getParameterCount: () => 0,
    getParameterValueByIndex: () => 0,
    setParameterValueByIndex: vi.fn(),
    setParameterValueById: vi.fn(),
  };
  const model = {
    internalModel: {
      on: vi.fn(),
      off: vi.fn(),
      coreModel,
      renderer,
    },
  } satisfies Pick<Live2DModelInstance, 'internalModel'>;

  return { model, coreModel, renderer, clippingManager };
}

describe('Live2D mask buffer count', () => {
  it.each([
    [0, 1],
    [1, 1],
    [32, 1],
    [36, 1],
    [37, 2],
    [49, 2],
    [64, 2],
    [65, 3],
    [96, 3],
    [97, 4],
  ])('allocates %i masks across %i buffers', (maskCount, expected) => {
    expect(getLive2DMaskBufferCount(maskCount)).toBe(expected);
  });
});

describe('configureLive2DMaskBuffers', () => {
  it.each([0, 1, 36])('leaves a model with %i masks unchanged', (maskCount) => {
    const { model, renderer, clippingManager } = createModel(maskCount);

    configureLive2DMaskBuffers(model);

    expect(clippingManager.release).not.toHaveBeenCalled();
    expect(renderer.initialize).not.toHaveBeenCalled();
    expect(renderer.release).not.toHaveBeenCalled();
  });

  it.each([
    [49, 2],
    [65, 3],
  ])(
    'reinitializes %i masks with %i buffers after cleanup',
    (masks, buffers) => {
      const { model, coreModel, renderer, clippingManager } =
        createModel(masks);

      configureLive2DMaskBuffers(model);

      expect(clippingManager.release).toHaveBeenCalledOnce();
      expect(renderer.initialize).toHaveBeenCalledOnce();
      expect(renderer.initialize).toHaveBeenCalledWith(coreModel, buffers);
      expect(renderer.release).not.toHaveBeenCalled();
    },
  );

  it('preserves an existing sufficient buffer allocation', () => {
    const { model, renderer, clippingManager } = createModel(49, 3);

    configureLive2DMaskBuffers(model);

    expect(clippingManager.release).not.toHaveBeenCalled();
    expect(renderer.initialize).not.toHaveBeenCalled();
  });

  it('skips models without a clipping manager', () => {
    const { model, renderer } = createModel(0);
    Reflect.deleteProperty(renderer, '_clippingManager');

    configureLive2DMaskBuffers(model);

    expect(renderer.initialize).not.toHaveBeenCalled();
    expect(renderer.release).not.toHaveBeenCalled();
    expect(() => configureLive2DMaskBuffers({})).not.toThrow();
  });
});
