import { describe, expect, it } from 'vitest';
import {
  AITuberOnAirCore,
  ENDPOINT_XAI_CHAT_COMPLETIONS_API,
  GEMINI_NANO_MAX_CONTEXT_MESSAGES,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_8_OPUS,
  MODEL_CLAUDE_4_7_OPUS,
  MODEL_CLAUDE_4_OPUS,
  MODEL_CLAUDE_4_SONNET,
  MODEL_CLAUDE_5_OPUS,
  MODEL_CLAUDE_5_SONNET,
  MODEL_CLAUDE_5_FABLE,
  CLAUDE_DEPRECATED_MODELS,
  MODEL_GEMINI_NANO,
  MODEL_GEMINI_3_7_FLASH,
  MODEL_GEMINI_3_6_FLASH,
  MODEL_GEMINI_3_5_FLASH,
  MODEL_GEMINI_3_5_FLASH_LITE,
  MODEL_GEMINI_3_1_FLASH_LITE,
  MODEL_GEMMA_4_26B_A4B_IT,
  MODEL_GEMMA_4_31B_IT,
  MODEL_GPT_5_4,
  MODEL_GPT_5_5,
  MODEL_GPT_5_6,
  MODEL_GPT_5_6_SOL,
  MODEL_GPT_5_6_TERRA,
  MODEL_GPT_5_6_LUNA,
  MODEL_GPT_5_4_MINI,
  MODEL_GPT_5_4_NANO,
  MODEL_GPT_5_4_PRO,
  MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW,
  MODEL_GLM_5_3,
  MODEL_GLM_5_3_FLASH,
  MODEL_GLM_5_2,
  MODEL_GLM_5_1,
  MODEL_GLM_5_TURBO,
  MODEL_GLM_5V_TURBO,
  MODEL_GROK_4_5,
  MODEL_GROK_4_6,
  MODEL_GROK_4_3,
  MODEL_GROK_4_20_REASONING,
  MODEL_KIMI_K3,
  MODEL_KIMI_K2_7_CODE,
  MODEL_KIMI_K2_7_CODE_HIGHSPEED,
  MODEL_KIMI_K2_6,
  MODEL_KIMI_K2_5,
  MODEL_OPENROUTER_AUTO,
  MODEL_OPENROUTER_AUTO_BETA,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
  MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP,
  MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813,
  MODEL_OPENROUTER_FUSION,
  MODEL_MOONSHOTAI_KIMI_K3,
  MODEL_MOONSHOTAI_KIMI_K2_7_CODE,
  MODEL_MOONSHOTAI_KIMI_K2_6,
  MODEL_MOONSHOTAI_KIMI_LATEST,
  MODEL_OPENAI_GPT_LATEST,
  MODEL_OPENAI_GPT_MINI_LATEST,
  MODEL_OPENAI_GPT_5_6_SOL,
  MODEL_OPENAI_GPT_5_6_TERRA,
  MODEL_OPENAI_GPT_5_6_LUNA,
  MODEL_OPENAI_GPT_5_5_PRO,
  MODEL_OPENAI_GPT_5_5,
  MODEL_ANTHROPIC_CLAUDE_SONNET_LATEST,
  MODEL_ANTHROPIC_CLAUDE_HAIKU_LATEST,
  MODEL_ANTHROPIC_CLAUDE_OPUS_5,
  MODEL_ANTHROPIC_CLAUDE_OPUS_4_8,
  MODEL_ANTHROPIC_CLAUDE_FABLE_5,
  MODEL_ANTHROPIC_CLAUDE_SONNET_5,
  MODEL_GOOGLE_GEMINI_PRO_LATEST,
  MODEL_GOOGLE_GEMINI_FLASH_LATEST,
  MODEL_GOOGLE_GEMINI_3_6_FLASH,
  MODEL_GOOGLE_GEMINI_3_7_FLASH,
  MODEL_GOOGLE_GEMINI_3_5_FLASH_LITE,
  MODEL_ZAI_GLM_5_2,
  MODEL_ZAI_GLM_5_3,
  MODEL_ZAI_GLM_5_3_FLASH,
  MODEL_KWAIPILOT_KAT_CODER_AIR_V2_5,
  MODEL_KWAIPILOT_KAT_CODER_PRO_V2_5,
  MODEL_XAI_GROK_LATEST,
  MODEL_XAI_GROK_4_5,
  MODEL_XAI_GROK_4_6,
  KIMI_VISION_SUPPORTED_MODELS,
  KIMI_THINKING_REQUIRED_MODELS,
  MODEL_DEEPSEEK_V4_FLASH,
  MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
  MODEL_DEEPSEEK_V4_PRO,
  DEEPSEEK_SUPPORTED_MODELS,
  DEEPSEEK_VISION_SUPPORTED_MODELS,
  DeepSeekChatService,
  MODEL_MINISTRAL_3B_2512,
  MODEL_MINISTRAL_8B_2512,
  MODEL_MINISTRAL_14B_2512,
  MODEL_MISTRAL_SMALL_LATEST,
  MODEL_MISTRAL_MEDIUM_3_5,
  MISTRAL_SUPPORTED_MODELS,
  MISTRAL_VISION_SUPPORTED_MODELS,
  MistralChatService,
  isMistralReasoningEffortModel,
  MODEL_FUGU,
  MODEL_FUGU_ULTRA,
  MODEL_FUGU_ULTRA_V1_1,
  MODEL_FUGU_ULTRA_20260615,
  MODEL_SAKANA_NAMAZU,
  SAKANA_SUPPORTED_MODELS,
  SAKANA_VISION_SUPPORTED_MODELS,
  ENDPOINT_SAKANA_CHAT_COMPLETIONS_API,
  SakanaChatService,
  MODEL_PLAMO_3_0_PRIME,
  MODEL_PLAMO_2_2_PRIME,
  PLAMO_SUPPORTED_MODELS,
  ENDPOINT_PLAMO_CHAT_COMPLETIONS_API,
  PlamoChatService,
  GeminiNanoChatService,
  OpenRouterChatService,
  OpenRouterChatServiceProvider,
  XAIChatService,
  allowsReasoningXHigh,
  allowsReasoningMax,
  getClaudeSupportedReasoningEfforts,
  getDefaultClaudeReasoningEffort,
  getDefaultDeepSeekReasoningEffort,
  getDefaultXaiReasoningEffort,
  getXaiSupportedReasoningEfforts,
  getDefaultGeminiReasoningEffort,
  getDefaultKimiReasoningEffort,
  getDefaultOpenRouterReasoningEffort,
  getDeepSeekSupportedReasoningEfforts,
  getGeminiSupportedReasoningEfforts,
  getKimiSupportedReasoningEfforts,
  getOpenRouterSupportedReasoningEfforts,
  isResponsesOnlyGPT5Model,
  isClaudeReasoningEffortModel,
  isDeepSeekReasoningEffortModel,
  isDeepSeekVisionModel,
  isGeminiReasoningEffortModel,
  isKimiReasoningEffortModel,
  isKimiThinkingRequiredModel,
  isKimiVisionModel,
  isSakanaVisionModel,
  isXaiReasoningEffortModel,
  isXaiReasoningEffortNoneModel,
  isXaiVisionModel,
  normalizeXaiReasoningEffort,
  normalizeClaudeReasoningEffort,
  normalizeDeepSeekReasoningEffort,
  normalizeGeminiReasoningEffort,
  normalizeOpenRouterReasoningEffort,
  refreshOpenRouterFreeModels,
  type ChatProviderCapabilities,
  type ClaudeReasoningEffort,
  type DeepSeekReasoningEffort,
  type GeminiReasoningEffort,
  type GeminiNanoInitialPrompt,
  type KimiReasoningEffort,
  type OpenRouterReasoningEffort,
  type ZaiReasoningEffort,
  getDefaultZaiReasoningEffort,
  getZaiSupportedReasoningEfforts,
  isZaiAlwaysThinkingModel,
  isZaiReasoningEffortModel,
  normalizeZaiReasoningEffort,
  type RefreshOpenRouterFreeModelsResult,
  type VisionSupportLevel,
  MODEL_QWEN_QWEN_3_8_FLASH,
} from '../src/index';

