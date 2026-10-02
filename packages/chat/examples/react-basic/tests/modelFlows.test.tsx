// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

const OPENAI_RESPONSES = 'https://api.openai.com/v1/responses';
const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
const ZAI = 'https://api.z.ai/api/paas/v4/chat/completions';
const FAKE_KEY = 'mock-only-not-a-provider-key';
const mandatoryEfforts = ['low', 'medium', 'high', 'xhigh', 'max'];

const modelCases = [
  {
    provider: 'OpenAI',
    label: 'GPT-6.1 Sol',
    model: 'gpt-6.1-sol',
    endpoint: OPENAI_RESPONSES,
    control: '#reasoning-effort',
    efforts: mandatoryEfforts,
    initialEffort: 'low',
  },
  {
    provider: 'Z.ai',
    label: 'GLM-5.3 FlashX',
    model: 'glm-5.3-flashx',
    endpoint: ZAI,
    control: '#zai-reasoning-effort',
    efforts: ['low', 'high', 'max'],
    initialEffort: 'low',
  },
  ...[
    ['GPT-6.1 Sol', 'openai/gpt-6.1-sol', mandatoryEfforts, 'low'],
    ['GPT-6 Sol', 'openai/gpt-6-sol', ['none', ...mandatoryEfforts], 'none'],
    ['GPT-6 Luna', 'openai/gpt-6-luna', ['none', ...mandatoryEfforts], 'none'],
    [
      'Claude Sonnet 5.5',
      'anthropic/claude-sonnet-5.5',
      mandatoryEfforts,
      'low',
    ],
    ['Claude Opus 5.5', 'anthropic/claude-opus-5.5', mandatoryEfforts, 'low'],
    ['Grok 4.7', 'x-ai/grok-4.7', ['low', 'medium', 'high', 'xhigh'], 'low'],
    [
      'GLM-5.3 FlashX (OpenRouter)',
      'z-ai/glm-5.3-flashx',
      ['low', 'high', 'max'],
      'low',
    ],
    [
      'Solar Mini4',
      'upstage/solar-mini4',
      ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
      'none',
    ],
  ].map(([label, model, efforts, initialEffort]) => ({
    provider: 'OpenRouter',
    label: label as string,
    model: model as string,
    endpoint: OPENROUTER,
    control: '#openrouter-reasoning-effort',
    efforts: efforts as string[],
    initialEffort: initialEffort as string,
  })),
];

type ModelCase = (typeof modelCases)[number];
type PendingRequest = {
  endpoint: string;
  response: Response | Error;
};
let container: HTMLDivElement;
let root: Root;
let pending: PendingRequest[];
let requests: { url: string; body: any; headers: Headers }[];
let unexpectedRequests: string[];

function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = container.querySelector<T>(selector);
  expect(found, `Rendered control ${selector}`).not.toBeNull();
  return found!;
}

async function change(selector: string, value: string) {
  const control = element<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(selector);
  expect(control.disabled).toBe(false);
  const prototype =
    control instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(
      control,
      value,
    );
    control.dispatchEvent(
      new Event(control instanceof HTMLSelectElement ? 'change' : 'input', {
        bubbles: true,
      }),
    );
  });
}

async function click(selector: string) {
  await act(async () => element<HTMLButtonElement>(selector).click());
}

async function chooseButton(selector: string, label: string) {
  const found = [
    ...container.querySelectorAll<HTMLButtonElement>(selector),
  ].find(
    (button) =>
      button.querySelector('.provider-name, .model-name')?.textContent ===
      label,
  );
  expect(found, `Selectable ${label}`).toBeDefined();
  expect(found!.disabled).toBe(false);
  await act(async () => found!.click());
  expect(found!.getAttribute('aria-pressed')).toBe('true');
}

async function selectModel(model: ModelCase) {
  await chooseButton('.provider-item', model.provider);
  await chooseButton('.model-item', model.label);
}

