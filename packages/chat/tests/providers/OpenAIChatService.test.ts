import { describe, expect, it } from 'vitest';
import {
  CHAT_RESPONSE_LENGTH,
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  MODEL_GPT_5_4,
  MODEL_GPT_5_4_MINI,
} from '../../src/constants';
import { OpenAIChatService } from '../../src/services/providers/openai/OpenAIChatService';
import { parseOpenAIResponsesOneShot } from '../../src/services/providers/openai/responsesParser';
import type { Message } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

describe('OpenAIChatService GPT-5 token budgeting', () => {
  it('raises chat completions token limit for GPT-5.4 responseLength presets', () => {
    const service = new OpenAIChatService(
      'test-key',
      MODEL_GPT_5_4,
      MODEL_GPT_5_4,
      undefined,
      ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
      [],
      CHAT_RESPONSE_LENGTH.MEDIUM,
      undefined,
      'none',
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_GPT_5_4,
      false,
    );

    expect(body.max_completion_tokens).toBe(2000);
  });

  it('raises responses token limit further for GPT-5.4-mini with medium reasoning', () => {
    const service = new OpenAIChatService(
      'test-key',
      MODEL_GPT_5_4_MINI,
      MODEL_GPT_5_4_MINI,
      undefined,
      ENDPOINT_OPENAI_RESPONSES_API,
      [],
      CHAT_RESPONSE_LENGTH.MEDIUM,
      undefined,
      'medium',
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_GPT_5_4_MINI,
      false,
    );

    expect(body.max_output_tokens).toBe(4000);
  });

  it('keeps explicit maxTokens unchanged', () => {
    const service = new OpenAIChatService(
      'test-key',
      MODEL_GPT_5_4_MINI,
      MODEL_GPT_5_4_MINI,
      undefined,
      ENDPOINT_OPENAI_RESPONSES_API,
      [],
      CHAT_RESPONSE_LENGTH.MEDIUM,
      undefined,
      'medium',
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_GPT_5_4_MINI,
      false,
      300,
    );

    expect(body.max_output_tokens).toBe(300);
  });

  it('surfaces incomplete metadata from responses one-shot payloads', () => {
    const result = parseOpenAIResponsesOneShot({
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
      usage: {
        output_tokens_details: {
          reasoning_tokens: 512,
        },
      },
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Hello',
            },
          ],
        },
      ],
    });

    expect(result.stop_reason).toBe('end');
    expect(result.truncated).toBe(true);
    expect(result.response_status).toBe('incomplete');
    expect(result.incomplete_details).toEqual({
      reason: 'max_output_tokens',
    });
    expect(result.usage).toEqual({
      output_tokens_details: {
        reasoning_tokens: 512,
      },
    });
  });
});
