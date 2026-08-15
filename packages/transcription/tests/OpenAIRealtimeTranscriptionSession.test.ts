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

  getAudioTracks(): MediaStreamTrack[] {
    return [this.track as unknown as MediaStreamTrack];
  }

  getTracks(): MediaStreamTrack[] {
    return [this.track as unknown as MediaStreamTrack];
  }
}

class MockMediaStreamAudioSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAnalyserNode {
  fftSize = 2048;
  smoothingTimeConstant = 0;
  disconnect = vi.fn();

  getFloatTimeDomainData(samples: Float32Array): void {
    samples.fill(MockAudioContext.inputLevel);
  }
}

class MockAudioContext {
  static inputLevel = 0;
  static instances: MockAudioContext[] = [];

  state: AudioContextState = 'running';
  readonly sourceNode = new MockMediaStreamAudioSourceNode();
  readonly analyserNode = new MockAnalyserNode();
  createMediaStreamSource = vi.fn(() => this.sourceNode);
  createAnalyser = vi.fn(() => this.analyserNode);
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });

  constructor() {
    MockAudioContext.instances.push(this);
  }
}

class MockDataChannel extends EventTarget {
  readyState: RTCDataChannelState = 'connecting';
  sent: string[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  close = vi.fn(() => {
    this.emitClose();
  });

  send(data: string): void {
    this.sent.push(data);
  }

  open(): void {
    this.readyState = 'open';
    this.dispatchEvent(new Event('open'));
  }

  emitClose(): void {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    this.dispatchEvent(new Event('close'));
    this.onclose?.();
  }

  emit(event: Record<string, unknown>): void {
    this.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify(event) })
    );
  }
}

class MockPeerConnection extends EventTarget {
  static instances: MockPeerConnection[] = [];
  static openDataChannelOnRemoteDescription = true;

  readonly channel = new MockDataChannel();
  connectionState: RTCPeerConnectionState = 'new';
  onconnectionstatechange: (() => void) | null = null;
  addTrack = vi.fn();
  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'offer-sdp' }));
  setLocalDescription = vi.fn(async () => undefined);
  setRemoteDescription = vi.fn(async () => {
    this.connectionState = 'connected';
    this.dispatchEvent(new Event('connectionstatechange'));
    if (MockPeerConnection.openDataChannelOnRemoteDescription) {
      this.channel.open();
    }
  });
  createDataChannel = vi.fn(() => this.channel);
  close = vi.fn(() => {
    this.connectionState = 'closed';
  });

  constructor() {
    super();
    MockPeerConnection.instances.push(this);
  }
}

const sdpResponse = () =>
  new Response('answer-sdp', {
    status: 200,
    headers: { 'Content-Type': 'application/sdp' },
  });

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
    value: {
      getUserMedia: vi.fn(async () => stream),
    },
  });
  Object.defineProperty(globalThis, 'RTCPeerConnection', {
    configurable: true,
    value: MockPeerConnection,
  });
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true,
    value: MockAudioContext,
  });
  return stream;
}

function createServerSession(
  getClientSecret = vi.fn(async () => 'ek_test')
): RealtimeTranscriptionSession {
  return trackSession(
    createRealtimeTranscriptionSession({
      provider: 'openai-realtime',
      auth: { type: 'client-secret', getClientSecret },
      languages: ['ja', 'en'],
      keywords: ['AITuber OnAir'],
      prompt: 'An AITuber livestream.',
      delay: 'low',
    })
  );
}

function sentEvents(
  peer: MockPeerConnection | undefined
): Array<Record<string, unknown>> {
  return (
    peer?.channel.sent.map(
      (value) => JSON.parse(value) as Record<string, unknown>
    ) ?? []
  );
}

