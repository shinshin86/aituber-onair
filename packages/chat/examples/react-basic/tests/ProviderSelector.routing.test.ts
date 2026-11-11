import { catalogFixture } from './catalogFixture';
// @vitest-environment jsdom

import { TextDecoder, TextEncoder } from 'node:util';
import { act, createElement } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MODEL_UNBIASED_PARETO_26_10,
  MODEL_INCLUSIONAI_LING_3_0_FLASH_VL,
  ChatServiceFactory,
  OPENAI_DEPRECATED_MODELS,
  OPENROUTER_DEPRECATED_MODELS,
  DEEPSEEK_DEPRECATED_MODELS,
  MISTRAL_DEPRECATED_MODELS,
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENROUTER_API,
  MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
  MODEL_MISTRAL_SMALL_LATEST,
  MODEL_MISTRAL_ZAI_GLM_5_3,
  MODEL_XIAOMI_MIMO_V2_6_FLASH,
  MODEL_UNBIASED_PARETO_26_9,
  MODEL_INCLUSIONAI_LING_3_1_FLASH,
  MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING,
  MODEL_QWEN_QWEN_3_8_27B,
  MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
  MODEL_KIMI_K2_6,
} from '../../../src';
import { createSseResponse } from '../../../tests/helpers/sse';
import App from '../src/App';
import { refreshCatalog } from '../src/openrouterCatalog/catalog';
import ProviderSelector, {
  allModels,
} from '../src/components/ProviderSelector';

// Resolve the example's package import to the real source, not stale dist.
// Factory, providers, request builders, and stream parsers remain unmocked.
vi.mock('@aituber-onair/chat', () => import('../../../src'));

const additions = [
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: 'xiaomi/mimo-v2.6-pro',
    label: 'MiMo V2.6 Pro',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: 'cohere/command-a-plus',
    label: 'Command A+',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: 'bytedance-seed/seed-2-1-turbo',
    label: 'Seed 2.1 Turbo',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: 'nvidia/nemotron-3.5-super-vl',
    label: 'Nemotron 3.5 Super VL (Paid)',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },

  ...[
    [MODEL_UNBIASED_PARETO_26_10, 'Pareto 26.10'],
    [MODEL_INCLUSIONAI_LING_3_0_FLASH_VL, 'Ling 3.0 Flash VL'],
  ].map(([model, label]) => ({
    provider: 'openrouter' as const,
    providerLabel: 'OpenRouter',
    model,
    label,
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  })),
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: MODEL_UNBIASED_PARETO_26_9,
    label: 'Pareto 26.9',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: MODEL_INCLUSIONAI_LING_3_1_FLASH,
    label: 'Ling 3.1 Flash',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
  },
  {
    provider: 'mistral',
    providerLabel: 'Mistral',
    model: MODEL_MISTRAL_ZAI_GLM_5_3,
    label: 'GLM-5.3 (Mistral)',
    defaultModel: MODEL_MISTRAL_SMALL_LATEST,
    defaultLabel: 'Mistral Small Latest',
    endpoint: ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
    vision: false,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING,
    label: 'Nemotron 3.5 Lightning',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: MODEL_QWEN_QWEN_3_8_27B,
    label: 'Qwen3.8 27B',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
    label: 'Qwen3.8 Omni Flash',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    model: MODEL_XIAOMI_MIMO_V2_6_FLASH,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
    providerLabel: 'OpenRouter',
    label: 'MiMo V2.6 Flash',
    defaultModel: MODEL_GOOGLE_GEMMA_4_31B_IT_FREE,
    defaultLabel: 'Gemma 4 31B IT (Free)',
  },
] as const;

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();
const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView',
);

function element<T extends Element>(selector: string): T {
  const found = container.querySelector<T>(selector);
  expect(found, `Expected rendered element ${selector}`).not.toBeNull();
  return found as T;
}

