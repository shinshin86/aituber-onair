import { describe, expect, it } from 'vitest';
import * as core from '../src';
import * as chat from '@aituber-onair/chat';
import type { InworldModel, VoiceServiceOptions } from '../src';

describe('Released Chat and Voice model exports', () => {
  it.each([
    'MODEL_GPT_6_ASTRA',
    'MODEL_CLAUDE_5_1_FABLE',
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
});
