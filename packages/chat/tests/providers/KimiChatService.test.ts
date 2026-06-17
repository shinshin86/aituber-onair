import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MODEL_KIMI_K2_6, MODEL_KIMI_K2_7_CODE } from '../../src/constants';
import { KimiChatService } from '../../src/services/providers/kimi/KimiChatService';
import type { Message, ToolDefinition } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const tools: ToolDefinition[] = [
  {
    name: 'lookupWeather',
    description: 'Lookup weather by city',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
      },
      required: ['city'],
    },
  },
];

describe('KimiChatService request body', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps thinking enabled for Kimi K2.7 Code when tools are provided', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_7_CODE,
      MODEL_KIMI_K2_7_CODE,
      tools,
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_KIMI_K2_7_CODE,
      true,
    );

    expect(body).toEqual(
      expect.objectContaining({
        model: MODEL_KIMI_K2_7_CODE,
        stream: true,
        thinking: { type: 'enabled' },
        tool_choice: 'auto',
      }),
    );
  });

  it('throws when Kimi K2.7 Code explicitly disables thinking', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_7_CODE,
      MODEL_KIMI_K2_7_CODE,
      undefined,
      undefined,
      undefined,
      undefined,
      { type: 'disabled' },
    );

    expect(() =>
      (service as any).buildRequestBody(messages, MODEL_KIMI_K2_7_CODE, true),
    ).toThrow('requires thinking mode');
  });

  it('keeps existing tool behavior for older Kimi models', () => {
    const service = new KimiChatService(
      'test-key',
      MODEL_KIMI_K2_6,
      MODEL_KIMI_K2_6,
      tools,
    );

    const body = (service as any).buildRequestBody(
      messages,
      MODEL_KIMI_K2_6,
      true,
    );

    expect(body.thinking).toEqual({ type: 'disabled' });
  });
});
