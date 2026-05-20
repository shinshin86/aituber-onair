import { describe, expect, it } from 'vitest';
import {
  ENDPOINT_XAI_CHAT_COMPLETIONS_API,
  GEMINI_NANO_MAX_CONTEXT_MESSAGES,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_4_OPUS,
  MODEL_CLAUDE_4_SONNET,
  MODEL_GEMINI_NANO,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GEMMA_4_26B_A4B_IT,
  MODEL_GEMMA_4_31B_IT,
  MODEL_GPT_5_4,
  MODEL_GPT_5_5,
  MODEL_GPT_5_4_MINI,
  MODEL_GPT_5_4_NANO,
  MODEL_GPT_5_4_PRO,
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GLM_5_TURBO,
  MODEL_GROK_4_3,
  MODEL_GROK_4_20_REASONING,
  MODEL_KIMI_K2_6,
  MODEL_KIMI_K2_5,
  MODEL_OPENROUTER_AUTO,
  MODEL_MOONSHOTAI_KIMI_LATEST,
  MODEL_OPENAI_GPT_LATEST,
  MODEL_OPENAI_GPT_MINI_LATEST,
  MODEL_OPENAI_GPT_5_5_PRO,
  MODEL_OPENAI_GPT_5_5,
  MODEL_ANTHROPIC_CLAUDE_SONNET_LATEST,
  MODEL_ANTHROPIC_CLAUDE_HAIKU_LATEST,
  MODEL_GOOGLE_GEMINI_PRO_LATEST,
  MODEL_GOOGLE_GEMINI_FLASH_LATEST,
  KIMI_VISION_SUPPORTED_MODELS,
  MODEL_DEEPSEEK_V4_FLASH,
  MODEL_DEEPSEEK_V4_PRO,
  DEEPSEEK_SUPPORTED_MODELS,
  DeepSeekChatService,
  MODEL_MISTRAL_SMALL_LATEST,
  MODEL_MISTRAL_MEDIUM_3_5,
  MISTRAL_SUPPORTED_MODELS,
  MISTRAL_VISION_SUPPORTED_MODELS,
  MistralChatService,
  isMistralReasoningEffortModel,
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

  it('re-exports Gemini 3.5 and 3.1 Flash-Lite model constants', () => {
    expect(MODEL_GEMINI_3_5_FLASH).toBe('gemini-3.5-flash');
    expect(MODEL_GEMINI_3_1_FLASH_LITE).toBe('gemini-3.1-flash-lite');
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
    expect(MODEL_GROK_4_3).toBe('grok-4.3');
    expect(MODEL_GROK_4_20_REASONING).toBe('grok-4.20-0309-reasoning');
    expect(ENDPOINT_XAI_CHAT_COMPLETIONS_API).toBe(
      'https://api.x.ai/v1/chat/completions',
    );
    expect(isXaiVisionModel(MODEL_GROK_4_3)).toBe(true);
  });

  it('re-exports DeepSeek chat provider items', () => {
    expect(typeof DeepSeekChatService).toBe('function');
    expect(MODEL_DEEPSEEK_V4_FLASH).toBe('deepseek-v4-flash');
    expect(MODEL_DEEPSEEK_V4_PRO).toBe('deepseek-v4-pro');
    expect(DEEPSEEK_SUPPORTED_MODELS).toEqual([
      MODEL_DEEPSEEK_V4_FLASH,
      MODEL_DEEPSEEK_V4_PRO,
    ]);
  });

  it('re-exports Mistral chat provider items', () => {
    expect(typeof MistralChatService).toBe('function');
    expect(MODEL_MISTRAL_SMALL_LATEST).toBe('mistral-small-latest');
    expect(MODEL_MISTRAL_MEDIUM_3_5).toBe('mistral-medium-3-5');
    expect(MISTRAL_SUPPORTED_MODELS).toContain(MODEL_MISTRAL_SMALL_LATEST);
    expect(MISTRAL_VISION_SUPPORTED_MODELS).toContain(
      MODEL_MISTRAL_SMALL_LATEST,
    );
    expect(isMistralReasoningEffortModel(MODEL_MISTRAL_MEDIUM_3_5)).toBe(true);
  });

  it('re-exports OpenRouter latest routed model constants', () => {
    expect(MODEL_OPENROUTER_AUTO).toBe('openrouter/auto');
    expect(MODEL_OPENAI_GPT_LATEST).toBe('~openai/gpt-latest');
    expect(MODEL_OPENAI_GPT_MINI_LATEST).toBe('~openai/gpt-mini-latest');
    expect(MODEL_OPENAI_GPT_5_5_PRO).toBe('openai/gpt-5.5-pro');
    expect(MODEL_OPENAI_GPT_5_5).toBe('openai/gpt-5.5');
    expect(MODEL_ANTHROPIC_CLAUDE_SONNET_LATEST).toBe(
      '~anthropic/claude-sonnet-latest',
    );
    expect(MODEL_ANTHROPIC_CLAUDE_HAIKU_LATEST).toBe(
      '~anthropic/claude-haiku-latest',
    );
    expect(MODEL_GOOGLE_GEMINI_PRO_LATEST).toBe('~google/gemini-pro-latest');
    expect(MODEL_GOOGLE_GEMINI_FLASH_LATEST).toBe(
      '~google/gemini-flash-latest',
    );
    expect(MODEL_MOONSHOTAI_KIMI_LATEST).toBe('~moonshotai/kimi-latest');
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
