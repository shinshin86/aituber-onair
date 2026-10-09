// @vitest-environment jsdom
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from '../hooks/useSettings';
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

const PRO = 'microsoft/mai-voice-2.1';
const FLASH = 'microsoft/mai-voice-2.1-flash';
let fetchMock: ReturnType<typeof vi.fn>;

const saved = () => JSON.parse(localStorage.getItem(storageKey) || '{}').tts;
const select = (id: string) =>
  container.querySelector<HTMLSelectElement>(`#${id}`) as HTMLSelectElement;
const optionValues = (id: string) =>
  Array.from(select(id).options, (option) => option.value);
const speechCatalogCalls = () =>
  fetchMock.mock.calls.filter(([url]) =>
    String(url).includes('output_modalities=speech'),
  );
async function choose(id: string, value: string) {
  await act(async () => {
    const element = select(id);
    Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value',
    )?.set?.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('OpenRouter TTS settings', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        llm: { provider: 'openai', apiKeys: { openrouter: 'test-only-key' } },
        tts: {
          engine: 'openRouter',
          speaker: 'en-US-Stale:MAI-Voice-2.1',
        },
      }),
    );
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: PRO,
            supported_voices: [
              'cs-CZ-Grant:MAI-Voice-2.1',
              'en-US-Jenny:MAI-Voice-2.1',
              'en-US-Guy:MAI-Voice-2.1',
            ],
          },
          { id: FLASH, supported_voices: ['cs-CZ-Grant:MAI-Voice-2.1-Flash'] },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('requires an explicit preview model and preselects an English voice for it', async () => {
    await act(async () => root.render(<Harness />));

    expect(select('tts-openrouter-model').value).toBe('');
    expect(select('tts-openrouter-speaker').disabled).toBe(true);
    expect(speechCatalogCalls()).toHaveLength(0);

    await choose('tts-openrouter-model', PRO);
    expect(speechCatalogCalls()).toHaveLength(1);
    expect(String(speechCatalogCalls()[0][0])).toContain(
      'openrouter.ai/api/v1/models',
    );
    expect(optionValues('tts-openrouter-speaker')).toEqual([
      '',
      'cs-CZ-Grant:MAI-Voice-2.1',
      'en-US-Jenny:MAI-Voice-2.1',
      'en-US-Guy:MAI-Voice-2.1',
    ]);
    // The stale saved voice is replaced by the first English voice.
    expect(select('tts-openrouter-speaker').value).toBe(
      'en-US-Jenny:MAI-Voice-2.1',
    );
    expect(saved()).toMatchObject({
      openRouterModel: PRO,
      speaker: 'en-US-Jenny:MAI-Voice-2.1',
    });

    await choose('tts-openrouter-speaker', 'en-US-Guy:MAI-Voice-2.1');
    expect(saved()).toMatchObject({
      engine: 'openRouter',
      openRouterModel: PRO,
      speaker: 'en-US-Guy:MAI-Voice-2.1',
    });

    // A voice from the previous model is never reused; without an English
    // voice the first listed voice is selected.
    await choose('tts-openrouter-model', FLASH);
    expect(optionValues('tts-openrouter-speaker')).toEqual([
      '',
      'cs-CZ-Grant:MAI-Voice-2.1-Flash',
    ]);
    expect(saved()).toMatchObject({
      openRouterModel: FLASH,
      speaker: 'cs-CZ-Grant:MAI-Voice-2.1-Flash',
    });
  });

  it('shares the LLM OpenRouter API key instead of storing a TTS copy', async () => {
    await act(async () => root.render(<Harness />));
    const keyInput = container.querySelector<HTMLInputElement>(
      '#tts-openrouter-apikey',
    ) as HTMLInputElement;
    expect(keyInput.value).toBe('test-only-key');

    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set?.call(keyInput, 'updated-test-key');
      keyInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    expect(stored.llm.apiKeys.openrouter).toBe('updated-test-key');
    expect(stored.tts).not.toHaveProperty('openRouterApiKey');
  });

  it('prefills the TTS key field when the LLM already uses OpenRouter', async () => {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    stored.llm.provider = 'openrouter';
    localStorage.setItem(storageKey, JSON.stringify(stored));
    await act(async () => root.render(<Harness />));

    expect(
      container.querySelector<HTMLInputElement>('#tts-openrouter-apikey')
        ?.value,
    ).toBe('test-only-key');
    await choose('tts-openrouter-model', PRO);
    expect(speechCatalogCalls()).toHaveLength(1);
    expect(optionValues('tts-openrouter-speaker')).toContain(
      'en-US-Jenny:MAI-Voice-2.1',
    );
  });
});
