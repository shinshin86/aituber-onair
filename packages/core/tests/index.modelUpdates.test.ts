import { afterEach, describe, expect, it, vi } from 'vitest';
import * as core from '../src';
import * as chat from '@aituber-onair/chat';
import * as voice from '@aituber-onair/voice';
import type {
  GeminiTtsModel,
  InworldModel,
  OpenRouterTtsModel,
  VoiceServiceOptions,
} from '../src';

describe('Released Chat and Voice model exports', () => {
  it.each([
    'MODEL_CLAUDE_5_2_FABLE',
    'MODEL_GEMINI_4_ARGON',
    'MODEL_GEMINI_4_CARBON',
    'MODEL_GEMINI_4_HYDROGEN',
    'MODEL_MISTRAL_ZAI_GLM_5_3_FLASH',
    'getMistralSupportedReasoningEfforts',
    'normalizeMistralReasoningEffort',
    'MODEL_ANTHROPIC_CLAUDE_FABLE_5_2',
    'MODEL_GOOGLE_GEMINI_4_ARGON',
    'MODEL_GOOGLE_GEMINI_4_CARBON',
    'MODEL_GOOGLE_GEMINI_4_HYDROGEN',
    'MODEL_META_MUSE_EMBER',
    'MODEL_THINKINGMACHINES_INKLING_2_SMALL',
    'MODEL_NEX_AGI_NEX_N2_6',
    'MODEL_INCLUSIONAI_LING_3_2_FLASH_FREE',
    'MODEL_OPENAI_GPT_LUNA_LATEST',
    'MODEL_OPENAI_GPT_TERRA_LATEST',
    'MODEL_OPENROUTER_DEEPSEEK_FLASH_LATEST',
    'MODEL_ZAI_GLM_FLASH_LATEST',
    'MODEL_XIAOMI_MIMO_V2_6_PRO',
    'MODEL_TENCENT_HY4',
    'MODEL_COHERE_COMMAND_A_PLUS',
    'MODEL_BYTEDANCE_SEED_2_1_TURBO',
    'MODEL_NVIDIA_NEMOTRON_3_5_SUPER_VL',
    'MODEL_OPENROUTER_SAKANA_NAMAZU',
    'MODEL_GPT_6_1_TERRA',
    'OPENAI_DEPRECATED_MODELS',
    'MODEL_KIMI_K3_1_PRO',
    'MODEL_KIMI_K3_1_PRO_HIGHSPEED',
    'KIMI_DEPRECATED_MODELS',
    'GEMINI_DEPRECATED_MODELS',
    'MODEL_UNBIASED_PARETO_26_9',
    'MODEL_OPENAI_GPT_6_1_TERRA',
    'MODEL_GOOGLE_GEMMA_4_31B_IT_FREE',
    'MODEL_NVIDIA_NEMOTRON_3_5_SUPER_VL_FREE',
    'MODEL_ANTHROPIC_CLAUDE_HAIKU_5_5',
    'MODEL_INCEPTION_MERCURY_3',
    'MODEL_OPENROUTER_DEEPSEEK_V4_1_FLASH_1017',
    'MODEL_MOONSHOTAI_KIMI_K3_1_PRO',
    'MODEL_MINIMAX_M3_1_FLASH',
    'MODEL_UNBIASED_PARETO_26_10',
    'MODEL_INCLUSIONAI_LING_3_0_FLASH_VL',
    'MODEL_NEX_AGI_NEX_N2_5_PRO',
    'MODEL_GPT_6_1_SOL',
    'MODEL_GLM_5_3_FLASHX',
    'MODEL_MISTRAL_ZAI_GLM_5_3',
    'MODEL_OPENAI_GPT_6_1_SOL',
    'MODEL_OPENAI_GPT_6_SOL',
    'MODEL_OPENAI_GPT_6_LUNA',
    'MODEL_ANTHROPIC_CLAUDE_SONNET_5_5',
    'MODEL_ANTHROPIC_CLAUDE_OPUS_5_5',
    'MODEL_XAI_GROK_4_7',
    'MODEL_ZAI_GLM_5_3_FLASHX',
    'MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING',
    'MODEL_QWEN_QWEN_3_8_27B',
    'MODEL_QWEN_QWEN_3_8_OMNI_FLASH',
    'OPENROUTER_MODELS_WITHOUT_REASONING_BUDGET',
    'MODEL_GPT_6_ASTRA',
    'MODEL_GPT_6_SOL',
    'MODEL_GPT_6_LUNA',
    'MODEL_CLAUDE_5_1_FABLE',
    'MODEL_CLAUDE_5_5_OPUS',
    'MODEL_CLAUDE_5_5_SONNET',
    'MODEL_GROK_4_7',
    'MODEL_DEEPSEEK_FLASH',
    'MODEL_OPENAI_GPT_6_ASTRA',
    'MODEL_OPENAI_GPT_6_ASTRA_PRO',
    'MODEL_ANTHROPIC_CLAUDE_FABLE_5_1',
    'MODEL_OPENROUTER_DEEPSEEK_V4_1_FLASH',
    'MODEL_GOOGLE_GEMINI_3_8_FLASH',
    'MODEL_INCLUSIONAI_LING_3_0_FLASH_VL_FREE',
    'MODEL_INCEPTION_MERCURY_2_5',
    'MODEL_NEX_AGI_NEX_N2_5_MINI_FREE',
    'MODEL_NEX_AGI_NEX_N2_5_PRO_FREE',
    'MODEL_QWEN_QWEN_3_8_MAX_0902',
    'MODEL_META_MUSE_SPARK_1_3',
    'MODEL_INCLUSIONAI_LING_3_1_FLASH',
    'MODEL_UPSTAGE_SOLAR_PRO4',
    'MODEL_UPSTAGE_SOLAR_MINI4',
    'MODEL_XIAOMI_MIMO_V2_6_FLASH',
    'MODEL_APODEX_1_1_MINI_FREE',
    'MODEL_UNBIASED_PARETO_26_10_PREVIEW',
    'MODEL_OPENROUTER_MISTRAL_LARGE_4_0',
    'MODEL_CLAUDE_5_5_HAIKU',
    'isOpenAIReasoningModel',
    'getDefaultReasoningEffortForOpenAIModel',
  ] as const)('re-exports %s from Chat', (name) => {
    expect(core[name]).toBe(chat[name]);
  });

  it('accepts Flash and custom Inworld model strings through Core options', () => {
    const flash: InworldModel = 'inworld-tts-2-flash';
    const custom: InworldModel = 'custom-model';
    const options: VoiceServiceOptions = {
      engineType: 'inworld',
      inworldModel: flash,
    };
    expect(options.inworldModel).toBe(flash);
    expect(custom).toBe('custom-model');
  });

  it('accepts both Gemini 3.8 TTS models through Core options', () => {
    const flash: GeminiTtsModel = 'gemini-3.8-flash-tts';
    const flashLite: GeminiTtsModel = 'gemini-3.8-flash-lite-tts';
    const options: VoiceServiceOptions = {
      engineType: 'geminiTts',
      geminiTtsModel: flashLite,
    };
    expect(options.geminiTtsModel).toBe(flashLite);
    expect(flash).toBe('gemini-3.8-flash-tts');
  });

  it.each([
    'OpenRouterEngine',
    'OPENROUTER_TTS_API_URL',
    'OPENROUTER_MODELS_API_URL',
  ] as const)('re-exports %s from Voice', (name) => {
    expect(core[name]).toBe(voice[name]);
  });

  it('accepts an explicit OpenRouter MAI preview model through Core options', () => {
    const model: OpenRouterTtsModel = 'microsoft/mai-voice-2.1-flash';
    const options: VoiceServiceOptions = {
      engineType: 'openRouter',
      openRouterModel: model,
    };
    expect(options.openRouterModel).toBe(model);
  });
});

