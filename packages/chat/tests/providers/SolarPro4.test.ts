import { afterEach, expect, it, vi } from 'vitest';
import {
  MODEL_UPSTAGE_SOLAR_PRO4,
  ENDPOINT_OPENROUTER_API,
} from '../../src/constants';
import { ChatServiceFactory } from '../../src/services/ChatServiceFactory';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

afterEach(() =>
  ChatServiceHttpClient.setFetch((url, init) => fetch(url, init)),
);

it.each([
  undefined,
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const)(
  'preserves Solar Pro 4 effort %s and omits unsupported budgets',
  async (effort) => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'Hello' } }] }),
        ),
      );
    ChatServiceHttpClient.setFetch(transport);
    const service = ChatServiceFactory.createChatService('openrouter', {
      apiKey: 'EXAMPLE_API_KEY',
      model: MODEL_UPSTAGE_SOLAR_PRO4,
      reasoning_effort: effort,
      reasoningMaxTokens: 2048,
      responseLength: 'long',
    });
    const result = await service.chatOnce!(
      [{ role: 'user', content: 'Hello' }],
      false,
    );
    expect(transport.mock.calls[0][0]).toBe(ENDPOINT_OPENROUTER_API);
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(body.model).toBe('upstage/solar-pro4');
    expect(body.reasoning).toEqual({ effort: effort ?? 'none', exclude: true });
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(body.reasoning_effort).toBeUndefined();
    expect(result.blocks).toEqual([{ type: 'text', text: 'Hello' }]);
  },
);