describe('Core index chat re-exports', () => {
  it('re-exports refreshOpenRouterFreeModels', () => {
    expect(typeof refreshOpenRouterFreeModels).toBe('function');
  });

  it('re-exports current Gemini models and reasoning helpers', () => {
    const reasoningEffort: GeminiReasoningEffort = 'minimal';

    expect(MODEL_GEMINI_3_6_FLASH).toBe('gemini-3.6-flash');
    expect(MODEL_GEMINI_3_5_FLASH).toBe('gemini-3.5-flash');
    expect(MODEL_GEMINI_3_5_FLASH_LITE).toBe('gemini-3.5-flash-lite');
    expect(MODEL_GEMINI_3_1_FLASH_LITE).toBe('gemini-3.1-flash-lite');
    expect(MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW).toBe(
      'gemini-3.1-flash-lite-preview',
    );
    expect(reasoningEffort).toBe('minimal');
    expect(getGeminiSupportedReasoningEfforts(MODEL_GEMINI_3_6_FLASH)).toEqual([
      'minimal',
      'low',
      'medium',
      'high',
    ]);
    expect(isGeminiReasoningEffortModel(MODEL_GEMINI_3_6_FLASH)).toBe(true);
    expect(getDefaultGeminiReasoningEffort(MODEL_GEMINI_3_6_FLASH)).toBe(
      'minimal',
    );
    expect(normalizeGeminiReasoningEffort(MODEL_GEMINI_3_6_FLASH, 'low')).toBe(
      'low',
    );
  });

  it('re-exports Gemini Nano and Gemma 4 constants', () => {
    expect(typeof GeminiNanoChatService).toBe('function');
    expect(MODEL_GEMINI_NANO).toBe('gemini-nano');
    expect(GEMINI_NANO_MAX_CONTEXT_MESSAGES).toBe(20);
    expect(MODEL_GEMMA_4_31B_IT).toBe('gemma-4-31b-it');
    expect(MODEL_GEMMA_4_26B_A4B_IT).toBe('gemma-4-26b-a4b-it');
  });

  it('re-exports GPT-5.4/5.5/5.6 model constants and capability helpers', () => {
    expect(MODEL_GPT_5_4).toBe('gpt-5.4');
    expect(MODEL_GPT_5_5).toBe('gpt-5.5');
    expect(MODEL_GPT_5_6).toBe('gpt-5.6');
    expect(MODEL_GPT_5_6_SOL).toBe('gpt-5.6-sol');
    expect(MODEL_GPT_5_6_TERRA).toBe('gpt-5.6-terra');
    expect(MODEL_GPT_5_6_LUNA).toBe('gpt-5.6-luna');
    expect(MODEL_GPT_5_4_MINI).toBe('gpt-5.4-mini');
    expect(MODEL_GPT_5_4_NANO).toBe('gpt-5.4-nano');
    expect(MODEL_GPT_5_4_PRO).toBe('gpt-5.4-pro');
    expect(isResponsesOnlyGPT5Model(MODEL_GPT_5_4_PRO)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_5_4)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_5_5)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_5_4_MINI)).toBe(true);
    expect(allowsReasoningXHigh(MODEL_GPT_5_4_NANO)).toBe(true);
    expect(allowsReasoningMax(MODEL_GPT_5_6)).toBe(true);
    expect(allowsReasoningMax(MODEL_GPT_5_5)).toBe(false);
  });

  it('re-exports current Claude models and reasoning helpers', () => {
    const reasoningEffort: ClaudeReasoningEffort = 'xhigh';

    expect(MODEL_CLAUDE_5_OPUS).toBe('claude-opus-5');
    expect(MODEL_CLAUDE_5_SONNET).toBe('claude-sonnet-5');
    expect(MODEL_CLAUDE_4_8_OPUS).toBe('claude-opus-4-8');
    expect(MODEL_CLAUDE_4_7_OPUS).toBe('claude-opus-4-7');
    expect(MODEL_CLAUDE_4_5_HAIKU).toBe('claude-haiku-4-5-20251001');
    expect(MODEL_CLAUDE_4_OPUS).toBe('claude-opus-4-20250514');
    expect(MODEL_CLAUDE_4_SONNET).toBe('claude-sonnet-4-20250514');
    expect(reasoningEffort).toBe('xhigh');
    expect(getClaudeSupportedReasoningEfforts(MODEL_CLAUDE_5_OPUS)).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
    expect(isClaudeReasoningEffortModel(MODEL_CLAUDE_5_OPUS)).toBe(true);
    expect(getDefaultClaudeReasoningEffort(MODEL_CLAUDE_5_OPUS)).toBe('high');
    expect(normalizeClaudeReasoningEffort(MODEL_CLAUDE_5_OPUS, 'xhigh')).toBe(
      'xhigh',
    );
  });

  it('re-exports current GLM model constants', () => {
    const reasoningEffort: ZaiReasoningEffort = 'none';

    expect(MODEL_GLM_5_3).toBe('glm-5.3');
    expect(MODEL_GLM_5_3_FLASH).toBe('glm-5.3-flash');
    expect(MODEL_GLM_5_2).toBe('glm-5.2');
    expect(MODEL_GLM_5_1).toBe('glm-5.1');
    expect(MODEL_GLM_5_TURBO).toBe('glm-5-turbo');
    expect(MODEL_GLM_5V_TURBO).toBe('glm-5v-turbo');
    expect(reasoningEffort).toBe('none');
    expect(getZaiSupportedReasoningEfforts(MODEL_GLM_5_2)).toEqual([
      'none',
      'minimal',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
    expect(isZaiReasoningEffortModel(MODEL_GLM_5_2)).toBe(true);
    expect(getDefaultZaiReasoningEffort(MODEL_GLM_5_2)).toBe('none');
    expect(normalizeZaiReasoningEffort(MODEL_GLM_5_2, 'minimal')).toBe('none');
    expect(getZaiSupportedReasoningEfforts(MODEL_GLM_5_3)).toEqual([
      'low',
      'high',
      'max',
    ]);
    expect(isZaiAlwaysThinkingModel(MODEL_GLM_5_3)).toBe(true);
    expect(getDefaultZaiReasoningEffort(MODEL_GLM_5_3)).toBe('low');
    expect(normalizeZaiReasoningEffort(MODEL_GLM_5_3, 'none')).toBe('low');
  });

  it('re-exports current Kimi model constants', () => {
    const reasoningEfforts: KimiReasoningEffort[] = ['low', 'high', 'max'];

    expect(MODEL_KIMI_K3).toBe('kimi-k3');
    expect(MODEL_KIMI_K2_7_CODE).toBe('kimi-k2.7-code');
    expect(MODEL_KIMI_K2_7_CODE_HIGHSPEED).toBe('kimi-k2.7-code-highspeed');
    expect(MODEL_KIMI_K2_6).toBe('kimi-k2.6');
    expect(MODEL_KIMI_K2_5).toBe('kimi-k2.5');
    expect(KIMI_VISION_SUPPORTED_MODELS).toEqual([
      MODEL_KIMI_K3,
      MODEL_KIMI_K2_7_CODE,
      MODEL_KIMI_K2_7_CODE_HIGHSPEED,
      MODEL_KIMI_K2_6,
      MODEL_KIMI_K2_5,
    ]);
    expect(KIMI_THINKING_REQUIRED_MODELS).toEqual([
      MODEL_KIMI_K2_7_CODE,
      MODEL_KIMI_K2_7_CODE_HIGHSPEED,
    ]);
    expect(reasoningEfforts).toEqual(['low', 'high', 'max']);
    expect(getKimiSupportedReasoningEfforts(MODEL_KIMI_K3)).toEqual([
      'low',
      'high',
      'max',
    ]);
    expect(getDefaultKimiReasoningEffort(MODEL_KIMI_K3)).toBe('max');
    expect(isKimiReasoningEffortModel(MODEL_KIMI_K3)).toBe(true);
    expect(isKimiVisionModel(MODEL_KIMI_K3)).toBe(true);
    expect(isKimiVisionModel(MODEL_KIMI_K2_7_CODE)).toBe(true);
    expect(isKimiThinkingRequiredModel(MODEL_KIMI_K2_7_CODE)).toBe(true);
  });

  it('re-exports xAI chat provider items', () => {
    expect(typeof XAIChatService).toBe('function');
    expect(MODEL_GROK_4_5).toBe('grok-4.5');
    expect(MODEL_GROK_4_3).toBe('grok-4.3');
    expect(MODEL_GROK_4_20_REASONING).toBe('grok-4.20-0309-reasoning');
    expect(ENDPOINT_XAI_CHAT_COMPLETIONS_API).toBe(
      'https://api.x.ai/v1/chat/completions',
    );
    expect(isXaiVisionModel(MODEL_GROK_4_3)).toBe(true);
    expect(isXaiVisionModel(MODEL_GROK_4_5)).toBe(true);
    expect(isXaiReasoningEffortModel(MODEL_GROK_4_5)).toBe(true);
    expect(isXaiReasoningEffortModel(MODEL_GROK_4_3)).toBe(true);
    expect(isXaiReasoningEffortModel(MODEL_GROK_4_20_REASONING)).toBe(false);
    expect(getDefaultXaiReasoningEffort(MODEL_GROK_4_3)).toBe('none');
    expect(getDefaultXaiReasoningEffort(MODEL_GROK_4_5)).toBe('low');
    expect(isXaiReasoningEffortNoneModel(MODEL_GROK_4_5)).toBe(false);
    expect(normalizeXaiReasoningEffort(MODEL_GROK_4_5, 'none')).toBe('low');
  });

  it('re-exports DeepSeek chat provider items', () => {
    const reasoningEffort: DeepSeekReasoningEffort = 'none';

    expect(typeof DeepSeekChatService).toBe('function');
    expect(MODEL_DEEPSEEK_V4_FLASH).toBe('deepseek-v4-flash');
    expect(MODEL_DEEPSEEK_V4_PRO).toBe('deepseek-v4-pro');
    expect(MODEL_DEEPSEEK_V4_FLASH_VISION_EXP).toBe(
      'deepseek-v4-flash-vision-exp',
    );
    expect(DEEPSEEK_SUPPORTED_MODELS).toEqual([
      MODEL_DEEPSEEK_V4_FLASH,
      MODEL_DEEPSEEK_V4_PRO,
      MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
    ]);
    expect(DEEPSEEK_VISION_SUPPORTED_MODELS).toEqual([
      MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
    ]);
    expect(isDeepSeekVisionModel(MODEL_DEEPSEEK_V4_FLASH_VISION_EXP)).toBe(
      true,
    );
    expect(reasoningEffort).toBe('none');
    expect(
      getDeepSeekSupportedReasoningEfforts(MODEL_DEEPSEEK_V4_FLASH),
    ).toEqual(['none', 'low', 'high', 'max']);
    expect(isDeepSeekReasoningEffortModel(MODEL_DEEPSEEK_V4_FLASH)).toBe(true);
    expect(getDefaultDeepSeekReasoningEffort(MODEL_DEEPSEEK_V4_FLASH)).toBe(
      'none',
    );
    expect(
      normalizeDeepSeekReasoningEffort(MODEL_DEEPSEEK_V4_FLASH, 'low'),
    ).toBe('low');
  });

  it('re-exports Mistral chat provider items', () => {
    expect(typeof MistralChatService).toBe('function');
    expect(MODEL_MINISTRAL_3B_2512).toBe('ministral-3b-2512');
    expect(MODEL_MINISTRAL_8B_2512).toBe('ministral-8b-2512');
    expect(MODEL_MINISTRAL_14B_2512).toBe('ministral-14b-2512');
    expect(MODEL_MISTRAL_SMALL_LATEST).toBe('mistral-small-latest');
    expect(MODEL_MISTRAL_MEDIUM_3_5).toBe('mistral-medium-3-5');
    expect(MISTRAL_SUPPORTED_MODELS).toContain(MODEL_MISTRAL_SMALL_LATEST);
    expect(MISTRAL_VISION_SUPPORTED_MODELS).toContain(
      MODEL_MISTRAL_SMALL_LATEST,
    );
    expect(MISTRAL_VISION_SUPPORTED_MODELS).toContain(MODEL_MINISTRAL_14B_2512);
    expect(isMistralReasoningEffortModel(MODEL_MISTRAL_MEDIUM_3_5)).toBe(true);
  });

  it('re-exports Sakana chat provider items', () => {
    expect(typeof SakanaChatService).toBe('function');
    expect(MODEL_FUGU).toBe('fugu');
    expect(MODEL_FUGU_ULTRA).toBe('fugu-ultra');
    expect(MODEL_FUGU_ULTRA_V1_1).toBe('fugu-ultra-v1.1');
    expect(MODEL_FUGU_ULTRA_20260615).toBe('fugu-ultra-20260615');
    expect(MODEL_SAKANA_NAMAZU).toBe('sakana-namazu');
    expect(SAKANA_SUPPORTED_MODELS).toEqual([
      MODEL_FUGU,
      MODEL_FUGU_ULTRA_V1_1,
      MODEL_SAKANA_NAMAZU,
    ]);
    expect(SAKANA_VISION_SUPPORTED_MODELS).toEqual([MODEL_SAKANA_NAMAZU]);
    expect(isSakanaVisionModel(MODEL_SAKANA_NAMAZU)).toBe(true);
    expect(ENDPOINT_SAKANA_CHAT_COMPLETIONS_API).toBe(
      'https://api.sakana.ai/v1/chat/completions',
    );
  });

  it('re-exports PLaMo chat provider items', () => {
    expect(typeof PlamoChatService).toBe('function');
    expect(MODEL_PLAMO_3_0_PRIME).toBe('plamo-3.0-prime');
    expect(MODEL_PLAMO_2_2_PRIME).toBe('plamo-2.2-prime');
    expect(PLAMO_SUPPORTED_MODELS).toEqual([MODEL_PLAMO_3_0_PRIME]);
    expect(ENDPOINT_PLAMO_CHAT_COMPLETIONS_API).toBe(
      'https://api.platform.preferredai.jp/v1/chat/completions',
    );
  });

  it('re-exports OpenRouter latest routed model constants', () => {
    const reasoningEffort: OpenRouterReasoningEffort = 'none';

    expect(typeof OpenRouterChatService).toBe('function');
    expect(typeof OpenRouterChatServiceProvider).toBe('function');
    expect(MODEL_OPENROUTER_AUTO).toBe('openrouter/auto');
    expect(MODEL_OPENROUTER_AUTO_BETA).toBe('openrouter/auto-beta');
    expect(MODEL_OPENROUTER_FUSION).toBe('openrouter/fusion');
    expect(MODEL_OPENROUTER_DEEPSEEK_V4_FLASH).toBe(
      'deepseek/deepseek-v4-flash',
    );
    expect(MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731).toBe(
      'deepseek/deepseek-v4-flash-0731',
    );
    expect(MODEL_OPENROUTER_DEEPSEEK_V4_PRO_0813).toBe(
      'deepseek/deepseek-v4-pro-0813',
    );
    expect(MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP).toBe(
      'deepseek/deepseek-v4-flash-vision-exp',
    );
    expect(reasoningEffort).toBe('none');
    expect(
      getOpenRouterSupportedReasoningEfforts(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
      ),
    ).toEqual(['none', 'low', 'high', 'max']);
    expect(
      getDefaultOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
      ),
    ).toBe('none');
    expect(
      normalizeOpenRouterReasoningEffort(
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
        'medium',
      ),
    ).toBe('low');
    expect(MODEL_ZAI_GLM_5_2).toBe('z-ai/glm-5.2');
    expect(MODEL_ZAI_GLM_5_3).toBe('z-ai/glm-5.3');
    expect(MODEL_ZAI_GLM_5_3_FLASH).toBe('z-ai/glm-5.3-flash');
    expect(MODEL_MOONSHOTAI_KIMI_K3).toBe('moonshotai/kimi-k3');
    expect(MODEL_MOONSHOTAI_KIMI_K2_7_CODE).toBe('moonshotai/kimi-k2.7-code');
    expect(MODEL_MOONSHOTAI_KIMI_K2_6).toBe('moonshotai/kimi-k2.6');
    expect(MODEL_OPENAI_GPT_LATEST).toBe('~openai/gpt-latest');
    expect(MODEL_OPENAI_GPT_MINI_LATEST).toBe('~openai/gpt-mini-latest');
    expect(MODEL_OPENAI_GPT_5_6_SOL).toBe('openai/gpt-5.6-sol');
    expect(MODEL_OPENAI_GPT_5_6_TERRA).toBe('openai/gpt-5.6-terra');
    expect(MODEL_OPENAI_GPT_5_6_LUNA).toBe('openai/gpt-5.6-luna');
    expect(MODEL_OPENAI_GPT_5_5_PRO).toBe('openai/gpt-5.5-pro');
    expect(MODEL_OPENAI_GPT_5_5).toBe('openai/gpt-5.5');
    expect(MODEL_ANTHROPIC_CLAUDE_SONNET_LATEST).toBe(
      '~anthropic/claude-sonnet-latest',
    );
    expect(MODEL_ANTHROPIC_CLAUDE_HAIKU_LATEST).toBe(
      '~anthropic/claude-haiku-latest',
    );
    expect(MODEL_ANTHROPIC_CLAUDE_OPUS_5).toBe('anthropic/claude-opus-5');
    expect(MODEL_ANTHROPIC_CLAUDE_OPUS_4_8).toBe('anthropic/claude-opus-4.8');
    expect(MODEL_ANTHROPIC_CLAUDE_FABLE_5).toBe('anthropic/claude-fable-5');
    expect(MODEL_ANTHROPIC_CLAUDE_SONNET_5).toBe('anthropic/claude-sonnet-5');
    expect(MODEL_QWEN_QWEN_3_8_FLASH).toBe('qwen/qwen3.8-flash');
    expect(MODEL_GOOGLE_GEMINI_PRO_LATEST).toBe('~google/gemini-pro-latest');
    expect(MODEL_GOOGLE_GEMINI_FLASH_LATEST).toBe(
      '~google/gemini-flash-latest',
    );
    expect(MODEL_GOOGLE_GEMINI_3_6_FLASH).toBe('google/gemini-3.6-flash');
    expect(MODEL_GOOGLE_GEMINI_3_7_FLASH).toBe('google/gemini-3.7-flash');
    expect(MODEL_GOOGLE_GEMINI_3_5_FLASH_LITE).toBe(
      'google/gemini-3.5-flash-lite',
    );
    expect(MODEL_XAI_GROK_LATEST).toBe('~x-ai/grok-latest');
    expect(MODEL_XAI_GROK_4_5).toBe('x-ai/grok-4.5');
    expect(MODEL_XAI_GROK_4_6).toBe('x-ai/grok-4.6');
    expect(MODEL_MOONSHOTAI_KIMI_LATEST).toBe('~moonshotai/kimi-latest');
    expect(MODEL_KWAIPILOT_KAT_CODER_AIR_V2_5).toBe(
      'kwaipilot/kat-coder-air-v2.5',
    );
    expect(MODEL_KWAIPILOT_KAT_CODER_PRO_V2_5).toBe(
      'kwaipilot/kat-coder-pro-v2.5',
    );
  });

  it('re-exports Gemini Nano initial prompt type compatibility', () => {
    const prompt: GeminiNanoInitialPrompt = {
      role: 'system',
      content: 'Keep replies concise.',
    };

    expect(prompt.role).toBe('system');
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

  it('exposes provider capabilities through AITuberOnAirCore', () => {
    const capabilities = AITuberOnAirCore.getProviderCapabilities(
      'claude',
      MODEL_CLAUDE_5_OPUS,
    );

    expect(capabilities).toEqual(
      expect.objectContaining({
        provider: 'claude',
        tools: true,
        mcp: true,
        vision: 'supported',
      }),
    );

    const sample: ChatProviderCapabilities = capabilities!;
    expect(sample.models).toContain(MODEL_CLAUDE_5_OPUS);
    expect(AITuberOnAirCore.getSupportedModels('openrouter')).toEqual(
      expect.arrayContaining([
        MODEL_OPENROUTER_AUTO_BETA,
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_0731,
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH,
        MODEL_OPENROUTER_DEEPSEEK_V4_FLASH_VISION_EXP,
        MODEL_MOONSHOTAI_KIMI_K3,
        MODEL_MOONSHOTAI_KIMI_K2_6,
        MODEL_ANTHROPIC_CLAUDE_OPUS_5,
        MODEL_ANTHROPIC_CLAUDE_SONNET_5,
        MODEL_QWEN_QWEN_3_8_FLASH,
        MODEL_KWAIPILOT_KAT_CODER_PRO_V2_5,
      ]),
    );
    expect(
      AITuberOnAirCore.getAllProviderCapabilities().length,
    ).toBeGreaterThan(0);
    expect(
      AITuberOnAirCore.getVisionSupportLevelForModel(
        'claude',
        MODEL_CLAUDE_5_OPUS,
      ),
    ).toBe('supported');
    expect(
      AITuberOnAirCore.getVisionSupportLevelForModel(
        'zai',
        MODEL_GLM_5_3_FLASH,
      ),
    ).toBe('supported');
    expect(
      AITuberOnAirCore.getVisionSupportLevelForModel(
        'deepseek',
        MODEL_DEEPSEEK_V4_FLASH_VISION_EXP,
      ),
    ).toBe('supported');
    expect(
      AITuberOnAirCore.getVisionSupportLevelForModel(
        'sakana',
        MODEL_SAKANA_NAMAZU,
      ),
    ).toBe('supported');
  });

  it('re-exports the latest provider models and reasoning helpers', () => {
    expect(MODEL_GEMINI_3_7_FLASH).toBe('gemini-3.7-flash');
    expect(getGeminiSupportedReasoningEfforts(MODEL_GEMINI_3_7_FLASH)).toEqual([
      'low',
      'medium',
      'high',
    ]);
    expect(getDefaultGeminiReasoningEffort(MODEL_GEMINI_3_7_FLASH)).toBe('low');
    expect(MODEL_CLAUDE_5_FABLE).toBe('claude-fable-5');
    expect(CLAUDE_DEPRECATED_MODELS).toContain(MODEL_CLAUDE_4_OPUS);
    expect(MODEL_GROK_4_6).toBe('grok-4.6');
    expect(isXaiVisionModel(MODEL_GROK_4_6)).toBe(true);
    expect(getXaiSupportedReasoningEfforts(MODEL_GROK_4_6)).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
    ]);
    expect(getDefaultXaiReasoningEffort(MODEL_GROK_4_6)).toBe('low');
  });
});