describe('Published provider defaults through Core', () => {
  it.each([
    ['openai', 'gpt-5.6-luna'],
    ['deepseek', 'deepseek-flash'],
    ['openrouter', 'google/gemma-4-31b-it:free'],
  ] as const)(
    'uses the published %s default without network calls',
    (provider, model) => {
      const service = core.ChatServiceFactory.createChatService(provider, {
        apiKey: 'mock-key',
      });
      expect(service.getModel()).toBe(model);
    },
  );
  it('exposes the current free OpenRouter models', () => {
    expect(new core.OpenRouterChatServiceProvider().getFreeModels()).toEqual([
      'inclusionai/ling-3.2-flash:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3.5-super-vl:free',
    ]);
  });
});

describe('Published Gemini 4 transport through Core', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [core.MODEL_GEMINI_4_ARGON, false, 32_768],
    [core.MODEL_GEMINI_4_CARBON, false, 32_768],
    [core.MODEL_GEMINI_4_HYDROGEN, false, 65_536],
    [core.MODEL_GEMINI_4_ARGON, true, 65_536],
    [core.MODEL_GEMINI_4_CARBON, true, 65_536],
    [core.MODEL_GEMINI_4_HYDROGEN, true, 65_536],
  ] as const)(
    'preserves %s per-model cap (stream=%s)',
    async (model, stream, cap) => {
      const payload = {
        candidates: [
          {
            content: { role: 'model', parts: [{ text: 'Hello' }] },
            finishReason: 'STOP',
          },
        ],
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(
            stream
              ? `data: ${JSON.stringify(payload)}\n\n`
              : JSON.stringify(payload),
          ),
        );
      vi.stubGlobal('fetch', fetchMock);
      const service = core.ChatServiceFactory.createChatService('gemini', {
        apiKey: 'mock-key',
        model,
        responseLength: 'short',
      });
      const result = await service.chatOnce!(
        [{ role: 'user', content: 'Hello' }],
        stream,
        undefined,
        100_000,
      );
      const [url, request] = fetchMock.mock.calls[0];
      expect(url).toContain(
        `/v1beta/models/${model}:${stream ? 'streamGenerateContent' : 'generateContent'}`,
      );
      expect(JSON.parse(request.body).generationConfig).toEqual({
        maxOutputTokens: cap,
        thinkingConfig: { includeThoughts: false, thinkingLevel: 'LOW' },
      });
      expect(result.blocks).toEqual([{ type: 'text', text: 'Hello' }]);
    },
  );
});
