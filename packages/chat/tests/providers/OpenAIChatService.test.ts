import { describe, expect, it } from 'vitest';
import { parseOpenAIResponsesOneShot } from '../../src/services/providers/openai/responsesParser';

describe('OpenAI responses parsing', () => {
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
