// @vitest-environment jsdom
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLAUDE_DEPRECATED_MODELS,
  GEMINI_DEPRECATED_MODELS,
  KIMI_DEPRECATED_MODELS,
} from '../src';
import { useSettings as useSettings0 } from '../examples/react-single-image-avatar-app/src/hooks/useSettings';
import { useSettings as useSettings1 } from '../examples/react-mesh-avatar-app/src/hooks/useSettings';
import { useSettings as useSettings2 } from '../examples/react-vrm-app/src/hooks/useSettings';
import { useSettings as useSettings3 } from '../examples/react-pet-app/src/hooks/useSettings';
import { useSettings as useSettings4 } from '../examples/react-pngtuber-app/src/hooks/useSettings';
import { useSettings as useSettings5 } from '../examples/react-purupuru-app/src/hooks/useSettings';
import { useSettings as useSettings6 } from '../examples/react-inochi2d-app/src/hooks/useSettings';
import { useSettings as useSettings7 } from '../examples/react-psd-app/src/hooks/useSettings';
import { useSettings as useSettings8 } from '../examples/react-live2d-app/src/hooks/useSettings';

vi.mock('@aituber-onair/core', () => import('../src'));
const examples = [
  {
    name: 'react-single-image-avatar-app',
    storageKey: 'react-single-image-avatar-app-settings',
    useSettings: useSettings0,
  },
  {
    name: 'react-mesh-avatar-app',
    storageKey: 'react-mesh-avatar-app-settings',
    useSettings: useSettings1,
  },
  {
    name: 'react-vrm-app',
    storageKey: 'react-vrm-app-settings',
    useSettings: useSettings2,
  },
  {
    name: 'react-pet-app',
    storageKey: 'react-pet-app-settings',
    useSettings: useSettings3,
  },
  {
    name: 'react-pngtuber-app',
    storageKey: 'react-pngtuber-app-settings',
    useSettings: useSettings4,
  },
  {
    name: 'react-purupuru-app',
    storageKey: 'react-purupuru-app-settings',
    useSettings: useSettings5,
  },
  {
    name: 'react-inochi2d-app',
    storageKey: 'react-inochi2d-app-settings',
    useSettings: useSettings6,
  },
  {
    name: 'react-psd-app',
    storageKey: 'react-psd-app-settings',
    useSettings: useSettings7,
  },
  {
    name: 'react-live2d-app',
    storageKey: 'react-live2d-app-settings',
    useSettings: useSettings8,
  },
] as const;

type ReactModule = typeof import('react');
type ReactDOMModule = typeof import('react-dom/client');

type SettingsResult = {
  availableModels: string[];
  updateLLMProvider: (provider: 'openai' | 'kimi') => void;
  settings: {
    llm: { model: string };
    tts: {
      engine: string;
      speaker: string;
      openAiModel?: string;
      geminiTtsModel?: string;
      cartesiaModel?: string;
    };
  };
  updateTTSEngine: (engine: 'openai') => void;
  updateTtsField: (key: 'openAiModel', value: string) => void;
  updateTTSSpeaker: (speaker: string) => void;
};

