import { describe, expect, it, vi } from 'vitest';
import {
  convertMessagesToGeminiFormat,
  convertVisionMessagesToGeminiFormat,
  mapRoleToGemini,
} from '../../src/services/providers/gemini/geminiMessageConverter';
import type { Message, MessageWithVision } from '../../src/types';

describe('geminiMessageConverter', () => {
  it('maps chat roles to Gemini roles', () => {
    expect(mapRoleToGemini('system')).toBe('model');
    expect(mapRoleToGemini('assistant')).toBe('model');
    expect(mapRoleToGemini('user')).toBe('user');
    expect(mapRoleToGemini('tool')).toBe('user');
    expect(mapRoleToGemini('unknown')).toBe('user');
  });

  it('groups adjacent text messages by mapped Gemini role', () => {
    const messages: Message[] = [
      { role: 'system', content: 'system prompt' },
      { role: 'assistant', content: 'assistant context' },
      { role: 'user', content: 'hello' },
      { role: 'user', content: 'follow up' },
      { role: 'assistant', content: 'answer' },
    ];

    expect(convertMessagesToGeminiFormat(messages)).toEqual([
      {
        role: 'model',
        parts: [{ text: 'system prompt' }, { text: 'assistant context' }],
      },
      {
        role: 'user',
        parts: [{ text: 'hello' }, { text: 'follow up' }],
      },
      {
        role: 'model',
        parts: [{ text: 'answer' }],
      },
    ]);
  });

  it('preserves ids and signatures while grouping parallel tool exchanges', () => {
    const messages = [
      { role: 'user', content: 'Compare Tokyo and Osaka weather.' },
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'common-call-1',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: '{"city":"Tokyo"}',
            },
          },
          {
            id: 'common-call-2',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: '{"city":"Osaka"}',
            },
          },
        ],
      },
      {
        role: 'tool',
        content: '{"temperature":25}',
        tool_call_id: 'common-call-1',
      },
      {
        role: 'tool',
        content: '{"temperature":27}',
        tool_call_id: 'common-call-2',
      },
    ] as Message[];
    const functionCallContextMap = new Map([
      [
        'common-call-1',
        {
          name: 'get_weather',
          providerCallId: 'gemini-call-1',
          thoughtSignature: 'signed-context',
        },
      ],
      [
        'common-call-2',
        {
          name: 'get_weather',
          providerCallId: 'gemini-call-2',
        },
      ],
    ]);

    expect(
      convertMessagesToGeminiFormat(messages, { functionCallContextMap }),
    ).toEqual([
      {
        role: 'user',
        parts: [{ text: 'Compare Tokyo and Osaka weather.' }],
      },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'gemini-call-1',
              name: 'get_weather',
              args: { city: 'Tokyo' },
            },
            thoughtSignature: 'signed-context',
          },
          {
            functionCall: {
              id: 'gemini-call-2',
              name: 'get_weather',
              args: { city: 'Osaka' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'gemini-call-1',
              name: 'get_weather',
              response: { temperature: 25 },
            },
          },
          {
            functionResponse: {
              id: 'gemini-call-2',
              name: 'get_weather',
              response: { temperature: 27 },
            },
          },
        ],
      },
    ]);
  });

  it('converts text and image vision blocks to Gemini parts', async () => {
    const imageFetcher = vi.fn().mockResolvedValue({
      blob: async () => new Blob(['fake-image'], { type: 'image/png' }),
    } as Response);
    const blobToBase64 = vi
      .fn()
      .mockResolvedValue('data:image/png;base64,ZmFrZS1pbWFnZQ==');
    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'describe this' },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.test/image.png',
            },
          },
        ],
      },
    ];

    await expect(
      convertVisionMessagesToGeminiFormat(messages, {
        imageFetcher,
        blobToBase64,
      }),
    ).resolves.toEqual([
      {
        role: 'user',
        parts: [
          { text: 'describe this' },
          {
            inlineData: {
              mimeType: 'image/png',
              data: 'ZmFrZS1pbWFnZQ==',
            },
          },
        ],
      },
    ]);

    expect(imageFetcher).toHaveBeenCalledWith('https://example.test/image.png');
  });
});
