import {
  createRealtimeTranscriptionSession,
  isTranscriptionProviderSupported,
  type RealtimeTranscriptionSession,
  type TranscriptUpdate,
} from '../src';

class MockMediaStreamTrack {
  stop = vi.fn();
}

class MockMediaStream {
  readonly track = new MockMediaStreamTrack();

  getTracks(): MediaStreamTrack[] {
    return [this.track as unknown as MediaStreamTrack];
  }
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioWorkletNode extends MockAudioNode {
  static instances: MockAudioWorkletNode[] = [];

  readonly port = {
    onmessage: null as ((event: MessageEvent<unknown>) => void) | null,
    postMessage: vi.fn((message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'flush'
      ) {
        this.port.onmessage?.(
          new MessageEvent('message', { data: { type: 'flushed' } })
        );
      }
    }),
  };

  constructor() {
    super();
    MockAudioWorkletNode.instances.push(this);
  }
}

class MockAudioContext {
  readonly sampleRate = 16_000;
  state: AudioContextState = 'running';
  readonly destination = new MockAudioNode();
  readonly audioWorklet = { addModule: vi.fn(async () => undefined) };
  readonly sourceNode = new MockAudioNode();
  readonly gainNode = Object.assign(new MockAudioNode(), {
    gain: { value: 1 },
  });

  createMediaStreamSource = vi.fn(() => this.sourceNode);
  createGain = vi.fn(() => this.gainNode);
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

class MockBlob {
  constructor(readonly parts: BlobPart[]) {}

  async text(): Promise<string> {
    return this.parts
      .map((part) => (typeof part === 'string' ? part : ''))
      .join('');
  }
}

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly sent: string[] = [];
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  emit(message: Record<string, unknown>): void {
    this.emitRaw(JSON.stringify(message));
  }

  emitRaw(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  fail(): void {
    this.onerror?.(new Event('error'));
  }

  emitClose(code: number, reason: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason, wasClean: false }));
  }
}

const createObjectURL = vi.fn((_blob: Blob) => 'blob:stream-worklet');
const revokeObjectURL = vi.fn((_url: string) => undefined);
let activeSessions: RealtimeTranscriptionSession[] = [];

function trackSession(
  session: RealtimeTranscriptionSession
): RealtimeTranscriptionSession {
  activeSessions.push(session);
  return session;
}

function installBrowserMocks(): MockMediaStream {
  const stream = new MockMediaStream();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => stream) },
  });
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);
  vi.stubGlobal('Blob', MockBlob);
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURL,
  });
  return stream;
}

async function openSession(socket: MockWebSocket): Promise<void> {
  socket.open();
  socket.emit({ setupComplete: {} });
  await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
}

