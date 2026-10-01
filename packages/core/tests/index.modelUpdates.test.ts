import { describe, expect, it } from 'vitest';
import * as core from '../src';
import * as chat from '@aituber-onair/chat';
import type { GeminiTtsModel, InworldModel, VoiceServiceOptions } from '../src';

describe('Released Chat and Voice model exports', () => {
  it.each([
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
});