describe('OpenAIRealtimeTranscriptionSession', () => {
  beforeEach(() => {
    activeSessions = [];
    MockPeerConnection.instances = [];
    MockPeerConnection.openDataChannelOnRemoteDescription = true;
    MockAudioContext.instances = [];
    MockAudioContext.inputLevel = 0;
    installBrowserMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sdpResponse())
    );
  });

  afterEach(async () => {
    await Promise.all(activeSessions.map((session) => session.dispose()));
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'mediaDevices');
    Reflect.deleteProperty(globalThis, 'AudioContext');
  });

  it('opens WebRTC and sends a constrained transcription session update', async () => {
    const session = createServerSession();

    await session.start();

    const peer = MockPeerConnection.instances[0];
    const events = peer?.channel.sent.map((value) => JSON.parse(value));
    expect(events).toContainEqual({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            transcription: {
              model: 'gpt-live-transcribe',
              languages: ['ja', 'en'],
              keywords: ['AITuber OnAir'],
              prompt: 'An AITuber livestream.',
              delay: 'low',
            },
            turn_detection: null,
          },
        },
      },
    });
    expect(session.state).toBe('listening');
  });

  it('reports OpenAI as unsupported without the Web Audio API', async () => {
    Reflect.deleteProperty(globalThis, 'AudioContext');
    const getClientSecret = vi.fn(async () => 'ek_test');
    const session = createServerSession(getClientSecret);

    expect(isTranscriptionProviderSupported('openai-realtime')).toBe(false);
    await expect(session.start()).rejects.toMatchObject({
      code: 'unsupported-provider',
    });
    expect(getClientSecret).not.toHaveBeenCalled();
  });

  it('accumulates deltas by item ID and lets finals replace snapshots', async () => {
    const session = createServerSession();
    const updates: TranscriptUpdate[] = [];
    session.onTranscript((update) => updates.push(update));
    await session.start();
    const channel = MockPeerConnection.instances[0]?.channel;

    channel?.emit({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item-b',
      delta: 'Good ',
    });
    channel?.emit({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item-a',
      delta: 'こん',
    });
    channel?.emit({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item-a',
      delta: 'にちは',
    });
    channel?.emit({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-a',
      transcript: 'こんにちは。',
    });
    channel?.emit({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-b',
      transcript: 'Good morning.',
    });

    expect(updates).toEqual([
      { utteranceId: 'item-b', text: 'Good ', isFinal: false },
      { utteranceId: 'item-a', text: 'こん', isFinal: false },
      { utteranceId: 'item-a', text: 'こんにちは', isFinal: false },
      { utteranceId: 'item-a', text: 'こんにちは。', isFinal: true },
      { utteranceId: 'item-b', text: 'Good morning.', isFinal: true },
    ]);
  });

  it('emits a final even when no delta arrived first', async () => {
    const session = createServerSession();
    const updates: TranscriptUpdate[] = [];
    session.onTranscript((update) => updates.push(update));
    await session.start();

    MockPeerConnection.instances[0]?.channel.emit({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-final-only',
      transcript: 'Final only.',
    });

    expect(updates).toEqual([
      {
        utteranceId: 'item-final-only',
        text: 'Final only.',
        isFinal: true,
      },
    ]);
  });

  it('mints a fresh browser-BYOK client secret without fallback', async () => {
    const getApiKey = vi.fn(async () => 'sk-user-owned');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: 'ek_fresh' }), { status: 200 })
      )
      .mockResolvedValueOnce(sdpResponse());
    vi.stubGlobal('fetch', fetchMock);
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'openai-realtime',
        auth: {
          type: 'browser-api-key',
          getApiKey,
          acknowledgeBrowserKeyRisk: true,
        },
        languages: ['ja'],
      })
    );

    await session.start();

    expect(getApiKey).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.openai.com/v1/realtime/client_secrets',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.openai.com/v1/realtime/calls',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer ek_fresh' }),
      })
    );
    const mintBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(mintBody.expires_after).toEqual({
      anchor: 'created_at',
      seconds: 600,
    });
    expect(mintBody.session.audio.input).toMatchObject({
      transcription: {
        model: 'gpt-live-transcribe',
        languages: ['ja'],
      },
      turn_detection: null,
    });
  });

  it('returns a typed direct-mint error and never falls back', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const session = trackSession(
      createRealtimeTranscriptionSession({
        provider: 'openai-realtime',
        auth: {
          type: 'browser-api-key',
          getApiKey: async () => 'sk-rejected',
          acknowledgeBrowserKeyRisk: true,
        },
      })
    );

    await expect(session.start()).rejects.toMatchObject({
      code: 'authentication-failed',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(session.state).toBe('error');
  });

  it('reuses an in-flight start and releases every owned browser resource', async () => {
    const getClientSecret = vi.fn(async () => 'ek_test');
    const stream = installBrowserMocks();
    const session = createServerSession(getClientSecret);

    await Promise.all([session.start(), session.start()]);
    const peer = MockPeerConnection.instances[0];
    await session.stop();

    expect(getClientSecret).toHaveBeenCalledOnce();
    expect(MockPeerConnection.instances).toHaveLength(1);
    expect(
      sentEvents(peer).filter(
        (event) => event.type === 'input_audio_buffer.commit'
      )
    ).toHaveLength(0);
    expect(stream.track.stop).toHaveBeenCalled();
    expect(MockAudioContext.instances[0]?.close).toHaveBeenCalled();
    expect(peer?.channel.close).toHaveBeenCalled();
    expect(peer?.close).toHaveBeenCalled();
    expect(session.state).toBe('idle');
  });

  it('requests fresh credentials after a stopped session restarts', async () => {
    const getClientSecret = vi.fn(async () => 'ek_test');
    const session = createServerSession(getClientSecret);

    await session.start();
    const firstStop = session.stop();
    const restart = session.start();
    expect(MockPeerConnection.instances).toHaveLength(1);
    await Promise.all([firstStop, restart]);

    expect(getClientSecret).toHaveBeenCalledTimes(2);
    expect(MockPeerConnection.instances).toHaveLength(2);
    expect(session.state).toBe('listening');
    await session.dispose();
  });

  it('waits for the final committed item before closing on stop', async () => {
    const session = createServerSession();
    const updates: TranscriptUpdate[] = [];
    session.onTranscript((update) => updates.push(update));
    await session.start();
    const peer = MockPeerConnection.instances[0];
    peer?.channel.emit({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'final-item',
      delta: '最後の',
    });

    const stopPromise = session.stop();
    const commitEvent = sentEvents(peer).find(
      (event) => event.type === 'input_audio_buffer.commit'
    );
    expect(commitEvent?.event_id).toMatch(/^transcription-stop-commit-/);
    peer?.channel.emit({
      type: 'input_audio_buffer.committed',
      item_id: 'final-item',
    });
    await Promise.resolve();
    expect(peer?.close).not.toHaveBeenCalled();

    peer?.channel.emit({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'final-item',
      transcript: '最後の発話',
    });
    await stopPromise;

    expect(updates).toContainEqual({
      utteranceId: 'final-item',
      text: '最後の発話',
      isFinal: true,
    });
    expect(peer?.close).toHaveBeenCalledOnce();
  });

  it('commits a confirmed speech turn after sustained silence', async () => {
    vi.useFakeTimers();
    try {
      const session = createServerSession();
      await session.start();
      const peer = MockPeerConnection.instances[0];

      MockAudioContext.inputLevel = 0.05;
      await vi.advanceTimersByTimeAsync(100);
      MockAudioContext.inputLevel = 0;
      await vi.advanceTimersByTimeAsync(800);
      expect(
        sentEvents(peer).filter(
          (event) => event.type === 'input_audio_buffer.commit'
        )
      ).toHaveLength(0);

      MockAudioContext.inputLevel = 0.05;
      await vi.advanceTimersByTimeAsync(250);
      MockAudioContext.inputLevel = 0;
      await vi.advanceTimersByTimeAsync(800);

      const commitEvents = sentEvents(peer).filter(
        (event) => event.type === 'input_audio_buffer.commit'
      );
      expect(commitEvents).toEqual([
        {
          type: 'input_audio_buffer.commit',
          event_id: expect.stringMatching(/^transcription-vad-commit-/),
        },
      ]);

      peer?.channel.emit({
        type: 'conversation.item.input_audio_transcription.delta',
        item_id: 'client-vad-item',
        delta: '自動',
      });
      peer?.channel.emit({
        type: 'input_audio_buffer.committed',
        item_id: 'client-vad-item',
      });
      const stopPromise = session.stop();
      expect(
        sentEvents(peer).filter(
          (event) => event.type === 'input_audio_buffer.commit'
        )
      ).toHaveLength(1);
      expect(peer?.close).not.toHaveBeenCalled();

      peer?.channel.emit({
        type: 'conversation.item.input_audio_transcription.completed',
        item_id: 'client-vad-item',
        transcript: '自動確定',
      });
      await stopPromise;
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses a bounded fallback when stop finalization events never arrive', async () => {
    vi.useFakeTimers();
    try {
      const session = createServerSession();
      await session.start();
      const peer = MockPeerConnection.instances[0];
      peer?.channel.emit({
        type: 'conversation.item.input_audio_transcription.delta',
        item_id: 'pending-item',
        delta: '未確定',
      });

      const stopPromise = session.stop();
      await vi.advanceTimersByTimeAsync(10_000);
      await stopPromise;

      expect(peer?.close).toHaveBeenCalledOnce();
      expect(session.state).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('finishes stopping when the final client commit is rejected', async () => {
    vi.useFakeTimers();
    try {
      const session = createServerSession();
      await session.start();
      const peer = MockPeerConnection.instances[0];

      MockAudioContext.inputLevel = 0.05;
      await vi.advanceTimersByTimeAsync(250);

      const stopPromise = session.stop();
      const commitEvent = sentEvents(peer).find(
        (event) => event.type === 'input_audio_buffer.commit'
      );
      peer?.channel.emit({
        type: 'error',
        error: {
          message: 'Input audio buffer is empty.',
          event_id: commitEvent?.event_id,
        },
      });
      await stopPromise;

      expect(peer?.close).toHaveBeenCalledOnce();
      expect(session.state).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('releases stop finalization immediately if the transport closes', async () => {
    const session = createServerSession();
    await session.start();
    const peer = MockPeerConnection.instances[0];
    peer?.channel.emit({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'closing-item',
      delta: '接続終了',
    });

    const stopPromise = session.stop();
    peer?.channel.emitClose();
    await stopPromise;

    expect(peer?.close).toHaveBeenCalledOnce();
    expect(session.state).toBe('idle');
  });

  it('rejects once without waiting for timeout if the data channel closes while connecting', async () => {
    MockPeerConnection.openDataChannelOnRemoteDescription = false;
    const session = createServerSession();
    const errors = vi.fn();
    session.onError(errors);

    const startPromise = session.start();
    await vi.waitFor(() => {
      expect(
        MockPeerConnection.instances[0]?.setRemoteDescription
      ).toHaveBeenCalledOnce();
    });
    MockPeerConnection.instances[0]?.channel.emitClose();

    await expect(startPromise).rejects.toMatchObject({
      code: 'connection-failed',
    });
    expect(errors).toHaveBeenCalledOnce();
    expect(session.state).toBe('error');
  });

  it('can queue a fresh start while an earlier connection is being stopped', async () => {
    MockPeerConnection.openDataChannelOnRemoteDescription = false;
    const session = createServerSession();
    const errors = vi.fn();
    session.onError(errors);

    const initialStart = session.start();
    await vi.waitFor(() => {
      expect(
        MockPeerConnection.instances[0]?.setRemoteDescription
      ).toHaveBeenCalledOnce();
    });

    const stopPromise = session.stop();
    MockPeerConnection.openDataChannelOnRemoteDescription = true;
    const restartPromise = session.start();
    await Promise.all([initialStart, stopPromise, restartPromise]);

    expect(MockPeerConnection.instances).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
    expect(session.state).toBe('listening');
  });

  it('keeps disposed state when disposal closes a channel that is still connecting', async () => {
    MockPeerConnection.openDataChannelOnRemoteDescription = false;
    const session = createServerSession();
    const errors = vi.fn();
    session.onError(errors);

    const startPromise = session.start();
    await vi.waitFor(() => {
      expect(
        MockPeerConnection.instances[0]?.setRemoteDescription
      ).toHaveBeenCalledOnce();
    });
    await session.dispose();

    await expect(startPromise).rejects.toMatchObject({
      code: 'session-disposed',
    });
    expect(errors).not.toHaveBeenCalled();
    expect(session.state).toBe('disposed');
  });

  it('disposes safely while client-secret retrieval is in flight', async () => {
    let resolveClientSecret: ((value: string) => void) | undefined;
    const session = createServerSession(
      vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveClientSecret = resolve;
          })
      )
    );

    const startPromise = session.start();
    await Promise.resolve();
    await session.dispose();
    resolveClientSecret?.('ek_late');

    await expect(startPromise).rejects.toMatchObject({
      code: 'session-disposed',
    });
    expect(session.state).toBe('disposed');
    expect(MockPeerConnection.instances).toHaveLength(0);
  });

  it('normalizes microphone permission denial', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        }),
      },
    });
    const session = createServerSession();

    await expect(session.start()).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});
