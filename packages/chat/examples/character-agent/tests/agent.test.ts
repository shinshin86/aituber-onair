import { describe, expect, it, vi } from 'vitest';
import type { ChatService } from '../../../src/services/ChatService';
import type { Message } from '../../../src/types';
import type { ToolChatCompletion } from '../../../src/types/toolChat';
import { createSecretaryAgent } from '../src/agent';
import { createJsonStorage } from '../src/storage/jsonStorage';
import { createSecretaryTools } from '../src/tools';
import { createTempDataDir } from './testUtils';

function createMockChatService(results: ToolChatCompletion[]): ChatService {
  const chatOnce = vi.fn(async () => {
    const result = results.shift();

    if (!result) {
      throw new Error('Unexpected chatOnce call');
    }

    return result;
  });

  return {
    provider: 'mock',
    getModel: () => 'mock-model',
    getVisionModel: () => 'mock-vision-model',
    processChat: vi.fn(),
    processVisionChat: vi.fn(),
    chatOnce,
    visionChatOnce: vi.fn(),
  };
}

describe('secretary agent loop', () => {
  it('adds the character prompt, executes tool calls, and returns the final text', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tools = createSecretaryTools({ storage });
    const chat = createMockChatService([
      {
        stop_reason: 'tool_use',
        blocks: [
          {
            type: 'tool_use',
            id: 'call_1',
            name: 'memo_save',
            input: {
              title: 'Idea',
              content: 'Make a short planning stream.',
            },
          },
        ],
      },
      {
        stop_reason: 'end',
        blocks: [{ type: 'text', text: 'メモに整理しました。' }],
      },
    ]);
    const agent = createSecretaryAgent({ chat, tools });

    const result = await agent.respond('今日の配信アイデアを覚えて');

    expect(result).toBe('メモに整理しました。');
    const firstCallMessages = vi.mocked(chat.chatOnce).mock
      .calls[0][0] as Message[];
    expect(firstCallMessages[0].role).toBe('system');
    expect(firstCallMessages[0].content).toContain('AI character secretary');
    const secondCallMessages = vi.mocked(chat.chatOnce).mock
      .calls[1][0] as Message[];
    expect(secondCallMessages.at(-1)).toMatchObject({
      role: 'tool',
      content: expect.stringContaining('"ok":true'),
    });
    await expect(storage.readJsonArray('memos.json')).resolves.toHaveLength(1);
  });

  it('keeps conversation history across user turns', async () => {
    const storage = createJsonStorage({ baseDir: await createTempDataDir() });
    const tools = createSecretaryTools({ storage });
    const chat = createMockChatService([
      {
        stop_reason: 'end',
        blocks: [
          {
            type: 'text',
            text: '次回配信の告知案は「作戦会議回にしましょう」です。',
          },
        ],
      },
      {
        stop_reason: 'tool_use',
        blocks: [
          {
            type: 'tool_use',
            id: 'call_draft_1',
            name: 'draft_create',
            input: {
              type: 'announcement',
              purpose: '前回提案した次回配信告知案の保存',
              body: '作戦会議回にしましょう',
            },
          },
        ],
      },
      {
        stop_reason: 'end',
        blocks: [{ type: 'text', text: '告知下書きとして保存しました。' }],
      },
    ]);
    const agent = createSecretaryAgent({ chat, tools });

    await agent.respond('次回配信の告知案を提案して');
    const result = await agent.respond('その提案を保存して');

    expect(result).toBe('告知下書きとして保存しました。');
    const secondTurnMessages = vi.mocked(chat.chatOnce).mock
      .calls[1][0] as Message[];
    expect(secondTurnMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('作戦会議回'),
        }),
        expect.objectContaining({
          role: 'user',
          content: 'その提案を保存して',
        }),
      ]),
    );
    await expect(storage.readJsonArray('drafts.json')).resolves.toHaveLength(1);
  });
});