function button(label: string, kind: 'provider' | 'model'): HTMLButtonElement {
  const found = Array.from(
    container.querySelectorAll<HTMLButtonElement>(`button.${kind}-item`),
  ).find(
    (candidate) =>
      candidate.querySelector(`.${kind}-name`)?.textContent === label,
  );
  expect(found, `Expected rendered ${kind} button ${label}`).toBeDefined();
  return found as HTMLButtonElement;
}

async function click(target: HTMLElement) {
  await act(async () => target.click());
}

async function changeInput(selector: string, value: string) {
  const input = element<HTMLInputElement>(selector);
  await act(async () => {
    // Use the native setter so React sees a real user-originated input event.
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function changeSelect(selector: string, value: string) {
  const select = element<HTMLSelectElement>(selector);
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function renderApp() {
  await act(async () => root.render(createElement(App)));
}

it.each([undefined, 'disabled', 'enabled'] as const)(
  'shows optional K2 thinking as %s with disabled as the fallback',
  async (thinking) => {
    const onThinkingChange = vi.fn();
    await act(async () =>
      root.render(
        createElement(ProviderSelector, {
          provider: 'kimi',
          selectedModel: MODEL_KIMI_K2_6,
          apiKey: '',
          responseLength: 'medium',
          onProviderChange: vi.fn(),
          onModelChange: vi.fn(),
          onApiKeyChange: vi.fn(),
          onResponseLengthChange: vi.fn(),
          kimiThinkingType: thinking,
          onKimiThinkingTypeChange: onThinkingChange,
        }),
      ),
    );
    expect(element<HTMLSelectElement>('#kimi-thinking-type').value).toBe(
      thinking ?? 'disabled',
    );
    await changeSelect('#kimi-thinking-type', 'enabled');
    expect(onThinkingChange).toHaveBeenCalledWith('enabled');
  },
);

async function selectAddition(addition: (typeof additions)[number]) {
  await click(button(addition.providerLabel, 'provider'));
  expect(
    button(addition.defaultLabel, 'model').getAttribute('aria-pressed'),
  ).toBe('true');
  await click(button(addition.label, 'model'));
  await changeInput('#api-key', 'test-ui-key');
}

function expectNoEffortControls() {
  expect(container.querySelector('select[id$="reasoning-effort"]')).toBeNull();
  expect(
    container.querySelector('#openrouter-reasoning-max-tokens'),
  ).toBeNull();
}

async function sendMessage(message = 'Hello from the rendered selector') {
  await changeInput('.chat-input', message);
  await click(element<HTMLButtonElement>('.send-button'));
  expect(container.querySelector('.error-message')).toBeNull();
  expect(element('.message.assistant .message-text').textContent).toBe(
    'Hello from the provider',
  );
}

function requestBody() {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [, options] = fetchMock.mock.calls[0];
  return JSON.parse(options.body);
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('TextDecoder', TextDecoder);
  vi.stubGlobal('TextEncoder', TextEncoder);
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    if (url === 'https://openrouter.ai/api/v1/models') {
      expect(init.method).toBe('GET');
      expect(new Headers(init.headers).has('Authorization')).toBe(false);
      return Promise.resolve(
        new Response(JSON.stringify(catalogFixture), { status: 200 }),
      );
    }
    return fetchMock(url, init);
  });
  fetchMock.mockReset().mockImplementation(async () => ({
    ...createSseResponse([
      'data: {"choices":[{"delta":{"content":"Hello from "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"the provider"},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ]),
    ok: true,
    status: 200,
  }));
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.clear();
  if (scrollIntoViewDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      'scrollIntoView',
      scrollIntoViewDescriptor,
    );
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ProviderSelector rendered configuration for recent models', () => {
  it('keeps stable Pareto last in the offline curated fallback without changing the default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Mock offline')),
    );
    await renderApp();
    await click(button('OpenRouter', 'provider'));
    expect(container.textContent).toContain(
      'Using unverified curated fallback IDs',
    );
    const labels = Array.from(
      container.querySelectorAll('.model-item .model-name'),
      (node) => node.textContent?.trim(),
    );
    expect(
      labels
        .filter(
          (label) =>
            ![
              'GPT Luna Latest',
              'GPT Terra Latest',
              'DeepSeek Flash Latest (OpenRouter)',
              'GLM Flash Latest (OpenRouter)',
              'MiMo V2.6 Pro',
              'Hy4',
              'Command A+',
              'Seed 2.1 Turbo',
              'Nemotron 3.5 Super VL (Paid)',
              'Sakana Namazu (OpenRouter)',
              'Claude Haiku 5.5 (OpenRouter)',
              'DeepSeek V4.1 Flash 1017 (OpenRouter)',
              'Kimi K3.1 Pro (OpenRouter)',
              'MiniMax M3.1 Flash',
              'Pareto 26.10',
              'Ling 3.0 Flash VL',
              'Nex N2.5 Pro',
              'GPT-6.1 Terra (OpenRouter)',
            ].includes(label ?? ''),
        )
        .slice(-2),
    ).toEqual(['Mistral Large 4', 'Pareto 26.9']);
    expect(
      button('Gemma 4 31B IT (Free)', 'model').getAttribute('aria-pressed'),
    ).toBe('true');
    await click(button('Pareto 26.9', 'model'));
    expect(button('Pareto 26.9', 'model').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expectNoEffortControls();
  });

  it('appends Pareto after the existing OpenRouter choices without changing selection', async () => {
    // The curated fallback keeps every old choice in order before the appended model.
    // A fetched catalog is listed by model ID, so only its presence is checked.
    const curatedLabels = allModels
      .filter((model) => model.provider === 'openrouter')
      .map((model) => model.name);
    expect(
      curatedLabels.slice(
        curatedLabels.indexOf('Mistral Large 4'),
        curatedLabels.indexOf('Mistral Large 4') + 2,
      ),
    ).toEqual(['Mistral Large 4', 'Pareto 26.9']);

    await renderApp();
    await click(button('OpenRouter', 'provider'));

    const labels = Array.from(
      container.querySelectorAll('.model-item .model-name'),
      (element) => element.textContent?.trim(),
    );
    expect(labels.filter((label) => label === 'Pareto 26.9')).toHaveLength(1);
    expect(
      button('Gemma 4 31B IT (Free)', 'model').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(button('Pareto 26.9', 'model').getAttribute('aria-pressed')).toBe(
      'false',
    );

    expect(
      button('Mistral Large 4', 'model').getAttribute('aria-pressed'),
    ).toBe('false');

    await click(button('Pareto 26.9', 'model'));
    expect(button('Pareto 26.9', 'model').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it.each(additions)(
    '$label emits actual click and change callbacks without becoming a default',
    async (addition) => {
      const props = {
        provider: addition.provider,
        selectedModel: addition.defaultModel,
        apiKey: '',
        responseLength: 'medium' as const,
        onProviderChange: vi.fn(),
        onModelChange: vi.fn(),
        onApiKeyChange: vi.fn(),
        onResponseLengthChange: vi.fn(),
      };
      await act(async () =>
        root.render(createElement(ProviderSelector, props)),
      );

      const modelButton = button(addition.label, 'model');
      if (addition.provider === 'openrouter') {
        expect(modelButton.textContent).toContain('Zero published price');
        expect(
          button(addition.defaultLabel, 'model').getAttribute('aria-pressed'),
        ).toBe('true');
      } else {
        expect(
          modelButton.querySelector('.model-meta')?.textContent?.trim(),
        ).toBe('');
        expect(button(addition.defaultLabel, 'model').textContent).toContain(
          'Default',
        );
      }
      await click(modelButton);
      expect(props.onModelChange).toHaveBeenCalledTimes(1);
      expect(props.onModelChange).toHaveBeenCalledWith(addition.model);
      await changeInput('#api-key', 'test-ui-key');
      expect(props.onApiKeyChange).toHaveBeenCalledTimes(1);
      expect(props.onApiKeyChange).toHaveBeenCalledWith('test-ui-key');
      await changeSelect('#response-length', 'short');
      expect(props.onResponseLengthChange).toHaveBeenCalledTimes(1);
      expect(props.onResponseLengthChange).toHaveBeenCalledWith('short');
      await click(button('OpenAI', 'provider'));
      expect(props.onProviderChange).toHaveBeenCalledTimes(1);
      expect(props.onProviderChange).toHaveBeenCalledWith('openai');

      await act(async () =>
        root.render(
          createElement(ProviderSelector, {
            ...props,
            selectedModel: addition.model,
          }),
        ),
      );
      expect(button(addition.label, 'model').getAttribute('aria-pressed')).toBe(
        'true',
      );
      expectNoEffortControls();
    },
  );

  it.each(additions)(
    '$label reaches its real provider endpoint through App configuration',
    async (addition) => {
      const factorySpy = vi.spyOn(ChatServiceFactory, 'createChatService');
      await renderApp();
      await selectAddition(addition);
      await changeSelect('#response-length', 'short');

      expect(factorySpy).toHaveBeenLastCalledWith(
        addition.provider,
        expect.objectContaining({
          apiKey: 'test-ui-key',
          model: addition.model,
          responseLength: 'short',
        }),
      );
      expectNoEffortControls();
      expect(element<HTMLInputElement>('#image-upload').disabled).toBe(
        !addition.vision,
      );
      expect(element('label[for="image-upload"]').getAttribute('title')).toBe(
        addition.vision ? 'Add image' : 'Image not supported by model',
      );
      expect(
        container.querySelector('input[type="file"]')?.getAttribute('accept'),
      ).toBe('image/*');

      await sendMessage();
      const body = requestBody();
      expect(fetchMock.mock.calls[0][0]).toBe(addition.endpoint);
      expect(fetchMock.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        headers: { Authorization: 'Bearer test-ui-key' },
      });
      expect(body).toMatchObject({
        model: addition.model,
        stream: true,
        messages: [
          { role: 'user', content: 'Hello from the rendered selector' },
        ],
      });
      expect(body).not.toHaveProperty('reasoning_effort');
      expect(body).not.toHaveProperty('reasoning.effort');
      expect(body).not.toHaveProperty('reasoning.max_tokens');

      await click(button('OpenAI', 'provider'));
      await click(button(addition.providerLabel, 'provider'));
      expect(factorySpy).toHaveBeenLastCalledWith(
        addition.provider,
        expect.objectContaining({
          model:
            addition.provider === 'openrouter'
              ? addition.model
              : addition.defaultModel,
        }),
      );
      expect(
        button(
          addition.provider === 'openrouter'
            ? addition.label
            : addition.defaultLabel,
          'model',
        ).getAttribute('aria-pressed'),
      ).toBe('true');
    },
  );

  it.each(additions.filter((addition) => addition.vision))(
    '$label sends an uploaded image through the same OpenRouter model',
    async (addition) => {
      await renderApp();
      await selectAddition(addition);
      const input = element<HTMLInputElement>('#image-upload');
      const file = new File(['test-image'], 'sample.png', {
        type: 'image/png',
      });
      const nativeRead = FileReader.prototype.readAsDataURL;
      const loaded = new Promise<void>((resolve) => {
        vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(
          function (file) {
            this.addEventListener('loadend', () => resolve(), { once: true });
            nativeRead.call(this, file);
          },
        );
      });
      await act(async () => {
        Object.defineProperty(input, 'files', {
          configurable: true,
          value: [file],
        });
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await loaded;
      });
      expect(
        container.querySelector('.selected-image-preview img'),
      ).not.toBeNull();

      await sendMessage('Describe this image');
      expect(requestBody()).toMatchObject({
        model: addition.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this image' },
              {
                type: 'image_url',
                image_url: { url: 'data:image/png;base64,dGVzdC1pbWFnZQ==' },
              },
            ],
          },
        ],
      });
      expect(fetchMock.mock.calls[0][0]).toBe(ENDPOINT_OPENROUTER_API);
    },
  );

  it.each(additions.filter((addition) => addition.provider === 'openrouter'))(
    '$label does not inherit an unavailable effort or budget from another model',
    async (addition) => {
      const factorySpy = vi.spyOn(ChatServiceFactory, 'createChatService');
      await renderApp();
      await click(button('OpenRouter', 'provider'));
      await changeInput('#api-key', 'test-ui-key');
      // Start from a model that exposes effort and budget controls.
      await click(button('Kimi K2.6 (OpenRouter)', 'model'));
      await changeSelect('#openrouter-reasoning-effort', 'high');
      await changeInput('#openrouter-reasoning-max-tokens', '128');
      await click(element<HTMLInputElement>('#openrouter-include-reasoning'));
      await click(button(addition.label, 'model'));

      expectNoEffortControls();
      const [, options] = factorySpy.mock.calls.at(-1)!;
      expect(options.model).toBe(addition.model);
      expect(options).not.toHaveProperty('reasoningMaxTokens');
      expect(
        element<HTMLInputElement>('#openrouter-include-reasoning').checked,
      ).toBe(true);
      await sendMessage();
      if (
        [MODEL_UNBIASED_PARETO_26_9, MODEL_UNBIASED_PARETO_26_10].includes(
          addition.model,
        )
      ) {
        expect(requestBody().reasoning).toBeUndefined();
      } else {
        expect(requestBody().reasoning).not.toHaveProperty('effort');
        expect(requestBody().reasoning).not.toHaveProperty('max_tokens');
        expect(requestBody().reasoning).not.toHaveProperty('exclude');
      }
    },
  );
});

