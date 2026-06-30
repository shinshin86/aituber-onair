import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_4_8_OPUS,
  MODEL_CLAUDE_5_SONNET,
} from '../../src/constants';
import { ClaudeChatService } from '../../src/services/providers/claude/ClaudeChatService';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';
import type { Message } from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

const createOkResponse = () =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ content: [] }),
    text: async () => JSON.stringify({ content: [] }),
  }) as Response;

describe('ClaudeChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to Claude Haiku 4.5 for text and vision', () => {
    const service = new ClaudeChatService('test-key');

    expect(service.getModel()).toBe(MODEL_CLAUDE_4_5_HAIKU);
    expect(service.getVisionModel()).toBe(MODEL_CLAUDE_4_5_HAIKU);
  });

  it('sends the selected Claude model id to the Messages API', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ClaudeChatService(
      'test-key',
      MODEL_CLAUDE_4_8_OPUS,
      MODEL_CLAUDE_4_8_OPUS,
    );

    await (service as any).callClaude(messages, MODEL_CLAUDE_4_8_OPUS, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe(ENDPOINT_CLAUDE_API);
    expect(postSpy.mock.calls[0][1]).toMatchObject({
      model: MODEL_CLAUDE_4_8_OPUS,
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });
    expect(postSpy.mock.calls[0][2]).toMatchObject({
      'x-api-key': 'test-key',
      'anthropic-version': '2023-06-01',
    });
  });

  it('sends Claude Sonnet 5 through the same Messages API route', async () => {
    const postSpy = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValue(createOkResponse());
    const service = new ClaudeChatService(
      'test-key',
      MODEL_CLAUDE_5_SONNET,
      MODEL_CLAUDE_5_SONNET,
    );

    await (service as any).callClaude(messages, MODEL_CLAUDE_5_SONNET, false);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0][0]).toBe(ENDPOINT_CLAUDE_API);
    expect(postSpy.mock.calls[0][1]).toMatchObject({
      model: MODEL_CLAUDE_5_SONNET,
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });
    expect(postSpy.mock.calls[0][2]).toMatchObject({
      'x-api-key': 'test-key',
      'anthropic-version': '2023-06-01',
    });
  });
});
