import { describe, expect, it } from 'vitest';
import {
  convertMessagesToClaudeFormat,
  convertVisionMessagesToClaudeFormat,
  getMimeTypeFromUrl,
  mapRoleToClaude,
} from '../../src/services/providers/claude/claudeMessageConverter';
import type { Message, MessageWithVision } from '../../src/types';

describe('claudeMessageConverter', () => {
  it('maps chat roles to Claude roles', () => {
    expect(mapRoleToClaude('system')).toBe('system');
    expect(mapRoleToClaude('assistant')).toBe('assistant');
    expect(mapRoleToClaude('user')).toBe('user');
    expect(mapRoleToClaude('tool')).toBe('user');
    expect(mapRoleToClaude('unknown')).toBe('user');
  });

  it('converts text messages without changing content shape', () => {
    const messages: Message[] = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ];

    expect(convertMessagesToClaudeFormat(messages)).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]);
  });

  it('converts string vision messages into text blocks', () => {
    const messages: MessageWithVision[] = [
      { role: 'user', content: 'describe this image' },
    ];

    expect(convertVisionMessagesToClaudeFormat(messages)).toEqual([
      {
        role: 'user',
        content: [{ type: 'text', text: 'describe this image' }],
      },
    ]);
  });

  it('converts data URL image blocks into Claude base64 image blocks', () => {
    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'what is this?' },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/png;base64,ZmFrZS1pbWFnZQ==',
            },
          },
        ],
      },
    ];

    expect(convertVisionMessagesToClaudeFormat(messages)).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'what is this?' },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: 'ZmFrZS1pbWFnZQ==',
            },
          },
        ],
      },
    ]);
  });

  it('converts URL image blocks with inferred media type', () => {
    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.test/photo.webp',
            },
          },
        ],
      },
    ];

    expect(convertVisionMessagesToClaudeFormat(messages)).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: 'https://example.test/photo.webp',
              media_type: 'image/webp',
            },
          },
        ],
      },
    ]);
  });

  it('infers supported image MIME types and defaults to jpeg', () => {
    expect(getMimeTypeFromUrl('https://example.test/a.jpg')).toBe('image/jpeg');
    expect(getMimeTypeFromUrl('https://example.test/a.jpeg')).toBe(
      'image/jpeg',
    );
    expect(getMimeTypeFromUrl('https://example.test/a.png')).toBe('image/png');
    expect(getMimeTypeFromUrl('https://example.test/a.gif')).toBe('image/gif');
    expect(getMimeTypeFromUrl('https://example.test/a.webp')).toBe(
      'image/webp',
    );
    expect(getMimeTypeFromUrl('https://example.test/a.unknown')).toBe(
      'image/jpeg',
    );
  });
});