describe('Retired model choices', () => {
  it.each([
    ['openai', OPENAI_DEPRECATED_MODELS],
    ['openrouter', OPENROUTER_DEPRECATED_MODELS],
    ['gemini', ['gemini-2.5-pro', 'gemini-2.5-flash']],
    ['deepseek', DEEPSEEK_DEPRECATED_MODELS],
    ['mistral', MISTRAL_DEPRECATED_MODELS],
  ] as const)(
    'omits deprecated %s models from curated choices',
    (provider, retired) => {
      const ids = allModels
        .filter((model) => model.provider === provider)
        .map((model) => model.id);
      for (const id of retired) expect(ids).not.toContain(id);
    },
  );

  it('selects current Flash by default for DeepSeek', async () => {
    await renderApp();
    await click(button('DeepSeek', 'provider'));
    expect(
      button('DeepSeek V4.1 Flash 1017', 'model').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(container.textContent).not.toContain('DeepSeek V4 Flash Vision Exp');
  });
});

it('hides retired OpenRouter choices even when a fetched catalog still lists them', async () => {
  const retired = [
    'inception/mercury-2.5',
    'inception/mercury-3',
    'moonshotai/kimi-k2.5',
  ];
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          data: [
            ...catalogFixture.data,
            ...retired.map((id) => ({
              ...catalogFixture.data[0],
              id,
              name: id,
            })),
          ],
        }),
        { status: 200 },
      ),
  );
  await act(async () => {
    await refreshCatalog(true);
  });
  await renderApp();
  await click(button('OpenRouter', 'provider'));
  const ids = Array.from(
    container.querySelectorAll('.model-item .model-id'),
    (node) => node.textContent,
  );
  for (const id of retired) expect(ids).not.toContain(id);
  expect(button('Gemma 4 31B IT (Free)', 'model')).toBeDefined();
});

