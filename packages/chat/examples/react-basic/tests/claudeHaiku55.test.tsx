// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_4_5_HAIKU,
  MODEL_CLAUDE_5_5_HAIKU,
} from '../../../src';
import App from '../src/App';
import {
  allModels,
  getDefaultModelForProvider,
} from '../src/components/ProviderSelector';
import { catalogFixture } from './catalogFixture';

const FAKE_KEY = 'mock-only-not-a-provider-key';
let container: HTMLDivElement;
let root: Root;
let requests: { url: string; body: any; headers: Headers }[];
let responses: Response[];
let unexpected: string[];
const efforts = ['low', 'medium', 'high', 'xhigh', 'max'];

function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = container.querySelector<T>(selector);
  expect(found, selector).not.toBeNull();
  return found!;
}
async function change(selector: string, value: string) {
  const target = element<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(selector);
  const prototype =
    target instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : target instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(
      target,
      value,
    );
    target.dispatchEvent(
      new Event(target instanceof HTMLSelectElement ? 'change' : 'input', {
        bubbles: true,
      }),
    );
  });
}
async function choose(selector: string, label: string) {
  const target = [
    ...container.querySelectorAll<HTMLButtonElement>(selector),
  ].find(
    (button) =>
      button.querySelector('.provider-name, .model-name')?.textContent ===
      label,
  );
  expect(target, label).toBeDefined();
  expect(target!.disabled).toBe(false);
  await act(async () => target!.click());
}
function reply(text = 'こんにちは', stopReason = 'end_turn') {
  const events = [
    {
      type: 'content_block_start',
      index: 0,
      content_block: {
        type: 'thinking',
        thinking: '',
        signature: 'mock-signature',
      },
    },
    { type: 'content_block_stop', index: 0 },
    {
      type: 'content_block_start',
      index: 1,
      content_block: { type: 'text', text: '' },
    },
    {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'text_delta', text },
    },
    { type: 'content_block_stop', index: 1 },
    { type: 'message_delta', delta: { stop_reason: stopReason } },
    { type: 'message_stop' },
  ];
  const bytes = new TextEncoder().encode(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''),
  );
  responses.push(
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (let offset = 0; offset < bytes.length; offset += 7)
            controller.enqueue(bytes.slice(offset, offset + 7));
          controller.close();
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    ),
  );
}
async function send(text = 'Hello') {
  await change('.chat-input', text);
  await act(async () => element<HTMLButtonElement>('.send-button').click());
}
async function selectHaiku() {
  await choose('.provider-item', 'Claude');
  await choose('.model-item', 'Claude Haiku 5.5');
  await change('#api-key', FAKE_KEY);
}

beforeEach(async () => {
  requests = [];
  responses = [];
  unexpected = [];
  localStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      if (url === 'https://openrouter.ai/api/v1/models')
        return new Response(JSON.stringify(catalogFixture));
      const response = responses.shift();
      if (url !== ENDPOINT_CLAUDE_API || !response) {
        unexpected.push(String(url));
        throw new Error(`Unexpected network request blocked: ${url}`);
      }
      requests.push({
        url,
        body: JSON.parse(init.body as string),
        headers: new Headers(init.headers),
      });
      expect(init.method).toBe('POST');
      return response;
    }),
  );
  for (const name of ['XMLHttpRequest', 'WebSocket', 'EventSource'])
    vi.stubGlobal(
      name,
      vi.fn(() => {
        unexpected.push(name);
        throw new Error(`Unexpected ${name} blocked`);
      }),
    );
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<App />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  expect(unexpected).toEqual([]);
  expect(responses).toEqual([]);
});

describe('Haiku 5.5 actual React App and transport (offline)', () => {
  it('appends an explicit selector and preserves the provider default', async () => {
    expect(
      allModels.filter((model) => model.provider === 'claude').at(-1),
    ).toMatchObject({ id: MODEL_CLAUDE_5_5_HAIKU, default: false });
    expect(getDefaultModelForProvider('claude')).toBe(MODEL_CLAUDE_4_5_HAIKU);
    await selectHaiku();
    const control = element<HTMLSelectElement>('#claude-reasoning-effort');
    expect([...control.options].map((option) => option.value)).toEqual(efforts);
    expect(control.value).toBe('low');
    expect(control.options[1].textContent).toBe('Medium (API default)');
    expect(control.options[2].textContent).toBe('High');
    expect(element<HTMLInputElement>('#image-upload').disabled).toBe(false);
    reply();
    await send();
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(requests[0].headers.get('x-api-key')).toBe(FAKE_KEY);
    expect(
      requests[0].headers.get('anthropic-dangerous-direct-browser-access'),
    ).toBe('true');
    expect(requests[0].body).toMatchObject({
      model: MODEL_CLAUDE_5_5_HAIKU,
      stream: true,
      output_config: { effort: 'low' },
    });
    expect(requests[0].body.thinking).toBeUndefined();
    expect(element('.assistant .message-text').textContent).toBe('こんにちは');
    expect(container.textContent).not.toContain('mock-signature');
  });

  it('preserves every explicit effort, repeated active selection and conversation history', async () => {
    await selectHaiku();
    for (const effort of efforts) {
      await change('#claude-reasoning-effort', effort);
      await choose('.model-item', 'Claude Haiku 5.5');
      expect(element<HTMLSelectElement>('#claude-reasoning-effort').value).toBe(
        effort,
      );
      reply();
      await send(`Use ${effort}`);
      expect(requests.at(-1)!.body.output_config).toEqual({ effort });
    }
    expect(requests[1].body.messages[1]).toEqual({
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: '', signature: 'mock-signature' },
        { type: 'text', text: 'こんにちは' },
      ],
    });
    expect(container.querySelectorAll('.message.assistant')).toHaveLength(5);
  });

  it('sends uploaded image bytes through the same direct Messages path', async () => {
    await selectHaiku();
    const file = new File(['mock image'], 'mock.png', { type: 'image/png' });
    Object.defineProperty(element('#image-upload'), 'files', {
      configurable: true,
      value: [file],
    });
    await act(async () => {
      element('#image-upload').dispatchEvent(
        new Event('change', { bubbles: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    reply('An image');
    await send('Describe the image');
    expect(requests[0].body.messages[0].content).toContainEqual({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: 'bW9jayBpbWFnZQ==',
      },
    });
    expect(requests[0].body.model).toBe(MODEL_CLAUDE_5_5_HAIKU);
    expect(element('.assistant .message-text').textContent).toBe('An image');
  });

  it('shows provider errors and allows a subsequent retry', async () => {
    await selectHaiku();
    responses.push(
      new Response('{"error":{"type":"authentication_error"}}', {
        status: 401,
        statusText: 'Unauthorized',
      }),
    );
    await send();
    expect(element('.error-message').textContent).toContain('401');
    expect(element<HTMLInputElement>('.chat-input').disabled).toBe(false);
    reply('Recovered');
    await send('Try again');
    expect(container.querySelector('.error-message')).toBeNull();
    expect(element('.assistant .message-text').textContent).toBe('Recovered');
  });
});
