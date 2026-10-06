// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import { ChatServiceFactory } from '@aituber-onair/chat';
import { getVisionSupportLevel } from '../src/components/ProviderSelector';

it('selects new catalog IDs through App, keeps them across refreshes and guards actual requests', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  const id = 'unregistered/openai/gpt-4o-lookalike';
  const row = (price = '0') => ({
    id,
    name: 'New catalog model',
    architecture: {
      input_modalities: ['text', 'image'],
      output_modalities: ['text'],
    },
    pricing: { prompt: price, completion: price },
    supported_parameters: ['reasoning', 'tools'],
  });
  let data = [row()];
  let fail = false;
  const posts: Record<string, unknown>[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (url === 'https://openrouter.ai/api/v1/models') {
      expect(init.method).toBe('GET');
      expect(new Headers(init.headers).has('Authorization')).toBe(false);
      if (fail) throw new Error('Mock offline');
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer mock-only-key',
    );
    posts.push(JSON.parse(init.body as string));
    return new Response(
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  const scroll = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollIntoView',
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const clickText = async (text: string) => {
    const button = [...container.querySelectorAll('button')].find((node) =>
      node.textContent?.includes(text),
    );
    if (!button) throw new Error(`Missing button: ${text}`);
    await act(async () => button.click());
  };
  const change = async (selector: string, value: string) => {
    const input = container.querySelector<HTMLInputElement>(selector);
    if (!input) throw new Error(`Missing input: ${selector}`);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const send = async () => {
    await change('.chat-input', 'Test dynamic selection');
    await act(async () =>
      container.querySelector<HTMLButtonElement>('.send-button')?.click(),
    );
  };
  try {
    await act(async () => root.render(<App />));
    expect(fetchMock).not.toHaveBeenCalled();
    await clickText('OpenRouter');
    expect(posts).toHaveLength(0);
    expect(container.textContent).toContain('Missing from catalog');
    expect(container.textContent).not.toContain('GPT OSS 20B (Free)');
    await clickText('New catalog model');
    await change('#api-key', 'mock-only-key');
    // Catalog image metadata plus a substring SDK match must not enable vision.
    expect(ChatServiceFactory.getSupportedModels('openrouter')).not.toContain(
      id,
    );
    expect(
      ChatServiceFactory.getVisionSupportLevelForModel('openrouter', id),
    ).toBe('supported');
    expect(getVisionSupportLevel('openrouter', id)).toBe('unsupported');

    expect(
      container.querySelector<HTMLInputElement>('#image-upload')?.disabled,
    ).toBe(true);
    expect(container.querySelector('#openrouter-reasoning-effort')).toBeNull();
    expect(
      container.querySelector('#openrouter-reasoning-max-tokens'),
    ).toBeNull();
    await send();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ model: id, stream: true });
    expect(posts[0]).not.toHaveProperty('tools');
    expect(posts[0]).not.toHaveProperty('reasoning.effort');
    expect(posts[0]).not.toHaveProperty('reasoning.max_tokens');
    expect(posts[0]).toHaveProperty('reasoning.exclude', true);

    data = [row('0.000001')];
    await clickText('Refresh catalog');
    expect(container.textContent).toContain('Pricing metadata changed');
    expect(container.textContent).toContain(`Selected: ${id}`);
    await send();
    expect(posts).toHaveLength(1);
    await clickText('Acknowledge current pricing');
    await send();
    expect(posts).toHaveLength(2);

    fail = true;
    await clickText('Refresh catalog');
    expect(container.textContent).toContain('stale last-good metadata');
    expect(container.textContent).toContain(`Selected: ${id}`);
    fail = false;
    data = [];
    await clickText('Refresh catalog');
    expect(container.textContent).toContain('Missing from catalog');
    await send();
    expect(posts).toHaveLength(2);
    // Provider navigation must not silently replace an unavailable saved choice.
    await clickText('OpenAI');
    await clickText('OpenRouter');
    expect(container.textContent).toContain(`Selected: ${id}`);
    expect(container.textContent).toContain('Missing from catalog');
    await send();
    expect(posts).toHaveLength(2);
    // Even an ID that matches a direct-provider model must stay on OpenRouter.
    data = [{ ...row(), id: 'gpt-4o-mini', name: 'Catalog route collision' }];
    await clickText('Refresh catalog');
    await clickText('Catalog route collision');
    await send();
    expect(posts).toHaveLength(3);
    expect(posts[2]).toHaveProperty('model', 'gpt-4o-mini');
    expect(container.querySelector('#api-key')?.getAttribute('type')).toBe(
      'password',
    );
    expect(
      (container.querySelector('#api-key') as HTMLInputElement).value,
    ).toBe('mock-only-key');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    if (scroll)
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scroll);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    vi.unstubAllGlobals();
    localStorage.clear();
  }
});