it.each([
  ['Gemini 4 Argon', 'gemini-4-argon'],
  ['Gemini 4 Carbon', 'gemini-4-carbon'],
])(
  'configures direct %s with low thinking and sends a streamed request',
  async (label, modelId) => {
    fetchMock.mockResolvedValue({
      ...createSseResponse([
        'data: {"candidates":[{"content":{"parts":[{"text":"Hello from the provider"}]}}]}\n\n',
      ]),
      ok: true,
      status: 200,
    });
    await renderApp();
    await click(button('Gemini', 'provider'));
    expect(
      button('Gemini 3.1 Flash-Lite', 'model').getAttribute('aria-pressed'),
    ).toBe('true');
    await click(button(label, 'model'));
    await changeInput('#api-key', 'test-ui-key');
    const effort = element<HTMLSelectElement>('#gemini-reasoning-effort');
    expect(Array.from(effort.options, (option) => option.value)).toEqual([
      'low',
      'medium',
      'high',
    ]);
    expect(effort.value).toBe('low');
    expect(element<HTMLInputElement>('#image-upload').disabled).toBe(false);
    await sendMessage();
    expect(fetchMock.mock.calls[0][0]).toContain(
      `/v1beta/models/${modelId}:streamGenerateContent?alt=sse&`,
    );
    expect(requestBody().generationConfig).toEqual({
      maxOutputTokens: 32768,
      thinkingConfig: { includeThoughts: false, thinkingLevel: 'LOW' },
    });
  },
);

