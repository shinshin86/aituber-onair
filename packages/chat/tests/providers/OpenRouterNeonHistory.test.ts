import { afterEach, describe, expect, it, vi } from 'vitest';
import { MODEL_GOOGLE_GEMINI_4_NEON } from '../../src/constants/openrouter';
import { OpenRouterChatService } from '../../src/services/providers/openrouter/OpenRouterChatService';
import type { ToolChatCompletion } from '../../src/types';
import { getNeonHistory } from '../../src/utils/neonHistory';
import { GeminiChatService } from '../../src/services/providers/gemini/GeminiChatService';
import { OpenAIChatService } from '../../src/services/providers/openai/OpenAIChatService';
import { ClaudeChatService } from '../../src/services/providers/claude/ClaudeChatService';
import { MODEL_GEMINI_4_NEON } from '../../src/constants';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

const user = { role: 'user', content: 'Hello' } as const;
const encrypted = {
  type: 'reasoning.encrypted',
  index: 1,
  format: 'google-gemini-v1',
  data: 'mock-encrypted-detail',
};
const text = {
  type: 'reasoning.text',
  index: 0,
  id: 'mock-reasoning-id',
  format: 'google-gemini-v1',
  signature: 'mock-signature',
  text: 'Invisible thought',
};
const tool = {
  id: 'mock-call',
  type: 'function',
  function: { name: 'lookup', arguments: '{}' },
};
const oneShot = (message: unknown) =>
  new Response(JSON.stringify({ choices: [{ message }] }));
const stream = (...deltas: Record<string, unknown>[]) =>
  new Response(
    deltas
      .map((delta) => `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`)
      .join('') + 'data: [DONE]\n\n',
  );

afterEach(() => vi.restoreAllMocks());

describe('OpenRouter Gemini 4 Neon history', () => {
  const service = () =>
    new OpenRouterChatService(
      'test-key',
      MODEL_GOOGLE_GEMINI_4_NEON,
      MODEL_GOOGLE_GEMINI_4_NEON,
    );

  it('assembles indexed stream deltas and replays metadata without displaying it', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValueOnce(
        stream(
          { reasoning_details: [encrypted] },
          {
            reasoning_details: [
              { ...text, text: 'Invisible ', signature: null },
            ],
          },
          {
            content: 'Answer',
            reasoning_content: 'mock-stream-thought',
            reasoning_details: [
              {
                index: 0,
                id: null,
                text: 'thought',
                signature: text.signature,
              },
            ],
          },
        ),
      )
      .mockResolvedValueOnce(oneShot({ content: 'Follow-up' }));
    const chat = service();
    const partial = vi.fn();
    const complete = vi.fn(
      async (_text: string, _turn?: ToolChatCompletion) => {},
    );
    await chat.processChat([user], partial, complete);

    const turn = complete.mock.calls[0][1]!;
    expect(partial.mock.calls).toEqual([['Answer']]);
    expect(turn.blocks).toEqual([{ type: 'text', text: 'Answer' }]);
    expect(JSON.stringify(turn.assistant_message)).not.toContain(
      'mock-stream-thought',
    );
    expect(post.mock.calls[0][1].reasoning).toEqual({ effort: 'low' });
    expect(getNeonHistory(turn.assistant_message!)).toMatchObject({
      route: 'openrouter',
      details: [text, encrypted],
    });
    await chat.chatOnce(
      [user, turn.assistant_message!, user],
      false,
      undefined,
      100_000,
    );
    expect(post.mock.calls[1][1].max_tokens).toBe(65_536);
    expect(
      JSON.parse(JSON.stringify(post.mock.calls[1][1].messages[1])),
    ).toEqual({
      role: 'assistant',
      content: 'Answer',
      reasoning_details: [text, encrypted],
    });
  });

  it('preserves untouched one-shot details on tool continuation', async () => {
    const post = vi
      .spyOn(ChatServiceHttpClient, 'post')
      .mockResolvedValueOnce(
        oneShot({
          content: null,
          tool_calls: [tool],
          reasoning_details: [encrypted],
        }),
      )
      .mockResolvedValueOnce(oneShot({ content: 'Done' }));
    const chat = service();
    const turn = await chat.chatOnce([user], false);
    expect(turn.stop_reason).toBe('tool_use');
    expect(getNeonHistory(turn.assistant_message!)).toMatchObject({
      route: 'openrouter',
      details: [encrypted],
    });
    const result = {
      role: 'tool',
      tool_call_id: tool.id,
      content: 'Found',
    } as const;
    await chat.chatOnce([user, turn.assistant_message!, result], false);
    expect(JSON.parse(JSON.stringify(post.mock.calls[1][1].messages))).toEqual([
      user,
      {
        role: 'assistant',
        content: '',
        tool_calls: [tool],
        reasoning_details: [encrypted],
      },
      result,
    ]);
  });

  it('never sends private Neon history to another route over real JSON serialization', async () => {
    const native = new GeminiChatService('test-key', MODEL_GEMINI_4_NEON);
    const router = service();
    const nativeResult = () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Native answer',
                    thoughtSignature: 'mock-native-private',
                  },
                ],
              },
            },
          ],
        }),
      );
    const routerResult = () =>
      oneShot({
        content: 'Router answer',
        reasoning_details: [encrypted],
        reasoning: 'mock-router-summary',
        reasoning_content: 'mock-unstructured-thought',
        provider_content: [
          { type: 'thought', text: 'mock-extra-provider-thought' },
        ],
      });
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () => nativeResult())
      .mockImplementationOnce(async () => routerResult())
      .mockImplementationOnce(async () => oneShot({ content: 'OK' }))
      .mockImplementationOnce(async () => nativeResult())
      .mockImplementationOnce(async () => oneShot({ content: 'OK' }))
      .mockImplementationOnce(
        async () =>
          new Response(
            JSON.stringify({
              content: [{ type: 'text', text: 'OK' }],
              stop_reason: 'end_turn',
            }),
          ),
      )
      .mockImplementationOnce(async () => oneShot({ content: 'OK' }));

    const fromNative = (await native.chatOnce([user], false))
      .assistant_message!;
    const fromRouter = (await router.chatOnce([user], false))
      .assistant_message!;
    expect(JSON.parse(JSON.stringify(fromNative))).toEqual({
      role: 'assistant',
      content: 'Native answer',
    });
    expect(JSON.parse(JSON.stringify(fromRouter))).toEqual({
      role: 'assistant',
      content: 'Router answer',
    });

    await router.chatOnce([user, fromNative, user], false);
    await native.chatOnce([user, fromRouter, user], false);
    const history = [user, fromNative, user, fromRouter, user];
    await new OpenAIChatService('test-key', 'gpt-4o', 'gpt-4o').chatOnce(
      history,
      false,
    );
    await new ClaudeChatService('test-key').chatOnce(history, false);
    await new OpenRouterChatService(
      'test-key',
      MODEL_GOOGLE_GEMINI_4_NEON,
      MODEL_GOOGLE_GEMINI_4_NEON,
      [],
      'https://example.invalid/api/v1/chat/completions',
    ).chatOnce([user, fromRouter, user], false);

    const sent = fetchMock.mock.calls
      .slice(2)
      .map(([, init]) => String(init?.body));
    expect(sent).toHaveLength(5);
    expect(sent[0]).toContain('Native answer');
    expect(sent[1]).toContain('Router answer');
    for (const body of sent) {
      expect(body).not.toMatch(
        /mock-native-private|mock-encrypted-detail|mock-router-summary|mock-unstructured-thought|mock-extra-provider-thought|provider_content|reasoning_details/,
      );
    }
  });
});
