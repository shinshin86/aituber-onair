import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { refreshCatalog } from '../src/openrouterCatalog';

vi.mock('@aituber-onair/voice', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    VoiceEngineAdapter: class {
      speakText = vi.fn(async () => {});
      stop = vi.fn();
      updateOptions = vi.fn();
      getOptions = vi.fn(() => ({}));
    },
  };
});
let root: Root;
let container: HTMLDivElement;
const model = 'sample/dynamic-text';
const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
async function change(selector: string, value: string) {
  const control = container.querySelector<HTMLInputElement | HTMLSelectElement>(
    selector,
  )!;
  expect(control).toBeTruthy();
  await act(async () => {
    const isSelect = control instanceof HTMLSelectElement;
    Object.getOwnPropertyDescriptor(
      isSelect ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
      'value',
    )!.set!.call(control, value);
    control.dispatchEvent(
      new Event(isSelect ? 'change' : 'input', { bubbles: true }),
    );
  });
}
async function button(text: string) {
  const button = [...container.querySelectorAll('button')].find(
    (entry) => entry.textContent?.trim() === text,
  )!;
  expect(button, text).toBeTruthy();
  await act(async () => button.click());
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('selects a fetched model in the actual basic DOM and guards real SDK requests across refreshes', async () => {
  localStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('alert', vi.fn());
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  let price = '0';
  let present = true;
  let offline = false;
  const sent: Record<string, unknown>[] = [];
  const metadataRequests: RequestInit[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url === 'https://openrouter.ai/api/v1/models') {
        metadataRequests.push(init);
        if (offline) return new Response('', { status: 503 });
        return new Response(
          JSON.stringify({
            data: present
              ? [
                  {
                    id: model,
                    name: 'Dynamic text model',
                    architecture: {
                      input_modalities: ['text', 'image'],
                      output_modalities: ['text'],
                    },
                    pricing: { prompt: price, completion: price },
                    supported_parameters: [],
                  },
                ]
              : [],
          }),
        );
      }
      if (url === endpoint) {
        sent.push(JSON.parse(String(init.body)));
        return new Response(
          'data: {"choices":[{"delta":{"content":"Mock reply."}}]}\n\ndata: [DONE]\n\n',
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }
      // Local status discovery hooks may run on mount; never delegate to the network.
      throw new Error(`Unexpected network request blocked: ${url}`);
    }),
  );
  for (const name of ['XMLHttpRequest', 'WebSocket', 'EventSource'])
    vi.stubGlobal(
      name,
      vi.fn(() => {
        throw new Error(`${name} blocked`);
      }),
    );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<App />));
  await button('設定');
  await change('#chatProvider', 'openrouter');
  expect(metadataRequests).toHaveLength(1);
  expect(metadataRequests[0].method).toBe('GET');
  expect(new Headers(metadataRequests[0].headers).has('Authorization')).toBe(
    false,
  );
  expect(sent).toHaveLength(0);
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('.openrouter-catalog .model-item')!
      .click(),
  );
  await change('#apiKey', 'mock-only-example-key');
  expect(container.querySelector('#openRouterReasoningEffort')).toBeNull();
  await button('設定を反映');
  expect(
    container.querySelector<HTMLInputElement>('input[type=file]')!.disabled,
  ).toBe(true);
  await change('#user-input', 'Hello');
  await act(async () =>
    container.querySelector<HTMLButtonElement>('#send-btn')!.click(),
  );
  expect(sent).toHaveLength(1);
  expect(sent[0].model).toBe(model);
  expect(sent[0].tools).toBeUndefined();
  expect(sent[0].reasoning).toEqual({ exclude: true });
  price = '0.0001';
  await act(async () => refreshCatalog(true));
  await change('#user-input', 'Blocked after price change');
  await act(async () =>
    container.querySelector<HTMLButtonElement>('#send-btn')!.click(),
  );
  expect(sent).toHaveLength(1);
  expect(vi.mocked(alert).mock.calls.at(-1)?.[0]).toMatch(
    /価格情報が変わりました/,
  );
  await button('設定');
  expect(container.querySelector<HTMLInputElement>('#apiKey')!.value).toBe(
    'mock-only-example-key',
  );
  await button(`${model} の現在の価格を確認して承認`);
  await button('設定を反映');
  await act(async () =>
    container.querySelector<HTMLButtonElement>('#send-btn')!.click(),
  );
  expect(sent).toHaveLength(2);
  offline = true;
  await act(async () => refreshCatalog(true));
  await button('設定');
  expect(container.textContent).toContain('前回取得した情報');
  expect(container.textContent).toContain(model);
  offline = false;
  present = false;
  await act(async () => refreshCatalog(true));
  expect(container.textContent).toContain('カタログにありません');
  await button('キャンセル');
  await change('#user-input', 'Missing model must not send');
  await act(async () =>
    container.querySelector<HTMLButtonElement>('#send-btn')!.click(),
  );
  expect(sent).toHaveLength(2);
  expect(vi.mocked(alert).mock.calls.at(-1)?.[0]).toMatch(/カタログにありません/);
});
