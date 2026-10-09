import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_5_5_HAIKU,
  getClaudeSupportedReasoningEfforts,
  getDefaultClaudeReasoningEffort,
  normalizeClaudeReasoningEffort,
  type ClaudeReasoningEffort,
  type Message,
  type MessageWithVision,
} from '../../src';
import { ClaudeChatService } from '../../src/services/providers/claude/ClaudeChatService';

const createSseResponse = (
  events: Record<string, unknown>[],
  chunkSize = 7,
): Response => {
  const bytes = new TextEncoder().encode(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''),
  );
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (let offset = 0; offset < bytes.length; offset += chunkSize)
          controller.enqueue(bytes.slice(offset, offset + chunkSize));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );
};

const FAKE_KEY = 'mock-only-not-a-provider-key';
const messages: Message[] = [{ role: 'user', content: 'Hello' }];
const tool = {
  name: 'weather',
  description: 'Read the weather',
  parameters: { type: 'object', properties: { city: { type: 'string' } } },
};
const thinking = {
  type: 'thinking',
  thinking: '',
  signature: 'mock-signature',
};
const toolUse = {
  type: 'tool_use',
  id: 'tool_mock',
  name: 'weather',
  input: { city: 'Tokyo' },
};
const text = { type: 'text', text: 'こんにちは' };
let fetchMock: ReturnType<typeof vi.fn>;
const jsonResponse = (content = [text], stop_reason = 'end_turn') =>
  new Response(JSON.stringify({ content, stop_reason }), {
    headers: { 'Content-Type': 'application/json' },
  });
const bodyAt = (index = 0) =>
  JSON.parse(fetchMock.mock.calls[index][1].body as string);
