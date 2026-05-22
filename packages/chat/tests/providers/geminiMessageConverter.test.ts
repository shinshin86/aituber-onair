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
