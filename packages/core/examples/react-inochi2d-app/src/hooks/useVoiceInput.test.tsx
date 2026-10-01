// @vitest-environment jsdom

import { act, useLayoutEffect } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceInputMode, VoiceInputService } from '../lib/voiceInput';
import { useVoiceInput } from './useVoiceInput';

type Listener<T> = (value: T) => void;

class MockSession {
  static instances: MockSession[] = [];

  state = 'idle';
  private transcriptListeners = new Set<
    Listener<{ utteranceId: string; text: string; isFinal: boolean }>
  >();
  private stateListeners = new Set<Listener<string>>();
  private errorListeners = new Set<Listener<{ code: string }>>();
  private finishConnect: (() => void) | null = null;

  readonly options: { provider: string };

  constructor(options: { provider: string }) {
    this.options = options;
    MockSession.instances.push(this);
  }

  start = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        this.setState('connecting');
        this.finishConnect = () => {
          this.setState('listening');
          resolve();
        };
      }),
  );
  stop = vi.fn(async () => this.setState('idle'));
  dispose = vi.fn(async () => {
    this.state = 'disposed';
  });

  connect() {
    this.finishConnect?.();
  }

  setState(state: string) {
    this.state = state;
    for (const listener of this.stateListeners) listener(state);
  }

  emitTranscript(text: string, isFinal: boolean) {
    for (const listener of this.transcriptListeners) {
      listener({ utteranceId: 'u1', text, isFinal });
    }
  }

  emitError(code: string) {
    for (const listener of this.errorListeners) listener({ code });
  }

  onTranscript(
    listener: MockSession['transcriptListeners'] extends Set<infer L>
      ? L
      : never,
  ) {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  onStateChange(listener: Listener<string>) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onError(listener: Listener<{ code: string }>) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  onProgress() {
    return () => undefined;
  }
}

vi.mock('@aituber-onair/transcription', () => ({
  createRealtimeTranscriptionSession: (options: { provider: string }) =>
    new MockSession(options),
}));

type HookResult = ReturnType<typeof useVoiceInput>;

interface HarnessProps {
  mode: VoiceInputMode;
  service: VoiceInputService;
  apiKey?: string;
  busy?: boolean;
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}

let root: Root;
let container: HTMLDivElement;
let latest: HookResult;

function Harness({
  mode,
  service,
  apiKey = '',
  busy = false,
  onFinal,
  onInterim = () => undefined,
}: HarnessProps) {
  const result = useVoiceInput({
    mode,
    service,
    getApiKey: () => apiKey,
    busy,
    onInterimTranscript: onInterim,
    onFinalTranscript: onFinal,
  });
  useLayoutEffect(() => {
    latest = result;
  });
  return null;
}

const render = (props: HarnessProps) => {
  act(() => {
    root.render(<Harness {...props} />);
  });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const latestSession = () => {
  const session = MockSession.instances.at(-1);
  if (!session) throw new Error('No transcription session was created');
  return session;
};

describe('useVoiceInput', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    MockSession.instances = [];
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
  });

  it('shows connecting until the service accepts audio', async () => {
    render({
      mode: 'once',
      service: 'openai',
      apiKey: 'test-key',
      onFinal: vi.fn(),
    });

    act(() => latest.toggle());
    await flush();
    expect(latestSession().options.provider).toBe('openai-realtime');
    expect(latest.phase).toBe('connecting');

    await act(async () => {
      latestSession().connect();
      await Promise.resolve();
    });
    expect(latest.phase).toBe('listening');
  });

  it('sends a confirmed utterance once and stops listening', async () => {
    const onFinal = vi.fn();
    const onInterim = vi.fn();
    render({ mode: 'once', service: 'browser', onFinal, onInterim });

    act(() => latest.toggle());
    await flush();
    await act(async () => {
      latestSession().connect();
      await Promise.resolve();
    });

    act(() => latestSession().emitTranscript('こんにち', false));
    expect(onInterim).toHaveBeenCalledWith('こんにち');

    act(() => latestSession().emitTranscript('こんにちは', true));
    expect(onFinal).toHaveBeenCalledWith('こんにちは');
    expect(latest.phase).toBe('idle');
    expect(latest.continuousActive).toBe(false);
    expect(latestSession().stop).toHaveBeenCalled();
  });

  it('listens again in continuous mode after the reply finishes', async () => {
    vi.useFakeTimers();
    const onFinal = vi.fn();
    render({ mode: 'continuous', service: 'browser', onFinal });

    act(() => latest.toggle());
    await flush();
    await act(async () => {
      latestSession().connect();
      await Promise.resolve();
    });
    act(() => latestSession().emitTranscript('こんにちは', true));
    render({ mode: 'continuous', service: 'browser', onFinal, busy: true });
    expect(latest.continuousActive).toBe(true);

    const session = latestSession();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(session.start).toHaveBeenCalledTimes(1);

    render({ mode: 'continuous', service: 'browser', onFinal, busy: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(session.start).toHaveBeenCalledTimes(2);
    expect(latest.phase).toBe('connecting');
  });

  it('asks for a key instead of connecting when it is missing', () => {
    render({ mode: 'once', service: 'gemini', onFinal: vi.fn() });

    act(() => latest.toggle());
    expect(MockSession.instances).toHaveLength(0);
    expect(latest.notice).toEqual({ type: 'missing-key', service: 'gemini' });
  });

  it('stops continuous mode when microphone permission is denied', async () => {
    render({ mode: 'continuous', service: 'browser', onFinal: vi.fn() });

    act(() => latest.toggle());
    await flush();
    act(() => latestSession().emitError('permission-denied'));
    expect(latest.continuousActive).toBe(false);
    expect(latest.phase).toBe('idle');
    expect(latest.notice).toEqual({ type: 'permission' });
  });
});
