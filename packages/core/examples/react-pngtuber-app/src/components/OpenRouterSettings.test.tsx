// @vitest-environment jsdom
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from '../hooks/useSettings';
import { refreshCatalog } from '../openrouterCatalog';
import { SettingsPanel } from './SettingsPanel';

vi.mock('./ScreenVisionPanel', () => ({ ScreenVisionPanel: () => null }));
const storageKey = 'react-pngtuber-app-settings';
let root: Root;
let container: HTMLDivElement;
function Harness() {
  const settings = useSettings();
  return (
    <SettingsPanel
      avatarImageUrls={{}}
      onAvatarImageChange={() => undefined}
      {...settings}
      isProcessing={false}
      backgroundImageUrl={null}
      onBackgroundImageChange={() => undefined}
      onResetKizunaData={async () => undefined}
      screenVisionController={
        {} as Parameters<typeof SettingsPanel>[0]['screenVisionController']
      }
    />
  );
}
const response = (ids: string[]) => ({
  ok: true,
  json: async () => ({
    data: ids.map((id) => ({
      id,
      name: id,
      architecture: { input_modalities: ['text'], output_modalities: ['text'] },
      pricing: { prompt: '0', completion: '0' },
      supported_parameters: [],
    })),
  }),
});
describe('OpenRouter settings integration', () => {
  it('hides retired catalog rows while preserving the selected saved ID', async () => {
    const retired = 'inception/mercury-2.5';
    const current = 'anthropic/claude-fable-5.2';
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        llm: {
          provider: 'openrouter',
          model: retired,
          apiKeys: { openrouter: 'saved-key' },
          openRouterDynamicFreeModels: {
            models: [retired],
            fetchedAt: 1,
            maxCandidates: 1,
          },
        },
      }),
    );
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(await response([retired, current]).json()), {
        status: 200,
      }),
    );
    await act(async () => root.render(<Harness />));
    await act(async () => {
      await refreshCatalog(true);
    });
    const rows = [...container.querySelectorAll('.model-list button')];
    expect(rows.some((row) => row.textContent?.includes(retired))).toBe(false);
    expect(rows.some((row) => row.textContent?.includes(current))).toBe(true);
    const saved = JSON.parse(localStorage.getItem(storageKey)!);
    expect(saved.llm.model).toBe(retired);
    expect(saved.llm.apiKeys.openrouter).toBe('saved-key');
  });

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        llm: {
          provider: 'openrouter',
          model: 'legacy/missing:free',
          apiKeys: { openrouter: 'saved-key', openai: 'other-key' },
          openRouterDynamicFreeModels: {
            models: ['legacy/missing:free'],
            fetchedAt: 1,
            maxCandidates: 3,
          },
        },
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(['fresh/zero', 'fresh/other'])),
    );
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  it.each(['sakana', 'sarashina'])(
    'preserves saved %s settings while keeping its option disabled',
    async (provider) => {
      const model = provider === 'sarashina' ? 'sarashina3-mini' : 'fugu';
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          llm: { provider, model, apiKeys: { [provider]: 'mock-saved-key' } },
        }),
      );
      await act(async () => root.render(<Harness />));
      const select =
        container.querySelector<HTMLSelectElement>('#llm-provider')!;
      expect(select.value).toBe(provider);
      const option = select.querySelector<HTMLOptionElement>(
        'option[value="sarashina"]',
      )!;
      expect(option.disabled).toBe(true);
      expect(option.textContent).toBe('Sarashina (Node/backend only)');
      expect(
        select.querySelector<HTMLOptionElement>('option[value="sakana"]')
          ?.disabled,
      ).toBe(true);
      const saved = JSON.parse(localStorage.getItem(storageKey)!);
      expect(saved.llm.provider).toBe(provider);
      expect(saved.llm.model).toBe(model);
      expect(saved.llm.apiKeys[provider]).toBe('mock-saved-key');
      expect(
        vi
          .mocked(fetch)
          .mock.calls.every(([url]) => !String(url).includes('sarashina.ai')),
      ).toBe(true);
    },
  );

  it('preserves legacy selected IDs and keys, uses authoritative rows, and persists explicit selection', async () => {
    await act(async () => {
      root.render(<Harness />);
    });
    await act(async () => {
      await refreshCatalog(true);
    });
    expect(container.textContent).toContain('カタログにありません');
    expect(container.textContent).not.toContain('Fetch free models');
    expect(container.querySelector('#llm-model')).toBeNull();
    // The picker must sit inside the panel's form field so it inherits the
    // sample's input styles instead of browser defaults.
    expect(
      container.querySelector('.settings-field > .openrouter-catalog'),
    ).not.toBeNull();
    expect(
      container.querySelector<HTMLInputElement>('.openrouter-catalog input')
        ?.type,
    ).toBe('text');
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.model-list button'),
    );
    expect(buttons.map((button) => button.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('fresh/zero')]),
    );
    expect(
      buttons.some((button) => button.textContent?.includes('legacy/missing')),
    ).toBe(false);
    const saved = () =>
      JSON.parse(localStorage.getItem(storageKey) || '{}').llm;
    expect(saved().model).toBe('legacy/missing:free');
    expect(saved().apiKeys.openrouter).toBe('saved-key');
    expect(saved().apiKeys.openai).toBe('other-key');
    act(() =>
      buttons
        .find((button) => button.textContent?.includes('fresh/zero'))
        ?.click(),
    );
    expect(saved().model).toBe('fresh/zero');
    await act(async () => {
      await refreshCatalog(true);
    });
    expect(saved().model).toBe('fresh/zero');
    expect(fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({ method: 'GET', credentials: 'omit' }),
    );
    for (const [, options] of vi.mocked(fetch).mock.calls)
      expect(options).not.toHaveProperty('body');
  });
});
