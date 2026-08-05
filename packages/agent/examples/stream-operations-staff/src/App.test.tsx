// @vitest-environment jsdom

import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const runtimeMock = vi.hoisted(() => ({
  initialize: vi.fn(async () => ({
    backendSessionId: 'thread-test',
    resumed: false,
  })),
  analyzeComments: vi.fn(async (comments: readonly { id: string }[]) => ({
    events: [],
    analysis: {
      analyzedCommentCount: comments.length,
      selectedCommentIds: comments.length > 1 ? [comments.at(-1)?.id] : [],
      safetyReports: [],
    },
  })),
  createPostStreamReport: vi.fn(async () => ({
    events: [],
    result: {
      turnId: 'turn-report',
      message: 'Miko created the local post-stream report.',
      artifacts: [
        {
          id: 'report-test',
          type: 'stream-operations-report',
          version: 1,
          title: '配信後レポート',
          createdAt: '2026-08-05T00:00:00.000Z',
          source: {
            agentId: 'miko',
            sessionId: 'stream',
            turnId: 'turn-report',
          },
          data: {
            kind: 'post-stream-report',
            delivery: 'local-draft',
            streamId: 'fixture-stream-001',
            summary: '固定フィクスチャ16件を分析しました。',
            viewerSentiment: '肯定的な反応が中心でした。',
            notableTopics: ['制作配信'],
            safetyConcerns: ['安全性注意を確認'],
            frequentQuestions: ['制作環境への質問'],
            unansweredQuestions: ['確認が必要な質問'],
            constructiveFeedback: ['改善提案を確認'],
            nextStreamSuggestions: ['次回テーマを準備する。'],
            evidence: [{ commentId: 'c02', observation: '質問カテゴリ' }],
          },
        },
      ],
    },
  })),
  subscribeState: vi.fn(
    (listener: (state: Record<string, unknown>) => void) => {
      listener({
        backendSessionId: 'thread-test',
        pendingApprovals: [],
        resumed: false,
        turnActive: false,
      });
      return () => undefined;
    }
  ),
  resolveApproval: vi.fn(async () => undefined),
  interrupt: vi.fn(async () => undefined),
  reset: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
}));

vi.mock('./agentRuntime', () => ({
  createStreamOperationsStaffRuntime: () => runtimeMock,
}));

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

  it('completes all fixture comments and creates the report', async () => {
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

  it('continues playback after a macrotask-delayed analysis response', async () => {
    runtimeMock.analyzeComments.mockImplementationOnce(
      async (comments: readonly { id: string }[]) =>
        resolveAnalysisAfter(comments, 20)
    );

    await click(getButton('4x'));
    await click(getButtonByLabel('コメント再生を開始'));
    for (let step = 0; step < 4; step += 1) {
      await act(async () => vi.advanceTimersByTimeAsync(300));
    }

    const displayedCount = Number.parseInt(
      container.querySelector('.comments-panel .count-badge')?.textContent ??
        '0',
      10
    );
    expect(displayedCount).toBeGreaterThan(1);
  });

  it('clears the analyzing state when reset fails', async () => {
    runtimeMock.analyzeComments.mockImplementationOnce(
      async (comments: readonly { id: string }[]) =>
        resolveAnalysisAfter(comments, 1_000)
    );
    runtimeMock.reset.mockRejectedValueOnce(new Error('Reset failed.'));

    await click(getButton('4x'));
    await click(getButtonByLabel('コメント再生を開始'));
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(container.querySelector('.rules-status')?.textContent).toContain(
      '分析中'
    );

    await click(getButton('リセット'));

    expect(container.querySelector('.rules-status')?.textContent).toContain(
      'エラー'
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Reset failed.'
    );
  });

  it('shows a server turn-error message in the dashboard', async () => {
    runtimeMock.analyzeComments.mockRejectedValueOnce(
      new Error('Codex output failed JSON Schema validation.')
    );

    await click(getButtonByLabel('コメント再生を開始'));
    await act(async () => vi.advanceTimersByTimeAsync(1_200));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Codex output failed JSON Schema validation.'
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

function resolveAnalysisAfter(
  comments: readonly { id: string }[],
  delayMs: number
): ReturnType<typeof runtimeMock.analyzeComments> {
  return new Promise<Awaited<ReturnType<typeof runtimeMock.analyzeComments>>>(
    (resolve) => {
      window.setTimeout(
        () =>
          resolve({
            events: [],
            analysis: {
              analyzedCommentCount: comments.length,
              selectedCommentIds: [],
              safetyReports: [],
            },
          }),
        delayMs
      );
    }
  );
}
