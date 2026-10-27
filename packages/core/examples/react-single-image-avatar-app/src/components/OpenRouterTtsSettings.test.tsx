// @vitest-environment jsdom
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from '../hooks/useSettings';
import { SettingsPanel } from './SettingsPanel';

vi.mock('./ScreenVisionPanel', () => ({ ScreenVisionPanel: () => null }));
const storageKey = 'react-single-image-avatar-app-settings';
let root: Root;
let container: HTMLDivElement;
function Harness() {
  const settings = useSettings();
  return (
    <SettingsPanel
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
  it.each([
    ['openai', 'gpt-5'],
    ['openai', 'gpt-5-mini'],
    ['openai', 'gpt-5-nano'],
    ['openai', 'gpt-5.1'],
    ['openai', 'gpt-5.4-nano'],
    ['claude', 'claude-sonnet-4-5-20250929'],
    ['gemini', 'gemini-3.7-flash'],
    ['gemini', 'gemini-3.5-flash'],
    ['kimi', 'kimi-k2.5'],
  ])(
    'displays the saved %s model %s as deprecated without changing it',
    async (provider, model) => {
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      stored.llm.provider = provider;
      stored.llm.model = model;
      localStorage.setItem(storageKey, JSON.stringify(stored));
      await act(async () => root.render(<Harness />));
      const control = select('llm-model');
      expect(control.value).toBe(model);
      expect(control.selectedOptions[0].textContent).toBe(`${model}（非推奨）`);
      expect(JSON.parse(localStorage.getItem(storageKey)!).llm.model).toBe(
        model,
      );
      // Choosing a current model removes the saved-only option.
      const replacement = Array.from(control.options).find(
        (option) => option.value !== model,
      )!.value;
      await choose('llm-model', replacement);
      expect(control.value).toBe(replacement);
      expect(optionValues('llm-model')).not.toContain(model);
    },
  );
  it('displays the migrated replacement for the shut-down saved default', async () => {
    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    stored.llm.model = 'gpt-4.1-nano';
    localStorage.setItem(storageKey, JSON.stringify(stored));
    await act(async () => root.render(<Harness />));
    expect(select('llm-model').value).toBe('gpt-5.6-luna');
    expect(optionValues('llm-model')).not.toContain('gpt-4.1-nano');
  });
  it('uses Japanese lifecycle guidance and retains the MAI Japanese-voice limitation', async () => {
    await act(async () => root.render(<Harness />));
    expect(container.textContent).toContain(
      'MAIモデルは公開プレビュー版で、SLAはなく',
    );
    expect(container.textContent).toContain(
      '現時点では日本語の音声がありません。',
    );
    expect(container.textContent).toContain(
      'ElevenLabsモデルはMP3形式で返します。',
    );
    expect(container.textContent).toContain(
      '音声は選択したモデルのカタログから選んでください。',
    );
    await choose('tts-engine', 'openai');
    expect(container.textContent).toContain(
      'OpenAI Speech APIのモデルは2027-01-06に提供終了予定です。',
    );
    expect(container.textContent).toContain('後継モデルにはRealtime APIが必要');
    await choose('tts-engine', 'geminiTts');
    expect(select('tts-gemini-model').textContent).toContain(
      '非推奨・最短で2026-11-17に提供終了',
    );
    await choose('tts-engine', 'fishAudio');
    expect(select('tts-fish-audio-model').textContent).toContain(
      '2026-12-31に提供終了',
    );
    expect(select('tts-fish-audio-model').textContent).toContain(
      '無料期間は2026-11-30まで・SLAなし',
    );
    await choose('tts-engine', 'gradium');
    expect(select('tts-gradium-model').textContent).toContain(
      '現在はdefaultの別名・今後のベータ版を利用',
    );
    expect(container.textContent).toContain(
      '音声類似度（非推奨・設定は無視されます）',
    );
    expect(container.textContent).not.toContain('deprecated, ignored');
  });
  it('filters OpenAI voices by model and resets an incompatible selected voice', async () => {
    localStorage.clear();
    await act(async () => root.render(<Harness />));
    await choose('tts-engine', 'openai');
    expect(optionValues('tts-speaker')).toHaveLength(9);
    await choose('tts-openai-model', 'gpt-4o-mini-tts');
    expect(optionValues('tts-speaker')).toHaveLength(13);
    await choose('tts-speaker', 'marin');
    await choose('tts-openai-model', 'tts-1');
    expect(select('tts-speaker').value).toBe('alloy');
    expect(optionValues('tts-speaker')).not.toContain('marin');
    expect(container.textContent).toContain('2027-01-06');
  });
  it('loads newly cataloged ElevenLabs voices without a fixed allowlist', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'elevenlabs/eleven-v4',
            supported_voices: ['new-provider-voice'],
          },
        ],
      }),
    });
    await act(async () => root.render(<Harness />));
    await choose('tts-openrouter-model', 'elevenlabs/eleven-v4');
    expect(optionValues('tts-openrouter-speaker')).toContain(
      'new-provider-voice',
    );
    await choose('tts-openrouter-speaker', 'new-provider-voice');
    expect(saved().openRouterModel).toBe('elevenlabs/eleven-v4');
    expect(saved().speaker).toBe('new-provider-voice');
  });

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