it('offers Mistral GLM Flash image input and only its supported reasoning efforts', async () => {
  await renderApp();
  await click(button('Mistral', 'provider'));
  expect(
    button('Mistral Small Latest', 'model').getAttribute('aria-pressed'),
  ).toBe('true');
  await click(button('GLM-5.3 Flash (Mistral)', 'model'));
  await changeInput('#api-key', 'test-ui-key');
  const select = element<HTMLSelectElement>('#mistral-reasoning-effort');
  expect(Array.from(select.options, (option) => option.value)).toEqual([
    'low',
    'high',
    'max',
  ]);
  expect(select.value).toBe('low');
  expect(element<HTMLInputElement>('#image-upload').disabled).toBe(false);
  for (const effort of ['low', 'high', 'max']) {
    fetchMock.mockClear();
    await changeSelect('#mistral-reasoning-effort', effort);
    await sendMessage();
    expect(fetchMock.mock.calls[0][0]).toBe(
      ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
    );
    expect(requestBody()).toMatchObject({
      model: 'zai-glm-5-3-flash',
      reasoning_effort: effort,
      stream: true,
    });
  }
  await click(button('GLM-5.3 (Mistral)', 'model'));
  expect(container.querySelector('#mistral-reasoning-effort')).toBeNull();
  expect(element<HTMLInputElement>('#image-upload').disabled).toBe(true);
});

