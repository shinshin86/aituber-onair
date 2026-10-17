// @vitest-environment jsdom

import { act, useLayoutEffect } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  LocalVoiceInputSettings,
  VoiceInputMode,
  VoiceInputService,
} from '../lib/voiceInput';
import type { RealtimeTranscriptionOptions } from '@aituber-onair/transcription';
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

  readonly options: RealtimeTranscriptionOptions;

  constructor(options: RealtimeTranscriptionOptions) {
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

vi.mock('@aituber-onair/transcription', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@aituber-onair/transcription')>();
  return {
    ...actual,
    createRealtimeTranscriptionSession: (
      options: RealtimeTranscriptionOptions,
    ) => {
      if (options.provider === 'openai-compatible') {
        actual.resolveOpenAICompatibleTranscriptionEndpoint(options.baseUrl);
      }
      return new MockSession(options);
    },
  };
});

type HookResult = ReturnType<typeof useVoiceInput>;

interface HarnessProps {
  mode: VoiceInputMode;
  service: VoiceInputService;
  apiKey?: string;
  local?: LocalVoiceInputSettings;
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
  local,
  busy = false,
  onFinal,
  onInterim = () => undefined,
}: HarnessProps) {
  const result = useVoiceInput({
    mode,
    service,
    getApiKey: () => apiKey,
    local,
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

  it.each(['browser', 'local'] as const)(
    'listens again with %s after the reply finishes',
    async (service) => {
      vi.useFakeTimers();
      const onFinal = vi.fn();
      render({
        mode: 'continuous',
        service,
        local: { baseUrl: 'http://127.0.0.1:8080', model: '', apiKey: '' },
        onFinal,
      });

      act(() => latest.toggle());
      await flush();
      await act(async () => {
        latestSession().connect();
        await Promise.resolve();
      });
      act(() => latestSession().emitTranscript('こんにちは', true));
      render({
        mode: 'continuous',
        service,
        local: { baseUrl: 'http://127.0.0.1:8080', model: '', apiKey: '' },
        onFinal,
        busy: true,
      });
      expect(latest.continuousActive).toBe(true);

      const session = latestSession();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(session.start).toHaveBeenCalledTimes(1);

      render({
        mode: 'continuous',
        service,
        local: { baseUrl: 'http://127.0.0.1:8080', model: '', apiKey: '' },
        onFinal,
        busy: false,
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(session.start).toHaveBeenCalledTimes(2);
      expect(latest.phase).toBe('connecting');
    },
  );

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

  it('starts local input without a key and emits only one final transcript', async () => {
    const onFinal = vi.fn();
    const onInterim = vi.fn();
    render({
      mode: 'once',
      service: 'local',
      onFinal,
      onInterim,
      local: {
        baseUrl: ' http://127.0.0.1:8080/v1 ',
        model: ' local-model ',
        apiKey: ' ',
      },
    });
    act(() => latest.toggle());
    await flush();
    const session = latestSession();
    expect(session.options).toEqual({
      provider: 'openai-compatible',
      baseUrl: 'http://127.0.0.1:8080/v1',
      model: 'local-model',
      language: 'ja-JP',
    });
    expect(session.options).not.toHaveProperty('auth');
    expect(latest.notice).toBeNull();
    await act(async () => session.connect());
    act(() => session.emitTranscript('途中', false));
    expect(onInterim).not.toHaveBeenCalled();
    act(() => session.emitTranscript(' こんにちは ', true));
    act(() => session.emitTranscript('duplicate', true));
    expect(onFinal).toHaveBeenCalledOnce();
    expect(onFinal).toHaveBeenCalledWith('こんにちは');
    expect(latest.phase).toBe('idle');
  });

  it('recreates local sessions after URL, model or authentication changes', async () => {
    const onFinal = vi.fn();
    const local = { baseUrl: 'http://127.0.0.1:8080', model: '', apiKey: '' };
    render({ mode: 'once', service: 'local', onFinal, local });
    act(() => latest.toggle());
    await flush();
    for (const patch of [
      { baseUrl: 'http://localhost:8081/v1' },
      { model: 'new-model' },
      { apiKey: ' local-key ' },
      { apiKey: '' },
    ]) {
      const previous = latestSession();
      act(() => latest.reset());
      Object.assign(local, patch);
      render({ mode: 'once', service: 'local', onFinal, local: { ...local } });
      act(() => latest.toggle());
      await flush();
      expect(previous.dispose).toHaveBeenCalledOnce();
      const session = latestSession();
      expect(session).not.toBe(previous);
      expect(session.options).toMatchObject({
        baseUrl: local.baseUrl,
        model: local.model || undefined,
      });
      if (session.options.provider !== 'openai-compatible')
        throw new Error('Wrong provider');
      if (local.apiKey) {
        expect(session.options.auth).toMatchObject({
          type: 'browser-api-key',
          acknowledgeBrowserKeyRisk: true,
        });
        await expect(session.options.auth?.getApiKey()).resolves.toBe(
          'local-key',
        );
      } else {
        expect(session.options).not.toHaveProperty('auth');
      }
      act(() => previous.emitTranscript('stale', true));
      expect(onFinal).not.toHaveBeenCalled();
    }
  });

  it.each(['', 'bad-url', 'https://example.test/?key=secret'])(
    'reports invalid local URL %s and stops continuous mode',
    async (baseUrl) => {
      render({
        mode: 'continuous',
        service: 'local',
        onFinal: vi.fn(),
        local: { baseUrl, model: '', apiKey: '' },
      });
      act(() => latest.toggle());
      await flush();
      expect(latest.notice).toEqual({ type: 'configuration' });
      expect(latest.continuousActive).toBe(false);
      expect(latest.phase).toBe('idle');
    },
  );

  it('limits local connection retries and reports CORS guidance', async () => {
    vi.useFakeTimers();
    render({
      mode: 'continuous',
      service: 'local',
      onFinal: vi.fn(),
      local: { baseUrl: 'http://127.0.0.1:8080', model: '', apiKey: '' },
    });
    act(() => latest.toggle());
    await flush();
    const session = latestSession();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await act(async () => session.connect());
      act(() => session.emitError('connection-failed'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(800);
      });
    }
    expect(session.start).toHaveBeenCalledTimes(3);
    expect(latest.notice).toEqual({ type: 'connection', service: 'local' });
    expect(latest.continuousActive).toBe(false);
  });
});