describe('GeminiLiveTranscriptionSession', () => {
  beforeEach(() => {
    activeSessions = [];
    MockWebSocket.instances = [];
    MockAudioWorkletNode.instances = [];
    installBrowserMocks();
  });

  afterEach(async () => {
    await Promise.all(activeSessions.map((session) => session.dispose()));
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'mediaDevices');
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('connects to Gemini Live with a constrained transcription setup', async () => {
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'key with spaces',
          acknowledgeBrowserKeyRisk: true,
        },
        languages: ['ja-JP', 'en-US'],
        keywords: ['AITuber OnAir'],
        mode: 'smart',
      })
    );

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    await openSession(socket);
    await startPromise;

    expect(socket.url).toContain('BidiGenerateContent?key=key%20with%20spaces');
    expect(JSON.parse(socket.sent[0] ?? '')).toEqual({
      setup: {
        model: 'models/gemini-3.5-transcribe-live',
        generationConfig: { responseModalities: ['TEXT'] },
        inputAudioTranscription: {
          languageCodes: ['ja-JP', 'en-US'],
          customVocabulary: ['AITuber OnAir'],
          mode: 'SMART',
        },
      },
    });
    expect(session.state).toBe('listening');
    expect(session.capabilities).toEqual({
      interimResults: true,
      multipleLanguages: true,
      keywords: true,
      configurableDelay: false,
    });
  });

  it('maps interim and final server snapshots to one utterance', async () => {
    const updates: TranscriptUpdate[] = [];
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'test-key',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );
    session.onTranscript((update) => updates.push(update));

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    await openSession(socket);
    await startPromise;

    socket.emit({
      serverContent: {
        interimInputTranscription: { text: 'こんにちは' },
      },
    });
    socket.emit({
      serverContent: { inputTranscription: { text: 'こんにちは。' } },
    });

    await vi.waitFor(() =>
      expect(updates).toEqual([
        {
          utteranceId: 'gemini-live:1',
          text: 'こんにちは',
          isFinal: false,
        },
        {
          utteranceId: 'gemini-live:1',
          text: 'こんにちは。',
          isFinal: true,
        },
      ])
    );
  });

  it('accepts Blob setup messages and ArrayBuffer transcript messages', async () => {
    const updates: TranscriptUpdate[] = [];
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'test-key',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );
    session.onTranscript((update) => updates.push(update));

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    socket.open();
    socket.emitRaw(
      new Blob([JSON.stringify({ setupComplete: {} })]) as unknown as Blob
    );
    await startPromise;

    socket.emitRaw(
      new TextEncoder().encode(
        JSON.stringify({
          serverContent: { inputTranscription: { text: 'binary response' } },
        })
      ).buffer
    );

    await vi.waitFor(() =>
      expect(updates).toEqual([
        {
          utteranceId: 'gemini-live:1',
          text: 'binary response',
          isFinal: true,
        },
      ])
    );
  });

  it('streams captured audio as base64 PCM16 and finalizes on stop', async () => {
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'test-key',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    await openSession(socket);
    await startPromise;

    const worklet = MockAudioWorkletNode.instances[0];
    worklet?.port.onmessage?.(
      new MessageEvent('message', {
        data: new Float32Array(1_600).fill(0.5),
      })
    );
    const audioMessage = JSON.parse(socket.sent[1] ?? '');
    expect(audioMessage.realtimeInput.audio.mimeType).toBe(
      'audio/pcm;rate=16000'
    );
    expect(atob(audioMessage.realtimeInput.audio.data)).toHaveLength(3_200);

    await session.stop();
    expect(JSON.parse(socket.sent.at(-1) ?? '')).toEqual({
      realtimeInput: { audioStreamEnd: true },
    });
    expect(session.state).toBe('idle');
  });

  it('waits for the active final transcript before closing', async () => {
    const updates: TranscriptUpdate[] = [];
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'test-key',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );
    session.onTranscript((update) => updates.push(update));

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    await openSession(socket);
    await startPromise;
    socket.emit({
      serverContent: { interimInputTranscription: { text: 'active' } },
    });

    const stopPromise = session.stop();
    await vi.waitFor(() =>
      expect(
        socket.sent.some((value) => value.includes('audioStreamEnd'))
      ).toBe(true)
    );
    expect(session.state).toBe('stopping');
    socket.emit({
      serverContent: { inputTranscription: { text: 'active final' } },
    });
    await stopPromise;

    expect(updates.at(-1)).toEqual({
      utteranceId: 'gemini-live:1',
      text: 'active final',
      isFinal: true,
    });
    expect(session.state).toBe('idle');
  });

  it('cancels an in-flight WebSocket setup when stopped', async () => {
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'test-key',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));

    await session.stop();
    await expect(startPromise).resolves.toBeUndefined();
    expect(session.state).toBe('idle');
    expect(MockWebSocket.instances[0]?.readyState).toBe(MockWebSocket.CLOSED);
  });

  it('uses the constrained endpoint for ephemeral tokens', async () => {
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'ephemeral-token',
          getEphemeralToken: async () => 'auth_tokens/token-value',
        },
      })
    );

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    expect(socket.url).toContain(
      'BidiGenerateContentConstrained?access_token=auth_tokens%2Ftoken-value'
    );
    await openSession(socket);
    await startPromise;
  });

  it('preserves a policy close reason without assuming authentication failed', async () => {
    const errors: Array<{ code: string; message: string }> = [];
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'test-key',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );
    session.onError((error) => errors.push(error));

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    socket.open();
    socket.fail();
    socket.emitClose(
      1008,
      'Operation is not implemented, or supported, or enabled.'
    );

    await expect(startPromise).rejects.toMatchObject({
      code: 'provider-error',
      message: expect.stringContaining(
        'code 1008: Operation is not implemented, or supported, or enabled.'
      ),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'provider-error',
      message:
        'Gemini Live closed before setup completed (code 1008: Operation is not implemented, or supported, or enabled.).',
    });
  });

  it('classifies a close reason that explicitly identifies an invalid API key', async () => {
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'test-key',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    socket.open();
    socket.emitClose(1008, 'API key not valid. Please pass a valid API key.');

    await expect(startPromise).rejects.toMatchObject({
      code: 'authentication-failed',
      message: expect.stringContaining('API key not valid'),
    });
  });

  it('preserves close details after a session starts listening', async () => {
    const errors: Array<{ code: string; message: string }> = [];
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'test-key',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );
    session.onError((error) => errors.push(error));

    const startPromise = session.start();
    await vi.waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    const socket = MockWebSocket.instances[0];
    if (!socket) throw new Error('Expected a Gemini Live WebSocket.');
    await openSession(socket);
    await startPromise;

    socket.fail();
    socket.emitClose(1011, 'Temporary server failure.');

    expect(session.state).toBe('error');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: 'connection-failed',
      message:
        'The Gemini Live connection closed unexpectedly (code 1011: Temporary server failure.).',
    });
  });

  it('reports support only when WebSocket and AudioWorklet are available', () => {
    expect(isTranscriptionProviderSupported('gemini-live')).toBe(true);

    Reflect.deleteProperty(globalThis, 'AudioWorkletNode');

    expect(isTranscriptionProviderSupported('gemini-live')).toBe(false);
  });

  it('rejects more than 1,000 custom vocabulary terms', () => {
    expect(() =>
      createRealtimeTranscriptionSession({
        provider: 'gemini-live',
        auth: {
          type: 'ephemeral-token',
          getEphemeralToken: async () => 'token',
        },
        keywords: Array.from({ length: 1_001 }, (_, index) => `term-${index}`),
      })
    ).toThrow('at most 1,000 keywords');
  });
});