function streamResponse(endpoint: string) {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(value) {
      controller = value;
    },
  });
  pending.push({
    endpoint,
    response: new Response(body, {
      headers: { 'Content-Type': 'text/event-stream' },
    }),
  });
  return {
    async text(text: string) {
      const chunk =
        endpoint === OPENAI_RESPONSES
          ? `event: response.output_text.delta\ndata: ${JSON.stringify({ delta: text })}\n\n`
          : `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
      const bytes = new TextEncoder().encode(chunk);
      // Transport chunks can split event names, JSON, and UTF-8 code points.
      for (let offset = 0; offset < bytes.length; offset += 7) {
        await act(async () =>
          controller!.enqueue(bytes.slice(offset, offset + 7)),
        );
      }
    },
    async finish() {
      await act(async () => {
        const chunk =
          endpoint === OPENAI_RESPONSES
            ? 'event: response.completed\ndata: {"response":{"status":"completed"}}\n\n'
            : 'data: [DONE]\n\n';
        controller!.enqueue(new TextEncoder().encode(chunk));
        controller!.close();
      });
    },
  };
}

async function send(content: string) {
  await change('.chat-input', content);
  await click('.send-button');
}

async function completeReply(
  endpoint: string,
  prompt = 'Hello',
  reply = 'Mock reply',
) {
  const stream = streamResponse(endpoint);
  await send(prompt);
  await stream.text(reply);
  await stream.finish();
}

beforeEach(async () => {
  pending = [];
  requests = [];
  unexpectedRequests = [];
  localStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // Fail closed: these tests never delegate to native fetch or another network API.
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const next = pending.shift();
      if (!next || next.endpoint !== url) {
        unexpectedRequests.push(String(url));
        throw new Error(`Unexpected network request blocked: ${url}`);
      }
      expect(init.method).toBe('POST');
      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe(`Bearer ${FAKE_KEY}`);
      expect(headers.get('Content-Type')).toBe('application/json');
      requests.push({ url, headers, body: JSON.parse(init.body as string) });
      if (next.response instanceof Error) throw next.response;
      return next.response;
    }),
  );
  for (const name of ['XMLHttpRequest', 'WebSocket', 'EventSource']) {
    vi.stubGlobal(
      name,
      vi.fn(() => {
        unexpectedRequests.push(name);
        throw new Error(`Unexpected ${name} blocked`);
      }),
    );
  }
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
  expect(unexpectedRequests).toEqual([]);
  expect(pending).toEqual([]);
});

describe('React sample model-to-transport flows (mock network only)', () => {
  it.each(modelCases)(
    '$provider / $label selects settings, streams and repeats',
    async (model) => {
      await selectModel(model);
      const effort = element<HTMLSelectElement>(model.control);
      expect([...effort.options].map((option) => option.value)).toEqual(
        model.efforts,
      );
      expect(effort.value).toBe(model.initialEffort);
      expect(element<HTMLInputElement>('.chat-input').disabled).toBe(true);
      await change('#api-key', FAKE_KEY);
      expect(element<HTMLInputElement>('#image-upload').disabled).toBe(
        model.model === 'upstage/solar-mini4',
      );
      await change(model.control, 'high');
      await change('#response-length', 'long');
      const stream = streamResponse(model.endpoint);
      await send('First prompt');
      expect(requests).toHaveLength(1);
      expect(requests[0].body).toMatchObject({
        model: model.model,
        stream: true,
      });
      if (
        model.endpoint === OPENAI_RESPONSES ||
        model.endpoint === OPENROUTER
      ) {
        expect(requests[0].body.reasoning.effort).toBe('high');
      } else {
        expect(requests[0].body.reasoning_effort).toBe('high');
        expect(requests[0].body.thinking.type).toBe('enabled');
      }
      expect(element<HTMLInputElement>('.chat-input').disabled).toBe(true);
      expect(element<HTMLButtonElement>('.send-button').textContent).toBe(
        'Sending...',
      );
      expect(
        [
          ...container.querySelectorAll<HTMLButtonElement>(
            '.provider-item, .model-item',
          ),
        ].every((button) => button.disabled),
      ).toBe(true);
      await click('.send-button');
      expect(requests).toHaveLength(1);
      await stream.text('こんにちは ');
      expect(element('.assistant .message-text').textContent).toBe(
        'こんにちは ',
      );
      expect(container.querySelector('.streaming-indicator')).not.toBeNull();
      await stream.text('world');
      await stream.finish();
      expect(element('.assistant .message-text').textContent).toBe(
        'こんにちは world',
      );
      expect(container.querySelector('.streaming-indicator')).toBeNull();
      expect(element<HTMLInputElement>('.chat-input').disabled).toBe(false);
      expect(container.querySelector('.error-message')).toBeNull();
      await completeReply(model.endpoint, 'Second prompt', 'Second reply');
      const history = requests[1].body.input ?? requests[1].body.messages;
      expect(history).toEqual([
        { role: 'user', content: 'First prompt' },
        { role: 'assistant', content: 'こんにちは world' },
        { role: 'user', content: 'Second prompt' },
      ]);
      expect(container.querySelectorAll('.message.assistant')).toHaveLength(2);
      await click('.clear-button');
      expect(container.querySelectorAll('.message')).toHaveLength(0);
      expect(element('.empty-state').textContent).toContain('No messages yet');
    },
  );
  it.each(modelCases)(
    '$provider / $label sends every offered reasoning effort',
    async (model) => {
      await selectModel(model);
      await change('#api-key', FAKE_KEY);
      await completeReply(model.endpoint);
      const first = requests[0].body;
      expect(first.reasoning?.effort ?? first.reasoning_effort).toBe(
        model.initialEffort,
      );
      for (const effort of model.efforts) {
        await change(model.control, effort);
        await completeReply(model.endpoint, `Use ${effort}`);
        const body = requests[requests.length - 1].body;
        expect(body.reasoning?.effort ?? body.reasoning_effort).toBe(effort);
      }
    },
  );

  it.each(modelCases)(
    '$provider / $label recovers after HTTP rejection without phantom assistant history',
    async (model) => {
      await selectModel(model);
      await change('#api-key', FAKE_KEY);
      pending.push({
        endpoint: model.endpoint,
        response: new Response('{"error":{"message":"mock rejection"}}', {
          status: 401,
          statusText: 'Unauthorized',
        }),
      });
      await send('Rejected prompt');
      expect(element('.error-message').textContent).toContain('401');
      expect(container.querySelectorAll('.message.assistant')).toHaveLength(0);
      expect(container.querySelector('.streaming-indicator')).toBeNull();
      expect(element<HTMLInputElement>('.chat-input').disabled).toBe(false);
      await completeReply(model.endpoint, 'Retry prompt', 'Recovered');
      expect(container.querySelector('.error-message')).toBeNull();
      expect(element('.assistant .message-text').textContent).toBe('Recovered');
      const history = requests[1].body.input ?? requests[1].body.messages;
      expect(history).toEqual([
        { role: 'user', content: 'Rejected prompt' },
        { role: 'user', content: 'Retry prompt' },
      ]);
    },
  );

  it('Ling 3.1 Flash streams repeated replies and recovers from HTTP errors without unsupported settings', async () => {
    await chooseButton('.provider-item', 'OpenRouter');
    await chooseButton('.model-item', 'Ling 3.1 Flash');
    await change('#api-key', FAKE_KEY);
    expect(container.querySelector('#openrouter-reasoning-effort')).toBeNull();
    expect(
      container.querySelector('#openrouter-reasoning-max-tokens'),
    ).toBeNull();
    expect(element<HTMLInputElement>('#image-upload').disabled).toBe(true);
    pending.push({
      endpoint: OPENROUTER,
      response: new Response('{"error":{"message":"Mock rate limit"}}', {
        status: 429,
        statusText: 'Too Many Requests',
      }),
    });
    await send('Rejected prompt');
    expect(element('.error-message').textContent).toContain('429');
    expect(container.querySelectorAll('.message.assistant')).toHaveLength(0);
    expect(element<HTMLInputElement>('.chat-input').disabled).toBe(false);

    const stream = streamResponse(OPENROUTER);
    await send('Retry prompt');
    await stream.text('こんにちは ');
    expect(element('.assistant .message-text').textContent).toBe('こんにちは ');
    expect(container.querySelector('.streaming-indicator')).not.toBeNull();
    await stream.text('world');
    await stream.finish();
    expect(container.querySelector('.error-message')).toBeNull();
    expect(element('.assistant .message-text').textContent).toBe(
      'こんにちは world',
    );
    await completeReply(OPENROUTER, 'Again', 'Second reply');
    expect(requests).toHaveLength(3);
    for (const { url, body } of requests) {
      expect(url).toBe(OPENROUTER);
      expect(body.model).toBe('inclusionai/ling-3.1-flash');
      expect(body.stream).toBe(true);
      expect(body.reasoning).toEqual({ exclude: true });
      expect(body.reasoning_effort).toBeUndefined();
    }
    expect(requests[2].body.messages).toEqual([
      { role: 'user', content: 'Rejected prompt' },
      { role: 'user', content: 'Retry prompt' },
      { role: 'assistant', content: 'こんにちは world' },
      { role: 'user', content: 'Again' },
    ]);
    expect(container.querySelectorAll('.message.assistant')).toHaveLength(2);
  });

  it('keeps Solar effort selectable without inheriting a reasoning budget', async () => {
    await selectModel(modelCases[2]);
    await change('#api-key', FAKE_KEY);
    await change('#openrouter-reasoning-max-tokens', '1024');
    await chooseButton('.model-item', 'Solar Mini4');
    expect(
      container.querySelector('#openrouter-reasoning-max-tokens'),
    ).toBeNull();
    await change('#openrouter-reasoning-effort', 'minimal');
    await completeReply(OPENROUTER);
    expect(requests[0].body.reasoning).toEqual({
      effort: 'minimal',
      exclude: true,
    });
    expect(element<HTMLInputElement>('#image-upload').disabled).toBe(true);
  });

  it('enables summary for the displayed default Responses endpoint and switches to Chat Completions', async () => {
    await selectModel(modelCases[0]);
    await change('#api-key', FAKE_KEY);
    expect(element<HTMLSelectElement>('#gpt5-endpoint').value).toBe(
      'responses',
    );
    expect(element<HTMLInputElement>('#reasoning-summary').disabled).toBe(
      false,
    );
    await change('#gpt5-endpoint', 'auto');
    expect(element<HTMLInputElement>('#reasoning-summary').disabled).toBe(
      false,
    );
    await click('#reasoning-summary');
    await change('#verbosity', 'high');
    await completeReply(OPENAI_RESPONSES);
    expect(requests[0].body.reasoning.summary).toBe('auto');
    expect(requests[0].body.text.verbosity).toBe('high');
    await change('#gpt5-endpoint', 'chat');
    expect(element<HTMLInputElement>('#reasoning-summary').disabled).toBe(true);
    await change('#reasoning-effort', 'max');
    await completeReply(OPENAI_CHAT);
    expect(requests[1].body.reasoning_effort).toBe('max');
    expect(requests[1].body.reasoning).toBeUndefined();
    expect(requests[1].body.messages).toBeDefined();
  });

  it('normalizes unsupported effort when switching models and keeps provider payloads separate', async () => {
    await selectModel(modelCases[3]);
    await change('#api-key', FAKE_KEY);
    await change('#openrouter-reasoning-effort', 'max');
    await chooseButton('.model-item', 'Grok 4.7');
    expect(
      element<HTMLSelectElement>('#openrouter-reasoning-effort').value,
    ).toBe('low');
    await change('#openrouter-app-name', 'Mock sample');
    await change('#openrouter-app-url', 'https://example.com');
    await click('#openrouter-include-reasoning');
    await change('#openrouter-reasoning-max-tokens', '1024');
    await completeReply(OPENROUTER);
    expect(requests[0].body).toMatchObject({
      model: 'x-ai/grok-4.7',
      reasoning: { effort: 'low', max_tokens: 1024 },
    });
    expect(requests[0].body.reasoning.exclude).toBeUndefined();
    expect(requests[0].headers.get('X-Title')).toBe('Mock sample');
    expect(requests[0].headers.get('HTTP-Referer')).toBe('https://example.com');
    await selectModel(modelCases[0]);
    await completeReply(OPENAI_RESPONSES);
    expect(requests[1].body.model).toBe('gpt-6.1-sol');
    expect(requests[1].body.reasoning.max_tokens).toBeUndefined();
    expect(requests[1].headers.get('HTTP-Referer')).toBeNull();
    await selectModel(modelCases[1]);
    await change('#zai-response-format', 'json_object');
    await click('#zai-clear-thinking');
    await completeReply(ZAI);
    expect(requests[2].body).toMatchObject({
      model: 'glm-5.3-flashx',
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
      thinking: { type: 'enabled', clear_thinking: false },
    });
    expect(requests[2].body.reasoning).toBeUndefined();
  });

  it('rejects invalid JSON schema before sending and recovers when corrected', async () => {
    await selectModel(modelCases[1]);
    await change('#api-key', FAKE_KEY);
    await change('#zai-response-format', 'json_schema');
    expect(element('.error-message').textContent).toContain(
      'schema is required',
    );
    expect(element<HTMLInputElement>('.chat-input').disabled).toBe(true);
    await change('#zai-response-schema', '{invalid');
    expect(element('.error-message').textContent).toContain(
      'Invalid JSON schema',
    );
    expect(requests).toEqual([]);
    const schema = {
      name: 'answer',
      schema: { type: 'object', properties: { answer: { type: 'string' } } },
    };
    await change('#zai-response-schema', JSON.stringify(schema));
    expect(container.querySelector('.error-message')).toBeNull();
    await completeReply(ZAI);
    expect(requests[0].body.response_format).toEqual({
      type: 'json_schema',
      json_schema: schema,
    });
  });

  it.each([modelCases[0], modelCases[1], modelCases[2]])(
    '$provider recovers from fetch rejection and HTTP rate limits',
    async (model) => {
      await selectModel(model);
      await change('#api-key', FAKE_KEY);
      pending.push({
        endpoint: model.endpoint,
        response: new TypeError('Mock network failure'),
      });
      await send('Disconnected');
      expect(element('.error-message').textContent).toContain(
        'Mock network failure',
      );
      pending.push({
        endpoint: model.endpoint,
        response: new Response('{}', {
          status: 429,
          statusText: 'Too Many Requests',
        }),
      });
      await send('Limited');
      expect(element('.error-message').textContent).toContain('429');
      expect(requests).toHaveLength(2);
      await completeReply(model.endpoint, 'Recovered');
      expect(container.querySelector('.error-message')).toBeNull();
      expect(container.querySelectorAll('.message.assistant')).toHaveLength(1);
    },
  );

  it('keeps Clear effective while a stream is pending and starts a clean next conversation', async () => {
    await selectModel(modelCases[2]);
    await change('#api-key', FAKE_KEY);
    const stream = streamResponse(OPENROUTER);
    await send('Clear me');
    await stream.text('Partial');
    await click('.clear-button');
    await stream.text(' late response');
    await stream.finish();
    expect(container.querySelectorAll('.message')).toHaveLength(0);
    await completeReply(OPENROUTER, 'Fresh start');
    expect(requests[1].body.messages).toEqual([
      { role: 'user', content: 'Fresh start' },
    ]);
  });

  it.each(modelCases)(
    '$provider / $label surfaces provider errors inside an HTTP-success stream',
    async (model) => {
      await selectModel(model);
      await change('#api-key', FAKE_KEY);
      const failure =
        model.endpoint === OPENAI_RESPONSES
          ? 'event: response.failed\ndata: {"response":{"status":"failed","error":{"message":"Mock streaming rejection"}}}\n\n'
          : 'data: {"error":{"code":429,"message":"Mock streaming rejection"},"choices":[{"finish_reason":"error"}]}\n\ndata: [DONE]\n\n';
      pending.push({
        endpoint: model.endpoint,
        response: new Response(failure, {
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      });
      await send('Fail during streaming');
      expect(element('.error-message').textContent).toContain(
        'Mock streaming rejection',
      );
      expect(container.querySelectorAll('.message.assistant')).toHaveLength(0);
      await completeReply(model.endpoint);
      expect(container.querySelector('.error-message')).toBeNull();
    },
  );

  it('keeps repeated messages distinct even when the clock has not advanced', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    await selectModel(modelCases[2]);
    await change('#api-key', FAKE_KEY);
    await completeReply(OPENROUTER, 'First', 'First reply');
    await completeReply(OPENROUTER, 'Second', 'Second reply');
    expect(
      [...container.querySelectorAll('.assistant .message-text')].map(
        (node) => node.textContent,
      ),
    ).toEqual(['First reply', 'Second reply']);
  });

  it.each(modelCases.filter((model) => model.model !== 'upstage/solar-mini4'))(
    '$provider / $label sends the selected image through its vision path',
    async (model) => {
      await selectModel(model);
      await change('#api-key', FAKE_KEY);
      const file = new File(['mock image bytes'], 'sample.png', {
        type: 'image/png',
      });
      let loaded!: () => void;
      const readComplete = new Promise<void>((resolve) => {
        loaded = resolve;
      });
      const originalRead = FileReader.prototype.readAsDataURL;
      vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(
        function (blob) {
          this.addEventListener('loadend', loaded, { once: true });
          originalRead.call(this, blob);
        },
      );
      await act(async () => {
        const upload = element<HTMLInputElement>('#image-upload');
        Object.defineProperty(upload, 'files', {
          configurable: true,
          value: [file],
        });
        upload.dispatchEvent(new Event('change', { bubbles: true }));
        await readComplete;
      });
      expect(container.querySelector('.selected-image-preview')).not.toBeNull();
      await completeReply(model.endpoint, 'Describe image');
      const request = requests[0].body;
      const message = (request.input ?? request.messages)[0];
      const image = `data:image/png;base64,${btoa('mock image bytes')}`;
      expect(message.content).toEqual(
        model.endpoint === OPENAI_RESPONSES
          ? [
              { type: 'input_text', text: 'Describe image' },
              { type: 'input_image', image_url: image },
            ]
          : [
              { type: 'text', text: 'Describe image' },
              { type: 'image_url', image_url: { url: image, detail: 'auto' } },
            ],
      );
      expect(container.querySelector('.selected-image-preview')).toBeNull();
      expect(element<HTMLImageElement>('.message-image').src).toBe(image);
    },
  );

  it('surfaces in-stream errors after selecting native Chat Completions', async () => {
    await selectModel(modelCases[0]);
    await change('#api-key', FAKE_KEY);
    await change('#gpt5-endpoint', 'chat');
    pending.push({
      endpoint: OPENAI_CHAT,
      response: new Response(
        'data: {"error":{"message":"Mock chat failure"}}\n\n',
      ),
    });
    await send('Fail');
    expect(element('.error-message').textContent).toContain(
      'Mock chat failure',
    );
    await completeReply(OPENAI_CHAT);
    expect(container.querySelector('.error-message')).toBeNull();
  });
  it('tracks forced Responses routing for earlier Sol/Luna reasoning and presets', async () => {
    await change('#api-key', FAKE_KEY);
    for (const label of ['GPT-6 Sol', 'GPT-6 Luna']) {
      await chooseButton('.model-item', label);
      await change('#gpt5-endpoint', 'chat');
      await change('#reasoning-effort', 'high');
      expect(element<HTMLInputElement>('#reasoning-summary').disabled).toBe(
        false,
      );
      await completeReply(OPENAI_RESPONSES);
      await change('#gpt5-preset', 'casual');
      expect(element<HTMLInputElement>('#reasoning-summary').disabled).toBe(
        true,
      );
      await completeReply(OPENAI_CHAT);
      await change('#gpt5-preset', '');
    }
  });
});
