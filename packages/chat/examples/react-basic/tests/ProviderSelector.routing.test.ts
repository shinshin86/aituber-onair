import { catalogFixture } from './catalogFixture';
// @vitest-environment jsdom

import { TextDecoder, TextEncoder } from 'node:util';
import { act, createElement } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  ENDPOINT_MISTRAL_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENROUTER_API,
  MODEL_GPT_OSS_20B_FREE,
  MODEL_MISTRAL_SMALL_LATEST,
  MODEL_MISTRAL_ZAI_GLM_5_3,
  MODEL_XIAOMI_MIMO_V2_6_FLASH,
  MODEL_UNBIASED_PARETO_26_10_PREVIEW,
  MODEL_INCLUSIONAI_LING_3_1_FLASH,
  MODEL_APODEX_1_1_MINI_FREE,
  MODEL_NVIDIA_NEMOTRON_3_5_LIGHTNING,
  MODEL_QWEN_QWEN_3_8_27B,
  MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
} from '../../../src';
import { createSseResponse } from '../../../tests/helpers/sse';
import App from '../src/App';
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
    model: MODEL_UNBIASED_PARETO_26_10_PREVIEW,
    label: 'Pareto 26.10 Preview',
    defaultModel: MODEL_GPT_OSS_20B_FREE,
    defaultLabel: 'GPT OSS 20B (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: MODEL_INCLUSIONAI_LING_3_1_FLASH,
    label: 'Ling 3.1 Flash',
    defaultModel: MODEL_GPT_OSS_20B_FREE,
    defaultLabel: 'GPT OSS 20B (Free)',
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
    defaultModel: MODEL_GPT_OSS_20B_FREE,
    defaultLabel: 'GPT OSS 20B (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: MODEL_QWEN_QWEN_3_8_27B,
    label: 'Qwen3.8 27B',
    defaultModel: MODEL_GPT_OSS_20B_FREE,
    defaultLabel: 'GPT OSS 20B (Free)',
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: true,
  },
  {
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: MODEL_QWEN_QWEN_3_8_OMNI_FLASH,
    label: 'Qwen3.8 Omni Flash',
    defaultModel: MODEL_GPT_OSS_20B_FREE,
    defaultLabel: 'GPT OSS 20B (Free)',
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
    defaultModel: MODEL_GPT_OSS_20B_FREE,
    defaultLabel: 'GPT OSS 20B (Free)',
  },
  {
    provider: 'openrouter',
    model: MODEL_APODEX_1_1_MINI_FREE,
    endpoint: ENDPOINT_OPENROUTER_API,
    vision: false,
    providerLabel: 'OpenRouter',
    label: 'Apodex 1.1 Mini (Free)',
    defaultModel: MODEL_GPT_OSS_20B_FREE,
    defaultLabel: 'GPT OSS 20B (Free)',
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
  it('appends Pareto after the existing OpenRouter choices without changing selection', async () => {
    // The curated list (shown as the unverified fallback) keeps Pareto last.
    // A fetched catalog is listed by model ID, so only its presence is checked.
    const curatedLabels = allModels
      .filter((model) => model.provider === 'openrouter')
      .map((model) => model.name);
    expect(curatedLabels.slice(-2)).toEqual([
      'KAT-Coder-Pro V2.5 (OpenRouter)',
      'Pareto 26.10 Preview',
    ]);

    await renderApp();
    await click(button('OpenRouter', 'provider'));

    const labels = Array.from(
      container.querySelectorAll('.model-item .model-name'),
      (element) => element.textContent?.trim(),
    );
    expect(
      labels.filter((label) => label === 'Pareto 26.10 Preview'),
    ).toHaveLength(1);
    expect(
      button('GPT OSS 20B (Free)', 'model').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      button('Pareto 26.10 Preview', 'model').getAttribute('aria-pressed'),
    ).toBe('false');

    await click(button('Pareto 26.10 Preview', 'model'));
    expect(
      button('Pareto 26.10 Preview', 'model').getAttribute('aria-pressed'),
    ).toBe('true');
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

  it('preserves existing controls for other unsupported-effort models', async () => {
    await renderApp();
    await click(button('OpenRouter', 'provider'));
    await click(button('Ling 3.0 Flash VL (Free)', 'model'));
    expect(
      element<HTMLSelectElement>('#openrouter-reasoning-effort').disabled,
    ).toBe(true);
    expect(
      element<HTMLInputElement>('#openrouter-reasoning-max-tokens'),
    ).toBeDefined();
  });

  it.each(additions.filter((addition) => addition.provider === 'openrouter'))(
    '$label does not inherit an unavailable effort or budget from another model',
    async (addition) => {
      const factorySpy = vi.spyOn(ChatServiceFactory, 'createChatService');
      await renderApp();
      await click(button('OpenRouter', 'provider'));
      await changeInput('#api-key', 'test-ui-key');
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
      if (addition.model === MODEL_UNBIASED_PARETO_26_10_PREVIEW) {
        expect(requestBody().reasoning).toBeUndefined();
      } else {
        expect(requestBody().reasoning).not.toHaveProperty('effort');
        expect(requestBody().reasoning).not.toHaveProperty('max_tokens');
        expect(requestBody().reasoning).not.toHaveProperty('exclude');
      }
    },
  );
});
