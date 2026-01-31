import { describe, it, expect } from 'vitest';
import { resolveVisionModel } from '../../src/utils/visionModelResolver';

describe('visionModelResolver', () => {
  const supportsVisionForModel = (model: string): boolean =>
    model.startsWith('vision');

  it('should prefer explicit visionModel when provided', () => {
    const result = resolveVisionModel({
      model: 'text-model',
      visionModel: 'vision-explicit',
      defaultModel: 'text-default',
      defaultVisionModel: 'vision-default',
      supportsVisionForModel,
      validate: 'explicit',
    });

    expect(result).toBe('vision-explicit');
  });

  it('should fallback to defaultVisionModel when base model is not vision', () => {
    const result = resolveVisionModel({
      model: 'text-model',
      defaultModel: 'text-default',
      defaultVisionModel: 'vision-default',
      supportsVisionForModel,
    });

    expect(result).toBe('vision-default');
  });

  it('should use base model when it supports vision', () => {
    const result = resolveVisionModel({
      model: 'vision-model',
      defaultModel: 'vision-default',
      defaultVisionModel: 'vision-default',
      supportsVisionForModel,
    });

    expect(result).toBe('vision-model');
  });

  it('should throw when explicit visionModel is not supported', () => {
    expect(() =>
      resolveVisionModel({
        model: 'vision-model',
        visionModel: 'text-vision',
        defaultModel: 'vision-default',
        defaultVisionModel: 'vision-default',
        supportsVisionForModel,
        validate: 'explicit',
      }),
    ).toThrow('does not support vision capabilities');
  });

  it('should throw when resolved vision model is not supported', () => {
    expect(() =>
      resolveVisionModel({
        model: 'text-model',
        defaultModel: 'text-default',
        defaultVisionModel: 'text-vision-default',
        supportsVisionForModel,
        validate: 'resolved',
      }),
    ).toThrow('does not support vision capabilities');
  });
});
