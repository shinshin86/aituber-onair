import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  ENDPOINT_OPENROUTER_API,
  MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
  getOpenRouterSupportedReasoningEfforts,
  getDefaultOpenRouterReasoningEffort,
  isOpenRouterFreeModel,
  type MessageWithVision,
} from '../../src';
import { openRouterCatalogAdditions } from '../fixtures/openrouterCatalogAdditions';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

const messages = [{ role: 'user', content: 'Hello' }] as const;
const images: MessageWithVision[] = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Describe this' },
      {
        type: 'image_url',
        image_url: { url: 'https://example.test/image.png' },
      },
    ],
  },
];
const tools = [
  {
    name: 'lookup',
    description: 'Lookup data',
    parameters: { type: 'object', properties: {} },
  },
];
const toolCall = {
  id: 'call-1',
  type: 'function',
  function: { name: 'lookup', arguments: '{}' },
};
const reply = (stream: boolean) =>
  new Response(
    stream
      ? `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ ...toolCall, index: 0 }] } }] })}\n\ndata: [DONE]\n\n`
      : JSON.stringify({
          choices: [
            {
              message: { tool_calls: [toolCall] },
              finish_reason: 'tool_calls',
            },
          ],
        }),
  );

afterEach(() => vi.restoreAllMocks());

describe.each(openRouterCatalogAdditions)(
  '$model catalog addition',
  (entry) => {
    it('is a paid explicit image-capable choice with verified effort metadata', () => {
      const caps = ChatServiceFactory.getProviderCapabilities(
        'openrouter',
        entry.model,
      )!;
      expect(caps.models).toContain(entry.model);
      expect(caps.defaultModel).toBe(MODEL_GOOGLE_GEMMA_4_31B_IT_FREE);
      expect(caps.vision).toBe('supported');
      expect(caps.reasoningEffort).toEqual(entry.efforts);
      expect(isOpenRouterFreeModel(entry.model)).toBe(false);
      expect(getDefaultOpenRouterReasoningEffort(entry.model)).toBe(
        entry.defaultEffort,
      );
      expect(getOpenRouterSupportedReasoningEfforts(entry.model)).toEqual(
        entry.efforts,
      );
    });

    it.each([false, true])(
      'uses the authenticated chat route for text, images and tools (stream=%s)',
      async (stream) => {
        const post = vi
          .spyOn(ChatServiceHttpClient, 'post')
          .mockImplementation(async () => reply(stream));
        const chat = ChatServiceFactory.createChatService('openrouter', {
          apiKey: 'test-key',
          model: entry.model,
          tools,
        });
        const text = await chat.chatOnce!([...messages], stream);
        const vision = await chat.visionChatOnce!(images, stream, () => {});
        expect(text.blocks).toContainEqual({
          type: 'tool_use',
          id: 'call-1',
          name: 'lookup',
          input: {},
        });
        expect(vision.blocks).toContainEqual({
          type: 'tool_use',
          id: 'call-1',
          name: 'lookup',
          input: {},
        });
        for (const [url, body, headers] of post.mock.calls) {
          expect(url).toBe(ENDPOINT_OPENROUTER_API);
          expect(headers).toMatchObject({ Authorization: 'Bearer test-key' });
          expect(body).toMatchObject({
            model: entry.model,
            stream,
            tools: [{ type: 'function', function: { name: 'lookup' } }],
          });
          expect(body.reasoning?.effort).toBe(entry.defaultEffort);
          expect(body).not.toHaveProperty('provider');
          if (entry.model === 'sakana/sakana-namazu')
            expect(body).not.toHaveProperty('max_tokens');
          else expect(body.max_tokens).toBe(5000);
        }
        expect(post.mock.calls[0][1].messages).toEqual(messages);
        expect(post.mock.calls[1][1].messages).toEqual(images);
      },
    );

    it('preserves explicit supported efforts and drops unverified controls', async () => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockImplementation(async () => reply(false));
      for (const effort of entry.efforts.length ? entry.efforts : ['high']) {
        const chat = ChatServiceFactory.createChatService('openrouter', {
          apiKey: 'test-key',
          model: entry.model,
          reasoning_effort: effort as
            | 'none'
            | 'low'
            | 'medium'
            | 'high'
            | 'xhigh'
            | 'max',
          reasoningMaxTokens: 1024,
        });
        await chat.chatOnce!([...messages], false, () => {}, 1234);
        const body = post.mock.calls.at(-1)![1];
        expect(body.reasoning?.effort).toBe(
          entry.efforts.length ? effort : undefined,
        );
        if (entry.withoutBudget)
          expect(body).not.toHaveProperty('reasoning.max_tokens');
        if (entry.model === 'sakana/sakana-namazu')
          expect(body).not.toHaveProperty('max_tokens');
        else expect(body.max_tokens).toBe(1234);
      }
    });
  },
);

it('keeps the pre-existing Nemotron free variant independently available', () => {
  const models = ChatServiceFactory.getSupportedModels('openrouter');
  expect(models).toContain('nvidia/nemotron-3.5-super-vl');
  expect(models).toContain('nvidia/nemotron-3.5-super-vl:free');
  expect(isOpenRouterFreeModel('nvidia/nemotron-3.5-super-vl:free')).toBe(true);
});
