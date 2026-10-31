// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import {
  allModels,
  getDefaultModelForProvider,
} from '../src/components/ProviderSelector';
import { catalogFixture } from './catalogFixture';

it('shows backend-only providers disabled and never sends Sarashina credentials from the browser', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const calls: string[] = [];
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url);
      if (url === 'https://openrouter.ai/api/v1/models')
        return new Response(JSON.stringify(catalogFixture));
      throw new Error(`Unexpected request blocked: ${url}`);
    }),
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  document.body.append(container);
  try {
    await act(async () => root.render(<App />));
    const providers = [
      ...container.querySelectorAll<HTMLButtonElement>('.provider-item'),
    ];
    for (const name of ['Sakana AI', 'Sarashina']) {
      const button = providers.find(
        (item) => item.querySelector('.provider-name')?.textContent === name,
      )!;
      expect(button, name).toBeDefined();
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');
      if (name === 'Sarashina')
        expect(button.title).toContain('protected backend');
      await act(async () => button.click());
      expect(button.getAttribute('aria-pressed')).toBe('false');
    }
    expect(
      providers
        .find(
          (item) =>
            item.querySelector('.provider-name')?.textContent === 'OpenAI',
        )
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(getDefaultModelForProvider('sarashina')).toBe('sarashina3-nano');
    expect(
      allModels
        .filter((model) => model.provider === 'sarashina')
        .map((model) => model.id),
    ).toEqual([
      'sarashina3-nano',
      'sarashina3-mini',
      'sarashina3.2-mini-thinking',
    ]);
    expect(
      calls.filter((url) => url !== 'https://openrouter.ai/api/v1/models'),
    ).toEqual([]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    vi.unstubAllGlobals();
  }
});
