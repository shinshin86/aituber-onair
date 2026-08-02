// @vitest-environment jsdom

import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const voiceMockState = vi.hoisted(() => ({
  engine: 'off',
  aivisState: 'unchecked',
  voiceError: null as string | null,
}));

vi.mock('./components/AvatarCanvas', () => ({
  default: () => <div data-testid="avatar" />,
}));

vi.mock('./hooks/useMikoVoice', () => ({
  useMikoVoice: () => ({
    engine: voiceMockState.engine,
    setEngine: vi.fn(),
    webVoice: null,
    aivisState: voiceMockState.aivisState,
    aivisVoices: [],
    aivisSpeaker: '',
    selectAivisSpeaker: vi.fn(),
    refreshAivis: vi.fn(async () => undefined),
    isSpeaking: false,
    speakingReportKind: null,
    voiceNotice: null,
    voiceError: voiceMockState.voiceError,
  }),
}));

describe('stream operations fixture playback', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.useFakeTimers();
    voiceMockState.engine = 'off';
    voiceMockState.aivisState = 'unchecked';
    voiceMockState.voiceError = null;
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    window.localStorage.clear();
    root = createRoot(container);
    await act(async () =>
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      )
    );
    await act(async () => Promise.resolve());
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('allows AivisSpeech to be selected before a connection check', () => {
    const option = container.querySelector('option[value="aivisSpeech"]');
    expect(option).toBeInstanceOf(HTMLOptionElement);
    expect((option as HTMLOptionElement).disabled).toBe(false);
  });

  it('shows the AivisSpeech connection error without changing the selection', async () => {
    voiceMockState.engine = 'aivisSpeech';
    voiceMockState.aivisState = 'unavailable';
    voiceMockState.voiceError =
      'AivisSpeechに接続できませんでした。アプリを起動して再確認してください';
    await act(async () =>
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      )
    );

    const engineSelect = container.querySelector('#miko-voice-engine');
    expect((engineSelect as HTMLSelectElement).value).toBe('aivisSpeech');
    expect(
      container.querySelector('.voice-source-status')?.textContent
    ).toContain('接続できません');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'AivisSpeechに接続できませんでした'
    );
  });

  it('recovers from the fixture error and completes all comments', async () => {
    const endButton = getButton('配信を終了してレポート作成');
    expect(endButton.disabled).toBe(true);

    await click(getButton('4x'));
    await click(getButtonByLabel('コメント再生を開始'));
    for (let step = 0; step < 24; step += 1) {
      await act(async () => vi.advanceTimersByTimeAsync(300));
    }

    expect(
      container.querySelector('.comments-panel .count-badge')?.textContent
    ).toBe('16件');
    expect(
      container.querySelector('.connection-strip strong')?.textContent
    ).not.toBe('分析エラー');
    expect(endButton.disabled).toBe(false);

    await click(endButton);
    await act(async () => vi.advanceTimersByTimeAsync(1_200));

    expect(container.querySelector('.overall-summary')?.textContent).toContain(
      '固定フィクスチャ16件を分析'
    );
  });

  function getButton(text: string): HTMLButtonElement {
    const button = [...container.querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.includes(text)
    );
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`Button was not found: ${text}`);
    }
    return button;
  }

  function getButtonByLabel(label: string): HTMLButtonElement {
    const button = container.querySelector(`button[aria-label="${label}"]`);
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`Button was not found: ${label}`);
    }
    return button;
  }

  async function click(button: HTMLButtonElement): Promise<void> {
    await act(async () => button.click());
  }
});
