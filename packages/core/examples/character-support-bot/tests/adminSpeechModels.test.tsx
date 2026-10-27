// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '../src/AdminPage';
import { getOpenAiSpeakers, getTtsModelLabel } from '../src/ttsModels';

vi.mock('../src/api', () => ({
  getAdminProviders: async () => ({
    llm: [
      {
        provider: 'openai',
        label: 'OpenAI',
        models: ['gpt-5.6-luna'],
        defaultModel: 'gpt-5.6-luna',
      },
    ],
    tts: [
      {
        provider: 'openai',
        label: 'OpenAI',
        models: ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'],
        defaultModel: 'gpt-4o-mini-tts',
        defaultVoice: 'coral',
        voices: [],
        modelRequired: true,
        voiceRequired: true,
        supportsVoiceList: false,
      },
    ],
  }),
  getAdminSettings: async () => ({
    llm: {
      provider: 'openai',
      model: 'gpt-5.6-luna',
      endpoint: '',
      persona: 'Hello',
      hasApiKey: true,
      defaultPersonas: { en: 'Hello', ja: 'こんにちは' },
      defaultPersonaAliases: [],
    },
    tts: {
      provider: 'openai',
      model: 'gpt-4o-mini-tts',
      voice: 'coral',
      endpoint: '',
      speed: 1,
      groupId: '',
      hasApiKey: true,
    },
  }),
  getTtsVoices: vi.fn(),
  saveAdminSettings: vi.fn(),
}));
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(<AdminPage language="en" onLanguageChange={() => {}} />),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function choose(element: HTMLSelectElement, value: string) {
  await act(async () => {
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
describe('admin OpenAI speech models', () => {
  it('updates the speech shutdown notice when the UI language changes', async () => {
    expect(container.textContent).toContain(
      'OpenAI Speech API models shut down on 2027-01-06.',
    );
    await act(async () =>
      root.render(<AdminPage language="ja" onLanguageChange={() => {}} />),
    );
    expect(container.textContent).toContain(
      'OpenAI Speech APIのモデルは2027-01-06に提供終了予定です。',
    );
    expect(container.textContent).not.toContain(
      'OpenAI Speech API models shut down',
    );
  });
  it.each([
    ['gemini-3.1-flash-tts-preview', '2026-11-17'],
    ['gemini-2.5-flash-preview-tts', '2026-11-17'],
    ['gemini-2.5-pro-preview-tts', '2026-11-17'],
    ['s1', '2026-12-31'],
    ['s2.1-pro-free', '2026-11-30'],
  ])('localizes the lifecycle label for %s', (model, date) => {
    expect(getTtsModelLabel(model, 'ja')).toContain(date);
    expect(getTtsModelLabel(model, 'ja')).toMatch(/提供終了|無料期間/);
    expect(getTtsModelLabel(model, 'en')).toContain(date);
    expect(getTtsModelLabel(model, 'en')).toMatch(/deprecated|free through/);
  });
  it('filters all thirteen voices and resets an incompatible choice after model changes', async () => {
    const section = container.querySelectorAll('.settings-card')[1];
    const selects = section.querySelectorAll('select');
    const model = selects[1];
    const voice = selects[2];
    expect(model.value).toBe('gpt-4o-mini-tts');
    expect(Array.from(voice.options, (o) => o.value)).toEqual(
      getOpenAiSpeakers('gpt-4o-mini-tts'),
    );
    await choose(voice, 'marin');
    await choose(model, 'tts-1');
    expect(voice.value).toBe('alloy');
    expect(voice.options).toHaveLength(9);
    expect(Array.from(voice.options, (o) => o.value)).not.toContain('marin');
    expect(section.textContent).toContain('2027-01-06');
  });
});
