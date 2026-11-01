import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  ChatServiceHttpClient,
  type Message,
} from '../../src';

const encrypted = 'mock-sarashina-encrypted-state';
const existing = 'mock-existing-reasoning-content';
const routes = [
  {
    name: 'OpenAI Chat',
    provider: 'openai',
    options: { model: 'gpt-4o-mini' },
    forwardsExisting: true,
  },
  {
    name: 'OpenAI Responses',
    provider: 'openai',
    options: { model: 'gpt-6.1-sol' },
    forwardsExisting: false,
  },
  {
    name: 'OpenRouter',
    provider: 'openrouter',
    options: { model: 'openai/gpt-4o' },
    forwardsExisting: true,
  },
  { name: 'Kimi', provider: 'kimi', options: {}, forwardsExisting: true },
  {
    name: 'Mistral',
    provider: 'mistral',
    options: {},
    forwardsExisting: false,
  },
  { name: 'PLaMo', provider: 'plamo', options: {}, forwardsExisting: true },
  {
    name: 'DeepSeek',
    provider: 'deepseek',
    options: {},
    forwardsExisting: true,
  },
  { name: 'Z.ai', provider: 'zai', options: {}, forwardsExisting: true },
  { name: 'xAI', provider: 'xai', options: {}, forwardsExisting: true },
  { name: 'Sakana', provider: 'sakana', options: {}, forwardsExisting: true },
  {
    name: 'OpenAI-compatible',
    provider: 'openai-compatible',
    options: {
      model: 'local-model',
      endpoint: 'https://mock.example.test/v1/chat/completions',
    },
    forwardsExisting: true,
  },
  { name: 'Claude', provider: 'claude', options: {}, forwardsExisting: false },
  { name: 'Gemini', provider: 'gemini', options: {}, forwardsExisting: false },
  {
    name: 'Sarashina',
    provider: 'sarashina',
    options: {},
    forwardsExisting: false,
  },
] as const;

function reply(provider: string) {
  const data =
    provider === 'claude'
      ? { content: [{ type: 'text', text: 'ok' }] }
      : provider === 'gemini'
        ? {
            candidates: [
              { content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' },
            ],
          }
        : {
            choices: [
              {
                message: { role: 'assistant', content: 'ok' },
                finish_reason: 'stop',
              },
            ],
            output: [
              {
                type: 'message',
                role: 'assistant',
                content: [{ type: 'output_text', text: 'ok' }],
              },
            ],
            status: 'completed',
          };
  return new Response(JSON.stringify(data));
}

afterEach(() => vi.restoreAllMocks());

describe('Provider isolation for opaque Sarashina message reasoning', () => {
  it.each(routes)(
    '$name preserves existing reasoning_content behavior',
    async (route) => {
      const post = vi
        .spyOn(ChatServiceHttpClient, 'post')
        .mockResolvedValue(reply(route.provider));
      const history: Message[] = [
        { role: 'user', content: 'Start' },
        {
          role: 'assistant',
          content: 'Original reply',
          reasoning: encrypted,
          reasoning_content: existing,
        },
        { role: 'user', content: 'Continue' },
      ];
      const original = JSON.parse(JSON.stringify(history));
      const service = ChatServiceFactory.createChatService(route.provider, {
        apiKey: 'mock-only-key',
        ...route.options,
      });
      await service.chatOnce(history, false, () => {});
      const [endpoint, body] = post.mock.calls[0];
      const payload = JSON.stringify(body);
      expect(payload.includes(encrypted)).toBe(route.provider === 'sarashina');
      expect(payload.includes(existing)).toBe(route.forwardsExisting);
      expect(history).toEqual(original);
      if (route.name === 'OpenAI Chat')
        expect(endpoint).toBe('https://api.openai.com/v1/chat/completions');
      if (route.name === 'OpenAI Responses')
        expect(endpoint).toBe('https://api.openai.com/v1/responses');

      // The same request builders handle image paths; no image fetch is needed
      // to check assistant metadata while exercising those public methods.
      if (
        route.provider !== 'sarashina' &&
        ChatServiceFactory.getVisionSupportLevelForModel(
          route.provider,
          service.getVisionModel(),
        ) !== 'unsupported'
      ) {
        post.mockResolvedValue(reply(route.provider));
        await service.visionChatOnce(history, false, () => {});
        const visionPayload = JSON.stringify(post.mock.calls[1][1]);
        expect(visionPayload.includes(encrypted)).toBe(false);
        expect(visionPayload.includes(existing)).toBe(route.forwardsExisting);
        expect(history).toEqual(original);
      }
    },
  );
});
