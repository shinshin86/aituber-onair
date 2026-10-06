// @vitest-environment jsdom
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettings } from '../hooks/useSettings';
import { SettingsPanel } from './SettingsPanel';

vi.mock('./ScreenVisionPanel', () => ({ ScreenVisionPanel: () => null }));
const storageKey = 'react-purupuru-app-settings';
let root: Root;
let container: HTMLDivElement;
function Harness() {
  const settings = useSettings();
  return (
    <SettingsPanel
      avatarPackage={null}
      avatarPackageSource={null}
      onAvatarPackageChange={() => undefined}
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
        tts: {
          engine: 'openRouter',
          openRouterApiKey: 'test-only-key',
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
              'en-US-Jenny:MAI-Voice-2.1',
              'en-US-Guy:MAI-Voice-2.1',
            ],
          },
          { id: FLASH, supported_voices: ['en-US-Jenny:MAI-Voice-2.1-Flash'] },
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

  it('requires an explicit preview model and voice, and clears the voice on model changes', async () => {
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
      'en-US-Jenny:MAI-Voice-2.1',
      'en-US-Guy:MAI-Voice-2.1',
    ]);
    expect(select('tts-openrouter-speaker').value).toBe('');
    expect(saved()).toMatchObject({ openRouterModel: PRO, speaker: '' });

    await choose('tts-openrouter-speaker', 'en-US-Guy:MAI-Voice-2.1');
    expect(saved()).toMatchObject({
      engine: 'openRouter',
      openRouterModel: PRO,
      speaker: 'en-US-Guy:MAI-Voice-2.1',
    });

    await choose('tts-openrouter-model', FLASH);
    expect(saved()).toMatchObject({ openRouterModel: FLASH, speaker: '' });
    expect(optionValues('tts-openrouter-speaker')).toEqual([
      '',
      'en-US-Jenny:MAI-Voice-2.1-Flash',
    ]);
    expect(select('tts-openrouter-speaker').value).toBe('');
  });
});