it('keeps reasoning visibility available without inventing catalog effort levels', async () => {
  const entries = [
    ['xiaomi/mimo-v2.6-pro', 'MiMo V2.6 Pro'],
    ['cohere/command-a-plus', 'Command A+'],
    ['bytedance-seed/seed-2-1-turbo', 'Seed 2.1 Turbo'],
    ['nvidia/nemotron-3.5-super-vl', 'Nemotron 3.5 Super VL (Paid)'],
  ];
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    if (url === 'https://openrouter.ai/api/v1/models') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [
              ...catalogFixture.data.filter(
                (row) => !entries.some(([id]) => id === row.id),
              ),
              ...entries.map(([id, name]) => ({
                ...catalogFixture.data[0],
                id,
                name,
                supported_parameters: [
                  'reasoning',
                  'include_reasoning',
                  'tools',
                  'tool_choice',
                  'max_tokens',
                ],
                reasoning: { mandatory: false },
              })),
            ],
          }),
          { status: 200 },
        ),
      );
    }
    return fetchMock(url, init);
  });
  await act(async () => {
    await refreshCatalog(true);
  });
  await renderApp();
  await click(button('OpenRouter', 'provider'));
  await changeInput('#api-key', 'test-ui-key');
  for (const [model, label] of entries) {
    await click(button(label, 'model'));
    expectNoEffortControls();
    const visibility = element<HTMLInputElement>(
      '#openrouter-include-reasoning',
    );
    expect(visibility.disabled).toBe(false);
    if (!visibility.checked) await click(visibility);
    fetchMock.mockClear();
    await sendMessage();
    expect(requestBody().model).toBe(model);
    expect(requestBody().reasoning?.effort).toBeUndefined();
    expect(requestBody().reasoning?.max_tokens).toBeUndefined();
    expect(requestBody().reasoning?.exclude).toBeUndefined();
  }
});
