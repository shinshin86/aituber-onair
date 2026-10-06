// @vitest-environment jsdom

import { act, createElement } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MODEL_INCLUSIONAI_LING_3_1_FLASH,
  MODEL_UNBIASED_PARETO_26_10_PREVIEW,
} from '../../chat/src';
import { useSettings as usePetSettings } from '../examples/react-pet-app/src/hooks/useSettings';
import { OpenRouterModelPicker as PetOpenRouterModelPicker } from '../examples/react-pet-app/src/openrouterCatalog';
import { useSettings as useVrmSettings } from '../examples/react-vrm-app/src/hooks/useSettings';
import { OpenRouterModelPicker as VrmOpenRouterModelPicker } from '../examples/react-vrm-app/src/openrouterCatalog';
import { AITuberOnAirCore } from '../src';

// Resolve package imports to the real source so the hooks and Core factory
// exercise the current provider catalog, rather than previously built output.
vi.mock('@aituber-onair/core', () => import('../src'));
vi.mock('@aituber-onair/chat', () => import('../../chat/src'));

const examples = [
  {
    name: 'react-pet-app',
    storageKey: 'react-pet-app-settings',
    useSettings: usePetSettings,
    Picker: PetOpenRouterModelPicker,
  },
  {
    name: 'react-vrm-app',
    storageKey: 'react-vrm-app-settings',
    useSettings: useVrmSettings,
    Picker: VrmOpenRouterModelPicker,
  },
] as const;

type SettingsResult = Pick<
  ReturnType<typeof usePetSettings>,
  'settings' | 'updateLLMProvider' | 'updateLLMModel'
>;

describe.each(examples)('$name OpenRouter model ordering', (example) => {
  let container: HTMLDivElement;
  let root: Root;
  let current: SettingsResult;

  // Mirrors the SettingsPanel wiring. The catalog request is stubbed to fail,
  // so the picker shows the SDK order as its unverified fallback list.
  function SettingsHarness() {
    current = example.useSettings();
    if (current.settings.llm.provider !== 'openrouter') return null;
    return createElement(example.Picker, {
      value: current.settings.llm.model,
      legacyModels: current.settings.llm.openRouterDynamicFreeModels?.models,
      onChange: current.updateLLMModel,
      curatedModels: AITuberOnAirCore.getSupportedModels('openrouter').map(
        (id) => ({ id }),
      ),
    });
  }

  function listedModels(): string[] {
    return Array.from(
      container.querySelectorAll('.model-item .model-id'),
      (node) => node.textContent ?? '',
    );
  }

  async function renderSettings() {
    await act(async () => root.render(createElement(SettingsHarness)));
  }

  async function switchToOpenRouter() {
    await act(async () => current.updateLLMProvider('openrouter'));
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('keeps Ling first when switching providers, with Pareto appended last', async () => {
    await renderSettings();
    expect(current.settings.llm.provider).toBe('openai');

    await switchToOpenRouter();
    const models = AITuberOnAirCore.getSupportedModels('openrouter');
    expect(listedModels()).toEqual(models);
    expect(listedModels()[0]).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);
    expect(listedModels()[models.length - 1]).toBe(
      MODEL_UNBIASED_PARETO_26_10_PREVIEW,
    );
    expect(current.settings.llm.model).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);

    await act(async () =>
      current.updateLLMModel(MODEL_UNBIASED_PARETO_26_10_PREVIEW),
    );
    await act(async () => current.updateLLMProvider('openai'));
    await switchToOpenRouter();
    expect(current.settings.llm.model).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);
    expect(listedModels()).toEqual(models);
  });

  it('preserves an explicitly selected Pareto model after saving and remounting', async () => {
    await renderSettings();
    await switchToOpenRouter();
    await act(async () =>
      current.updateLLMModel(MODEL_UNBIASED_PARETO_26_10_PREVIEW),
    );

    const saved = JSON.parse(localStorage.getItem(example.storageKey)!);
    expect(saved.llm).toMatchObject({
      provider: 'openrouter',
      model: MODEL_UNBIASED_PARETO_26_10_PREVIEW,
    });

    await act(async () => root.unmount());
    root = createRoot(container);
    await renderSettings();
    expect(current.settings.llm.provider).toBe('openrouter');
    expect(current.settings.llm.model).toBe(
      MODEL_UNBIASED_PARETO_26_10_PREVIEW,
    );
    expect(listedModels()).toEqual(
      AITuberOnAirCore.getSupportedModels('openrouter'),
    );
  });

  it('appends persisted legacy model IDs without changing the first model', async () => {
    const dynamicModel = 'example/dynamic-model:free';
    localStorage.setItem(
      example.storageKey,
      JSON.stringify({
        llm: {
          openRouterDynamicFreeModels: {
            models: [
              MODEL_UNBIASED_PARETO_26_10_PREVIEW,
              dynamicModel,
              MODEL_INCLUSIONAI_LING_3_1_FLASH,
              dynamicModel,
            ],
            fetchedAt: 1,
            maxCandidates: 1,
          },
        },
      }),
    );

    await renderSettings();
    await switchToOpenRouter();
    const models = AITuberOnAirCore.getSupportedModels('openrouter');
    expect(listedModels()).toEqual([...models, dynamicModel]);
    expect(listedModels()[0]).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);
    expect(current.settings.llm.model).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);
    expect(listedModels()[models.length - 1]).toBe(
      MODEL_UNBIASED_PARETO_26_10_PREVIEW,
    );
  });
});