describe.each(examples)('$name released voice settings', (example) => {
  const requireExample = createRequire(
    resolve(__dirname, `../examples/${example.name}/src/hooks/useSettings.ts`),
  );
  const { act, createElement } = requireExample('react') as ReactModule;
  const { createRoot } = requireExample('react-dom/client') as ReactDOMModule;
  let root: Root;
  let container: HTMLDivElement;
  let current: SettingsResult;
  function Harness() {
    current = example.useSettings();
    return null;
  }
  const mount = async () => {
    await act(async () => root.render(createElement(Harness)));
  };
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
  });
  it('selects the published OpenAI default when switching back to that provider', async () => {
    await mount();
    await act(async () => current.updateLLMProvider('kimi'));
    await act(async () => current.updateLLMProvider('openai'));
    expect(current.settings.llm.model).toBe('gpt-5.6-luna');
  });
  it.each(['gpt-4.1-nano', 'o1', 'o1-mini', 'o3-mini'])(
    'migrates shut-down saved OpenAI model %s and persists the replacement',
    async (model) => {
      localStorage.setItem(
        example.storageKey,
        JSON.stringify({
          llm: { provider: 'openai', model },
        }),
      );
      await mount();
      expect(current.settings.llm.model).toBe('gpt-5.6-luna');
      expect(current.availableModels).toContain('gpt-5.6-luna');
      expect(current.availableModels).not.toContain(model);
      expect(
        JSON.parse(localStorage.getItem(example.storageKey)!).llm.model,
      ).toBe('gpt-5.6-luna');
    },
  );
  it.each([
    ...['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.1', 'gpt-5.4-nano'].map(
      (model) => ['openai', model],
    ),
    ...CLAUDE_DEPRECATED_MODELS.map((model) => ['claude', model]),
    ...GEMINI_DEPRECATED_MODELS.map((model) => ['gemini', model]),
    ...KIMI_DEPRECATED_MODELS.map((model) => ['kimi', model]),
    ['openai-compatible', 'gpt-4.1-nano'],
  ])(
    'preserves saved %s model %s and keeps it available',
    async (provider, model) => {
      localStorage.setItem(
        example.storageKey,
        JSON.stringify({
          llm: { provider, model },
        }),
      );
      await mount();
      expect(current.settings.llm.model).toBe(model);
      expect(current.availableModels).toContain(model);
      expect(
        JSON.parse(localStorage.getItem(example.storageKey)!).llm.model,
      ).toBe(model);
    },
  );
  it('uses stable defaults for new settings', async () => {
    await mount();
    expect(current.settings.tts.geminiTtsModel).toBe('gemini-3.8-flash-tts');
    expect(current.settings.tts.cartesiaModel).toBe('sonic-3.6');
    expect(current.settings.tts.openAiModel).toBe('tts-1');
  });
  it.each([
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
    'gemini-2.5-pro-preview-tts',
  ])('preserves explicit saved %s and Sonic 3.5', async (model) => {
    localStorage.setItem(
      example.storageKey,
      JSON.stringify({
        tts: { geminiTtsModel: model, cartesiaModel: 'sonic-3.5' },
      }),
    );
    await mount();
    expect(current.settings.tts.geminiTtsModel).toBe(model);
    expect(current.settings.tts.cartesiaModel).toBe('sonic-3.5');
  });
  it('uses stable defaults for blank saved models', async () => {
    localStorage.setItem(
      example.storageKey,
      JSON.stringify({ tts: { geminiTtsModel: '  ', cartesiaModel: '' } }),
    );
    await mount();
    expect(current.settings.tts.geminiTtsModel).toBe('gemini-3.8-flash-tts');
    expect(current.settings.tts.cartesiaModel).toBe('sonic-3.6');
  });
  it('persists the OpenAI model and resets incompatible voices on change', async () => {
    await mount();
    await act(async () => current.updateTTSEngine('openai'));
    await act(async () =>
      current.updateTtsField('openAiModel', 'gpt-4o-mini-tts'),
    );
    await act(async () => current.updateTTSSpeaker('marin'));
    await act(async () => root.unmount());
    root = createRoot(container);
    await mount();
    expect(current.settings.tts.openAiModel).toBe('gpt-4o-mini-tts');
    expect(current.settings.tts.speaker).toBe('marin');
    await act(async () => current.updateTtsField('openAiModel', 'tts-1-hd'));
    expect(current.settings.tts.speaker).toBe('alloy');
    const saved = JSON.parse(localStorage.getItem(example.storageKey)!);
    expect(saved.tts).toMatchObject({
      openAiModel: 'tts-1-hd',
      speaker: 'alloy',
    });
    await act(async () => current.updateTTSSpeaker('sage'));
    await act(async () => current.updateTtsField('openAiModel', 'tts-1'));
    expect(current.settings.tts.speaker).toBe('sage');
  });
});