const service = (reasoning_effort?: ClaudeReasoningEffort) =>
  ChatServiceFactory.createChatService('claude', {
    apiKey: FAKE_KEY,
    model: MODEL_CLAUDE_5_5_HAIKU,
    tools: [tool],
    reasoning_effort,
  });

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse());
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('Claude Haiku 5.5 Messages API (mock transport only)', () => {
  it('exports and appends the explicit model without changing defaults', () => {
    expect(MODEL_CLAUDE_5_5_HAIKU).toBe('claude-haiku-5-5');
    expect(ChatServiceFactory.getSupportedModels('claude').at(-1)).toBe(
      MODEL_CLAUDE_5_5_HAIKU,
    );
    expect(
      ChatServiceFactory.createChatService('claude', {
        apiKey: FAKE_KEY,
      }).getModel(),
    ).toBe(MODEL_CLAUDE_4_5_HAIKU);
    expect(service().getVisionModel()).toBe(MODEL_CLAUDE_5_5_HAIKU);
    expect(
      ChatServiceFactory.getProviderCapabilities(
        'claude',
        MODEL_CLAUDE_5_5_HAIKU,
      )?.reasoningEffort,
    ).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    expect(getClaudeSupportedReasoningEfforts(MODEL_CLAUDE_5_5_HAIKU)).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
    expect(getDefaultClaudeReasoningEffort(MODEL_CLAUDE_5_5_HAIKU)).toBe('low');
    expect(normalizeClaudeReasoningEffort(MODEL_CLAUDE_5_5_HAIKU)).toBe('low');
  });

  it('defaults to low effort and sends no unsupported thinking or sampling fields', async () => {
    const result = await service().chatOnce(messages, false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINT_CLAUDE_API);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('x-api-key')).toBe(FAKE_KEY);
    expect(new Headers(init.headers).get('anthropic-version')).toBe(
      '2023-06-01',
    );
    expect(
      new Headers(init.headers).get(
        'anthropic-dangerous-direct-browser-access',
      ),
    ).toBe('true');
    expect(new Headers(init.headers).has('anthropic-beta')).toBe(false);
    expect(bodyAt()).toMatchObject({
      model: MODEL_CLAUDE_5_5_HAIKU,
      stream: false,
      messages,
      output_config: { effort: 'low' },
      tool_choice: { type: 'auto' },
      tools: [{ name: 'weather', input_schema: tool.parameters }],
    });
    for (const field of [
      'thinking',
      'temperature',
      'top_p',
      'top_k',
      'budget_tokens',
    ]) {
      expect(bodyAt()).not.toHaveProperty(field);
    }
    expect(result.blocks).toEqual([text]);
  });

  it.each(['low', 'medium', 'high', 'xhigh', 'max'] as const)(
    'preserves explicit %s effort in factory and direct service calls',
    async (effort) => {
      expect(
        normalizeClaudeReasoningEffort(MODEL_CLAUDE_5_5_HAIKU, effort),
      ).toBe(effort);
      await service(effort).chatOnce(messages, false);
      await new ClaudeChatService(
        FAKE_KEY,
        MODEL_CLAUDE_5_5_HAIKU,
        MODEL_CLAUDE_5_5_HAIKU,
        [],
        [],
        undefined,
        effort,
      ).chatOnce(messages, false);
      expect(bodyAt().output_config).toEqual({ effort });
      expect(bodyAt(1).output_config).toEqual({ effort });
    },
  );

  it('rejects undocumented efforts before transport', () => {
    expect(() => service('none' as ClaudeReasoningEffort)).toThrow(
      'does not support Claude reasoning_effort',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [MODEL_CLAUDE_4_5_HAIKU, MODEL_CLAUDE_5_5_HAIKU, { effort: 'low' }],
    [MODEL_CLAUDE_5_5_HAIKU, MODEL_CLAUDE_4_5_HAIKU, undefined],
  ] as const)(
    'uses the actual vision model %s / %s for effort and images',
    async (model, visionModel, effort) => {
      const chat = ChatServiceFactory.createChatService('claude', {
        apiKey: FAKE_KEY,
        model,
        visionModel,
      });
      const visionMessages: MessageWithVision[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this' },
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,aGVsbG8=' },
            },
          ],
        },
      ];
      await chat.visionChatOnce(visionMessages, false);
      expect(bodyAt()).toMatchObject({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this' },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'aGVsbG8=',
                },
              },
            ],
          },
        ],
      });
      expect(bodyAt().output_config).toEqual(effort);
    },
  );

  it.each([false, true])(
    'preserves signed thinking and tool results in %s streaming continuation',
    async (stream) => {
      const providerContent = [thinking, toolUse];
      fetchMock.mockResolvedValueOnce(
        stream
          ? createSseResponse([
              {
                type: 'content_block_start',
                index: 0,
                content_block: {
                  type: 'thinking',
                  thinking: '',
                  signature: '',
                },
              },
              {
                type: 'content_block_delta',
                index: 0,
                delta: { type: 'signature_delta', signature: 'mock-' },
              },
              {
                type: 'content_block_delta',
                index: 0,
                delta: { type: 'signature_delta', signature: 'signature' },
              },
              { type: 'content_block_stop', index: 0 },
              {
                type: 'content_block_start',
                index: 1,
                content_block: { ...toolUse, input: {} },
              },
              {
                type: 'content_block_delta',
                index: 1,
                delta: { type: 'input_json_delta', partial_json: '{"city":' },
              },
              {
                type: 'content_block_delta',
                index: 1,
                delta: { type: 'input_json_delta', partial_json: '"Tokyo"}' },
              },
              { type: 'content_block_stop', index: 1 },
              { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
              { type: 'message_stop' },
            ])
          : new Response(
              JSON.stringify({
                content: providerContent,
                stop_reason: 'tool_use',
              }),
            ),
      );
      const chat = service();
      const partial = vi.fn();
      const result = await chat.chatOnce(messages, stream, partial);
      expect(result.stop_reason).toBe('tool_use');
      expect(result.blocks).toEqual([toolUse]);
      expect(partial).not.toHaveBeenCalled();
      expect(result.assistant_message?.provider_content).toEqual(
        providerContent,
      );
      const toolResult: Message = {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: toolUse.id, content: 'Sunny' },
        ],
      };
      await chat.chatOnce(
        [...messages, result.assistant_message!, toolResult],
        false,
      );
      expect(bodyAt(1).messages).toEqual([
        ...messages,
        { role: 'assistant', content: providerContent },
        toolResult,
      ]);
    },
  );

  it('streams visible text after hidden thinking and keeps terminal metadata', async () => {
    fetchMock.mockResolvedValueOnce(
      createSseResponse(
        [
          { type: 'content_block_start', index: 0, content_block: thinking },
          { type: 'content_block_stop', index: 0 },
          {
            type: 'content_block_start',
            index: 1,
            content_block: { type: 'text', text: '' },
          },
          {
            type: 'content_block_delta',
            index: 1,
            delta: { type: 'text_delta', text: text.text },
          },
          { type: 'content_block_stop', index: 1 },
          { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
          { type: 'message_stop' },
        ],
        7,
      ),
    );
    const partial = vi.fn();
    const complete = vi.fn();
    await service().processChat(messages, partial, complete);
    expect(partial).toHaveBeenCalledWith(text.text);
    expect(complete).toHaveBeenCalledWith(
      text.text,
      expect.objectContaining({
        finish_reason: 'end_turn',
        assistant_message: expect.objectContaining({
          provider_content: [thinking, text],
        }),
      }),
    );
    expect(bodyAt().stream).toBe(true);
  });

  it('retains refusal and max_tokens completions without exposing thinking', async () => {
    for (const reason of ['refusal', 'max_tokens']) {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: [thinking],
            stop_reason: reason,
            stop_details: { type: 'refusal', category: 'mock' },
          }),
        ),
      );
      const result = await service().chatOnce(messages, false);
      expect(result.blocks).toEqual([]);
      expect(result.stop_reason).toBe('end');
      expect(result.finish_reason).toBe(reason);
    }
  });

  it('surfaces provider errors without retrying or changing endpoints', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":{"type":"authentication_error"}}', {
        status: 401,
        statusText: 'Unauthorized',
      }),
    );
    await expect(service().chatOnce(messages, false)).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
