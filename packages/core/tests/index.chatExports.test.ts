import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_XAI_CHAT_COMPLETIONS_API,
  GEMINI_NANO_MAX_CONTEXT_MESSAGES,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_4_OPUS,
  MODEL_CLAUDE_4_SONNET,
  MODEL_GEMINI_NANO,
  MODEL_GEMMA_4_26B_A4B_IT,
  MODEL_GEMMA_4_31B_IT,
  MODEL_GPT_5_4,
  MODEL_GPT_5_5,
  MODEL_GPT_5_4_MINI,
  MODEL_GPT_5_4_NANO,
  MODEL_GPT_5_4_PRO,
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GLM_5_TURBO,
  MODEL_GROK_4_20_REASONING,
  MODEL_KIMI_K2_6,
  MODEL_KIMI_K2_5,
  KIMI_VISION_SUPPORTED_MODELS,
  GeminiNanoChatService,
  XAIChatService,
  allowsReasoningXHigh,
  isResponsesOnlyGPT5Model,
  isXaiVisionModel,
  refreshOpenRouterFreeModels,
  type RefreshOpenRouterFreeModelsResult,
  type VisionSupportLevel,
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

  it('re-exports Gemini Nano and Gemma 4 constants', () => {
    expect(typeof GeminiNanoChatService).toBe('function');
    expect(MODEL_GEMINI_NANO).toBe('gemini-nano');
    expect(GEMINI_NANO_MAX_CONTEXT_MESSAGES).toBe(20);
    expect(MODEL_GEMMA_4_31B_IT).toBe('gemma-4-31b-it');
    expect(MODEL_GEMMA_4_26B_A4B_IT).toBe('gemma-4-26b-a4b-it');
  });

  it('re-exports GPT-5.4/5.5 model constants and capability helpers', () => {
    expect(MODEL_GPT_5_4).toBe('gpt-5.4');
    expect(MODEL_GPT_5_5).toBe('gpt-5.5');
    expect(MODEL_GPT_5_4_MINI).toBe('gpt-5.4-mini');
    expect(MODEL_GPT_5_4_NANO).toBe('gpt-5.4-nano');
    expect(MODEL_GPT_5_4_PRO).toBe('gpt-5.4-pro');
    expect(isResponsesOnlyGPT5Model(MODEL_GPT_5_4_PRO)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_5_4)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_5_5)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_5_4_MINI)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_5_4_NANO)).toBe(true);
  });

  it('re-exports current Claude model constants', () => {
    expect(MODEL_CLAUDE_4_7_OPUS).toBe('claude-opus-4-7');
    expect(MODEL_CLAUDE_4_5_HAIKU).toBe('claude-haiku-4-5-20251001');
    expect(MODEL_CLAUDE_4_OPUS).toBe('claude-opus-4-20250514');
    expect(MODEL_CLAUDE_4_SONNET).toBe('claude-sonnet-4-20250514');
  });

  it('re-exports GLM-5-Turbo model constant', () => {
    expect(MODEL_GLM_5_TURBO).toBe('glm-5-turbo');
  });

  it('re-exports current Kimi model constants', () => {
    expect(MODEL_KIMI_K2_6).toBe('kimi-k2.6');
    expect(MODEL_KIMI_K2_5).toBe('kimi-k2.5');
    expect(KIMI_VISION_SUPPORTED_MODELS).toEqual([
      MODEL_KIMI_K2_6,
      MODEL_KIMI_K2_5,
    ]);
  });

  it('re-exports xAI chat provider items', () => {
    expect(typeof XAIChatService).toBe('function');
    expect(MODEL_GROK_4_20_REASONING).toBe('grok-4.20-0309-reasoning');
    expect(ENDPOINT_XAI_CHAT_COMPLETIONS_API).toBe(
      'https://api.x.ai/v1/chat/completions',
    );
    expect(isXaiVisionModel(MODEL_GROK_4_20_REASONING)).toBe(true);
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

  it('re-exports VisionSupportLevel type compatibility', () => {
    const sample: VisionSupportLevel = 'unknown';

    expect(sample).toBe('unknown');
  });
});
