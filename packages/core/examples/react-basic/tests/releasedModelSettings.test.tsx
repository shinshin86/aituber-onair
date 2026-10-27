import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

vi.mock('@aituber-onair/voice', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    VoiceEngineAdapter: class {
      speakText = vi.fn(async () => {});
      stop = vi.fn();
      updateOptions = vi.fn();
      getOptions = vi.fn(() => ({}));
    },
  };
});
const storageKey = 'AITuberOnAirCore_example_react-basic';
let root: Root;
let container: HTMLDivElement;
async function button(text: string) {
  const control = [...container.querySelectorAll('button')].find(
    (entry) => entry.textContent?.trim() === text,
  )!;
  expect(control).toBeTruthy();
  await act(async () => control.click());
}
async function choose(id: string, value: string) {
  const control = container.querySelector<HTMLSelectElement>(`#${id}`)!;
  expect(control).toBeTruthy();
  await act(async () => {
    control.value = value;
    control.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network blocked')),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
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
describe('released model settings', () => {
  it('starts with the current Chat default because basic persists only catalog state', async () => {
    // Basic has no saved LLM settings to migrate. Old model-shaped properties
    // in its catalog storage must not override the current initial default.
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        llm: { provider: 'openai', model: 'gpt-4.1-nano' },
        openRouterDynamicFreeModels: { models: ['sample/saved-model'] },
      }),
    );
    await act(async () => root.render(<App />));
    await button('設定');
    const model = container.querySelector<HTMLSelectElement>('#model')!;
    expect(model.value).toBe('gpt-5.6-luna');
    expect([...model.options].map((option) => option.value)).not.toContain(
      'gpt-4.1-nano',
    );
    await choose('chatProvider', 'kimi');
    await choose('chatProvider', 'openai');
    expect(model.value).toBe('gpt-5.6-luna');
  });
  it('renders the new speech guidance in Japanese throughout the basic modal', async () => {
    await act(async () => root.render(<App />));
    await button('設定');
    await button('音声設定');
    await choose('voiceEngine', 'openRouter');
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
    await choose('voiceEngine', 'openai');
    expect(container.textContent).toContain(
      'OpenAI Speech APIのモデルは2027-01-06に提供終了予定です。',
    );
    await choose('voiceEngine', 'geminiTts');
    expect(container.textContent).toContain(
      '非推奨・最短で2026-11-17に提供終了',
    );
    await choose('voiceEngine', 'fishAudio');
    expect(container.textContent).toContain('2026-12-31に提供終了');
    expect(container.textContent).toContain(
      '無料期間は2026-11-30まで・SLAなし',
    );
    await choose('voiceEngine', 'gradium');
    expect(container.textContent).toContain(
      '現在はdefaultの別名・今後のベータ版を利用',
    );
    const similarity = container.querySelector<HTMLInputElement>(
      '[aria-label="音声類似度（非推奨・設定は無視されます）"]',
    );
    expect(similarity?.disabled).toBe(true);
  });
});
