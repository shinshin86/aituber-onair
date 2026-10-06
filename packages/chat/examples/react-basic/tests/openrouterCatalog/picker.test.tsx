// @vitest-environment jsdom
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

type Catalog = typeof import('../../src/openrouterCatalog');
let React: typeof import('react');
let catalog: Catalog;
let root: Root;
let container: HTMLDivElement;
const row = (id: string, price: unknown = '0') => ({
  id,
  name: `Name for ${id}`,
  architecture: {
    input_modalities: ['text'],
    output_modalities: ['text'],
  },
  pricing: { prompt: price, completion: price },
  supported_parameters: [],
});
const button = (text: string) => {
  const found = [...container.querySelectorAll('button')].find(
    (element) => element.textContent?.trim() === text,
  );
  expect(found, text).toBeTruthy();
  return found!;
};
async function controlValue(selector: string, value: string) {
  const control = container.querySelector<HTMLInputElement | HTMLSelectElement>(
    selector,
  )!;
  expect(control).toBeTruthy();
  const isSelect = control instanceof HTMLSelectElement;
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(
      isSelect ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
      'value',
    )!.set!.call(control, value);
    control.dispatchEvent(
      new Event(isSelect ? 'change' : 'input', { bubbles: true }),
    );
  });
}
async function renderPicker(
  value: string,
  onChange = vi.fn(),
  disabled = false,
) {
  await React.act(async () => {
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(catalog.OpenRouterModelPicker, {
          value,
          onChange,
          disabled,
          curatedModels: [{ id: 'curated:free', name: 'Curated model' }],
        }),
      ),
    );
  });
  return onChange;
}
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  React = await import('react');
  catalog = await import('../../src/openrouterCatalog');
  const { createRoot } = await import('react-dom/client');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await React.act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('deduplicates StrictMode and remount requests without exposing credentials or invoking selection', async () => {
  let resolve: (response: unknown) => void = () => {};
  const fetcher = vi.fn(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  vi.stubGlobal('fetch', fetcher);
  const onChange = await renderPicker('saved/model');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(button('Refresh catalog').disabled).toBe(true);
  expect(container.textContent).toContain('Selected: saved/model');
  expect(container.textContent).toContain('Unverified saved ID');
  expect(onChange).not.toHaveBeenCalled();
  await React.act(async () => root.render(null));
  await renderPicker('saved/model', onChange);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await React.act(async () => {
    resolve({ ok: true, json: async () => ({ data: [row('saved/model')] }) });
  });
  expect(button('Refresh catalog').disabled).toBe(false);
  expect(container.textContent).toContain('Zero published price');
  expect(onChange).not.toHaveBeenCalled();
  expect(fetcher.mock.calls[0]).toEqual([
    catalog.CATALOG_URL,
    {
      method: 'GET',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: expect.any(AbortSignal),
    },
  ]);
});

it('shows unverified legacy fallback after failure and replaces it on successful retry without selecting', async () => {
  localStorage.setItem(
    'aituber-onair.openrouter.dynamicFreeModels',
    JSON.stringify(['legacy:free']),
  );
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error('Catalog offline'))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [row('new/model')] }),
    });
  vi.stubGlobal('fetch', fetcher);
  const onChange = await renderPicker('legacy:free');
  expect(container.textContent).toContain('Catalog offline');
  expect(container.textContent).toContain(
    'Using unverified curated fallback IDs',
  );
  expect(container.textContent).toContain(
    'Selected: legacy:free — Unverified fallback',
  );
  expect(container.querySelectorAll('.model-item')).toHaveLength(2);
  await React.act(async () => button('Refresh catalog').click());
  expect(container.querySelectorAll('.model-item')).toHaveLength(1);
  expect(container.textContent).not.toContain('Curated model');
  expect(container.textContent).toContain(
    'Selected: legacy:free — Missing from catalog',
  );
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    'absent',
  );
  expect(container.textContent).not.toContain('Acknowledge current pricing');
  expect(onChange).not.toHaveBeenCalled();
});

it('keeps the selection through filters, price changes, stale errors, and missing IDs', async () => {
  const selected = 'selected/model';
  let data = [
    row(selected),
    row('paid/model', '0.1'),
    row('unknown/model', null),
  ];
  let offline = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (offline) throw new Error('Offline');
      return { ok: true, json: async () => ({ data }) };
    }),
  );
  const onChange = await renderPicker(selected);
  await controlValue('select', 'paid');
  expect(container.querySelectorAll('.model-item')).toHaveLength(1);
  expect(container.textContent).toContain(
    `Selected: ${selected} — Zero published price`,
  );
  await controlValue('input', 'NO MATCH');
  expect(container.querySelectorAll('.model-item')).toHaveLength(0);
  expect(container.textContent).toContain('Your selected ID is unchanged');
  expect(onChange).not.toHaveBeenCalled();

  data = [row(selected, '0.2')];
  await React.act(async () => button('Refresh catalog').click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    'Pricing metadata changed',
  );
  expect(container.textContent).toContain(`Selected: ${selected} — Paid`);
  expect(container.textContent).toContain('prompt: 0.2 USD/token');
  expect(onChange).not.toHaveBeenCalled();
  await React.act(async () =>
    button(`Acknowledge current pricing for ${selected}`).click(),
  );
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(selected);
  expect(container.querySelector('[role="alert"]')).toBeNull();

  offline = true;
  await React.act(async () => button('Refresh catalog').click());
  expect(container.textContent).toContain('Showing stale last-good metadata');
  expect(container.textContent).toContain(`Selected: ${selected} — Paid`);
  offline = false;
  data = [];
  await React.act(async () => button('Refresh catalog').click());
  expect(container.textContent).toContain(
    `Selected: ${selected} — Missing from catalog`,
  );
  expect(container.textContent).not.toContain('Acknowledge current pricing');
  expect(onChange).toHaveBeenCalledTimes(1);
});

it('disables all picker interactions while the parent is busy', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [row('paid:free', '1')] }),
    })),
  );
  const onChange = await renderPicker('paid:free', vi.fn(), true);
  const controls = [
    ...container.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement
    >('input, select, button'),
  ];
  expect(controls.length).toBeGreaterThan(4);
  expect(controls.every((control) => control.disabled)).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
});
