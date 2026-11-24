import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODEL_GEMINI_4_NEON } from '../../src/constants';
import { GeminiChatService } from '../../src/services/providers/gemini/GeminiChatService';
import type { Message } from '../../src/types';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

const user: Message = { role: 'user', content: 'Hello' };
const response = (...chunks: unknown[][]) =>
  new Response(
    chunks
      .map(
        (parts) =>
          `data: ${JSON.stringify({ candidates: [{ content: { parts } }] })}\n\n`,
      )
      .join(''),
  );
const oneShot = (parts: unknown[]) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts } }] }));

afterEach(() => vi.restoreAllMocks());

describe('Gemini 4 Neon native history', () => {
  it('passes hidden and final empty signed stream parts only through explicit assistant history', async () => {
    const thought = { thought: true, text: 'Hidden summary' };
    const answer = { text: 'Same answer' };
    const signature = { text: '', thoughtSignature: 'mock-text-signature' };
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValueOnce(response([thought], [answer], [signature]))
      .mockResolvedValueOnce(oneShot([answer]));
    const service = new GeminiChatService('test-key', MODEL_GEMINI_4_NEON);
    const partial = vi.fn();
    const complete = vi.fn(async () => {});

    await service.processChat([user], partial, complete);
    expect(partial.mock.calls).toEqual([['Same answer']]);
    expect(complete).toHaveBeenCalledWith(
      'Same answer',
      expect.objectContaining({
        blocks: [{ type: 'text', text: 'Same answer' }],
        assistant_message: expect.objectContaining({ content: 'Same answer' }),
      }),
    );
    const history = complete.mock.calls[0] as unknown as [
      string,
      { assistant_message: Message },
    ];
    expect(post.mock.calls[0][0]).toContain(
      '/v1beta/models/gemini-4-neon:streamGenerateContent?alt=sse',
    );
    expect(post.mock.calls[0][1].generationConfig).toEqual({
      maxOutputTokens: 65_536,
      thinkingConfig: { includeThoughts: false, thinkingLevel: 'LOW' },
    });

    // An unrelated identical text message must not acquire this turn's signature.
    await service.chatOnce(
      [
        user,
        { role: 'assistant', content: 'Same answer' },
        user,
        { ...history[1].assistant_message },
        user,
      ],
      false,
    );
    expect(post.mock.calls[1][1].contents).toEqual([
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [answer] },
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [thought, answer, signature] },
      { role: 'user', parts: [{ text: 'Hello' }] },
    ]);
  });

  it.each([false, true])(
    'replays a parallel tool turn and matching results unchanged (stream=%s)',
    async (stream) => {
      const thought = { text: 'Hidden summary', thought: true };
      const calls = [
        {
          functionCall: {
            id: 'first',
            name: 'lookup',
            args: { functionCall: 'argument keys are not transformed' },
          },
          thoughtSignature: 'mock-tool-signature',
        },
        {
          functionCall: {
            id: 'second',
            name: 'lookup',
            args: { city: 'Osaka' },
          },
        },
      ];
      const answer = { text: 'Done', thoughtSignature: 'mock-final-signature' };
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValueOnce(
          stream
            ? response([thought], ...calls.map((call) => [call]))
            : oneShot([thought, ...calls]),
        )
        .mockResolvedValueOnce(oneShot([answer]));
      const service = new GeminiChatService(
        'test-key',
        MODEL_GEMINI_4_NEON,
        MODEL_GEMINI_4_NEON,
        [{ name: 'lookup', parameters: { type: 'object' } }],
        [],
        undefined,
        'high',
      );
      const first = await service.chatOnce([user], stream);
      expect(first.blocks.map((block) => block.type)).toEqual([
        'tool_use',
        'tool_use',
      ]);
      expect(first.stop_reason).toBe('tool_use');
      expect(
        post.mock.calls[0][1].generationConfig.thinkingConfig.thinkingLevel,
      ).toBe('HIGH');

      const second = await service.visionChatOnce(
        [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
          first.assistant_message!,
          { role: 'tool', content: '1', tool_call_id: 'first' },
          { role: 'tool', content: '2', tool_call_id: 'second' },
        ],
        false,
        undefined,
        2048,
      );
      expect(second.assistant_message?.content).toBe('Done');
      expect(post.mock.calls[1][1].generationConfig.maxOutputTokens).toBe(2048);
      expect(post.mock.calls[1][1].contents).toEqual([
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [thought, ...calls] },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                id: 'first',
                name: 'lookup',
                response: { content: 1 },
              },
            },
            {
              functionResponse: {
                id: 'second',
                name: 'lookup',
                response: { content: 2 },
              },
            },
          ],
        },
      ]);
    },
  );

  it('keeps the tool signature when callers rebuild the tool turn from blocks', async () => {
    const call = {
      functionCall: { id: 'first', name: 'lookup', args: { city: 'Osaka' } },
      thoughtSignature: 'mock-tool-signature',
    };
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValueOnce(oneShot([call]))
      .mockResolvedValueOnce(oneShot([{ text: 'Done' }]));
    const service = new GeminiChatService(
      'test-key',
      MODEL_GEMINI_4_NEON,
      MODEL_GEMINI_4_NEON,
      [{ name: 'lookup', parameters: { type: 'object' } }],
    );
    const first = await service.chatOnce([user], false);
    const toolUse = first.blocks.find((block) => block.type === 'tool_use');
    expect(toolUse).toMatchObject({ id: 'first', name: 'lookup' });

    // Rebuilt history without the symbol-keyed assistant_message metadata.
    await service.chatOnce(
      [
        user,
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'first',
              type: 'function',
              function: { name: 'lookup', arguments: '{"city":"Osaka"}' },
            },
          ],
        } as Message,
        { role: 'tool', content: '1', tool_call_id: 'first' } as Message,
      ],
      false,
    );
    expect(post.mock.calls[1][1].contents[1]).toEqual({
      role: 'model',
      parts: [call],
    });
  });
});
