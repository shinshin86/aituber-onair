import {
  createRealtimeTranscriptionSession,
  TranscriptionSessionError,
  type TranscriptUpdate,
  type TranscriptionState,
} from '../src';

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];

  continuous = false;
  interimResults = false;
  lang = '';
  onresult:
    | ((event: {
        resultIndex: number;
        results: RecognitionResult[];
      }) => void)
    | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }

  emitResults(resultIndex: number, results: RecognitionResult[]): void {
    this.onresult?.({ resultIndex, results });
  }

  emitError(error: string): void {
    this.onerror?.({ error });
  }

  emitEnd(): void {
    this.onend?.();
  }
}

describe('WebSpeechTranscriptionSession', () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = [];
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'SpeechRecognition');
    Reflect.deleteProperty(window, 'webkitSpeechRecognition');
  });

  it('normalizes interim and final results with one stable utterance ID', async () => {
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: 'ja-JP',
    });
    const updates: TranscriptUpdate[] = [];
    const states: TranscriptionState[] = [];
    session.onTranscript((update) => updates.push(update));
    session.onStateChange((state) => states.push(state));

    await session.start();
    const recognition = MockSpeechRecognition.instances[0];
    expect(recognition).toBeDefined();
    expect(recognition?.lang).toBe('ja-JP');
    expect(recognition?.continuous).toBe(true);

    recognition?.emitResults(0, [
      { isFinal: false, 0: { transcript: 'こんにちは' } },
    ]);
    recognition?.emitResults(0, [
      { isFinal: true, 0: { transcript: 'こんにちは！' } },
    ]);

    expect(updates).toEqual([
      {
        utteranceId: 'web-speech:1:0',
        text: 'こんにちは',
        isFinal: false,
      },
      {
        utteranceId: 'web-speech:1:0',
        text: 'こんにちは！',
        isFinal: true,
      },
    ]);
    expect(states).toEqual(['connecting', 'listening']);
  });

  it('does not create a second recognition object for repeated start calls', async () => {
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: 'ja-JP',
    });

    await Promise.all([session.start(), session.start()]);

    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(MockSpeechRecognition.instances[0]?.start).toHaveBeenCalledTimes(1);
  });

  it('moves to idle when the browser ends recognition without restarting', async () => {
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: 'ja-JP',
    });
    await session.start();

    MockSpeechRecognition.instances[0]?.emitEnd();

    expect(session.state).toBe('idle');
    expect(MockSpeechRecognition.instances).toHaveLength(1);
  });

  it('reuses an in-flight stop and lets listeners unsubscribe', async () => {
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: 'ja-JP',
    });
    const listener = vi.fn();
    const unsubscribe = session.onTranscript(listener);
    await session.start();
    unsubscribe();
    const recognition = MockSpeechRecognition.instances[0];
    recognition?.emitResults(0, [
      { isFinal: true, 0: { transcript: 'ignored' } },
    ]);

    const firstStop = session.stop();
    const secondStop = session.stop();
    expect(secondStop).toBe(firstStop);
    recognition?.emitEnd();
    await Promise.all([firstStop, secondStop]);

    expect(listener).not.toHaveBeenCalled();
    expect(recognition?.stop).toHaveBeenCalledOnce();
    expect(session.state).toBe('idle');
  });

  it('waits for an in-flight stop before starting a new recognition', async () => {
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: 'ja-JP',
    });
    await session.start();
    const firstRecognition = MockSpeechRecognition.instances[0];

    const stopPromise = session.stop();
    const restartPromise = session.start();
    expect(MockSpeechRecognition.instances).toHaveLength(1);

    firstRecognition?.emitEnd();
    await Promise.all([stopPromise, restartPromise]);

    expect(MockSpeechRecognition.instances).toHaveLength(2);
    expect(MockSpeechRecognition.instances[1]?.start).toHaveBeenCalledOnce();
    expect(session.state).toBe('listening');
  });

  it('normalizes permission and no-speech errors', async () => {
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: 'ja-JP',
    });
    const errors: string[] = [];
    session.onError((error) => errors.push(error.code));
    await session.start();

    MockSpeechRecognition.instances[0]?.emitError('no-speech');

    expect(errors).toEqual(['no-speech']);
    expect(session.state).toBe('error');
  });

  it('rejects unsupported environments with a typed error', async () => {
    Reflect.deleteProperty(window, 'SpeechRecognition');
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: 'ja-JP',
    });

    await expect(session.start()).rejects.toMatchObject({
      code: 'unsupported-provider',
      provider: 'web-speech',
    });
  });

  it('disposes owned recognition and rejects a later start', async () => {
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: 'ja-JP',
    });
    await session.start();
    const recognition = MockSpeechRecognition.instances[0];

    await session.dispose();

    expect(recognition?.abort).toHaveBeenCalledOnce();
    expect(session.state).toBe('disposed');
    expect(() => session.start()).toThrow(TranscriptionSessionError);
  });
});
