// @vitest-environment jsdom

import { act, createElement } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MODEL_INCLUSIONAI_LING_3_1_FLASH,
  MODEL_UNBIASED_PARETO_26_10_PREVIEW,
} from '../../chat/src';
import { useSettings as usePetSettings } from '../examples/react-pet-app/src/hooks/useSettings';
import { useSettings as useVrmSettings } from '../examples/react-vrm-app/src/hooks/useSettings';
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
  },
  {
    name: 'react-vrm-app',
    storageKey: 'react-vrm-app-settings',
    useSettings: useVrmSettings,
  },
] as const;

type SettingsResult = Pick<
  ReturnType<typeof usePetSettings>,
  'settings' | 'availableModels' | 'updateLLMProvider' | 'updateLLMModel'
>;

describe.each(examples)('$name OpenRouter model ordering', (example) => {
  let container: HTMLDivElement;
  let root: Root;
  let current: SettingsResult;

  function SettingsHarness() {
    current = example.useSettings();
    return null;
  }

  async function renderSettings() {
    await act(async () => root.render(createElement(SettingsHarness)));
  }

  async function switchToOpenRouter() {
    await act(async () => current.updateLLMProvider('openrouter'));
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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
    expect(current.availableModels).toEqual(models);
    expect(current.availableModels[0]).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);
    expect(current.availableModels[models.length - 1]).toBe(
      MODEL_UNBIASED_PARETO_26_10_PREVIEW,
    );
    expect(current.settings.llm.model).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);

    await act(async () =>
      current.updateLLMModel(MODEL_UNBIASED_PARETO_26_10_PREVIEW),
    );
    await act(async () => current.updateLLMProvider('openai'));
    await switchToOpenRouter();
    expect(current.settings.llm.model).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);
    expect(current.availableModels).toEqual(models);
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
    expect(current.availableModels).toEqual(
      AITuberOnAirCore.getSupportedModels('openrouter'),
    );
  });

  it('appends persisted dynamic models without changing the first model', async () => {
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
    expect(current.availableModels).toEqual([...models, dynamicModel]);
    expect(current.availableModels[0]).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);
    expect(current.settings.llm.model).toBe(MODEL_INCLUSIONAI_LING_3_1_FLASH);
    expect(current.availableModels[models.length - 1]).toBe(
      MODEL_UNBIASED_PARETO_26_10_PREVIEW,
    );
  });
});
