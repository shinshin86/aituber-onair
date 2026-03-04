import { describe, expect, it } from 'vitest';
import {
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  refreshOpenRouterFreeModels,
  type RefreshOpenRouterFreeModelsResult,
} from '../src/index';

describe('Core index chat re-exports', () => {
  it('re-exports refreshOpenRouterFreeModels', () => {
    expect(typeof refreshOpenRouterFreeModels).toBe('function');
  });

  it('re-exports Gemini 3.1 Flash-Lite Preview model constant', () => {
    expect(MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW).toBe(
      'gemini-3.1-flash-lite-preview',
    );
  });

  it('exposes refresh result type shape compatibility', () => {
    const sample: RefreshOpenRouterFreeModelsResult = {
      working: ['openai/gpt-oss-20b:free'],
      failed: [{ id: 'z-ai/glm-4.5-air:free', reason: 'HTTP 429' }],
      fetchedAt: Date.now(),
    };

    expect(sample.working.length).toBe(1);
    expect(sample.failed.length).toBe(1);
  });
});
