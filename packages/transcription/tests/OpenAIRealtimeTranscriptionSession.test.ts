import {
  createRealtimeTranscriptionSession,
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
  return stream;
}

function createServerSession(
  getClientSecret = vi.fn(async () => 'ek_test')
): RealtimeTranscriptionSession {
  return createRealtimeTranscriptionSession({
    provider: 'openai-realtime',
    auth: { type: 'client-secret', getClientSecret },
    languages: ['ja', 'en'],
    keywords: ['AITuber OnAir'],
    prompt: 'An AITuber livestream.',
    delay: 'low',
  });
}

function emitVadDisabled(peer: MockPeerConnection | undefined): void {
  peer?.channel.emit({
    type: 'session.updated',
    session: {
      type: 'transcription',
      audio: {
        input: {
          turn_detection: null,
        },
      },
    },
  });
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
    MockPeerConnection.instances = [];
    MockPeerConnection.openDataChannelOnRemoteDescription = true;
    installBrowserMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sdpResponse())
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'mediaDevices');
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
            turn_detection: { type: 'server_vad' },
          },
        },
      },
    });
    expect(session.state).toBe('listening');
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
    const session = createRealtimeTranscriptionSession({
      provider: 'openai-realtime',
      auth: {
        type: 'browser-api-key',
        getApiKey,
        acknowledgeBrowserKeyRisk: true,
      },
      languages: ['ja'],
    });

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
  });

  it('returns a typed direct-mint error and never falls back', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const session = createRealtimeTranscriptionSession({
      provider: 'openai-realtime',
      auth: {
        type: 'browser-api-key',
        getApiKey: async () => 'sk-rejected',
        acknowledgeBrowserKeyRisk: true,
      },
    });

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
    const stopPromise = session.stop();
    emitVadDisabled(peer);
    peer?.channel.emit({
      type: 'input_audio_buffer.committed',
      item_id: 'stop-item',
    });
    peer?.channel.emit({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'stop-item',
      transcript: '',
    });
    await stopPromise;

    expect(getClientSecret).toHaveBeenCalledOnce();
    expect(MockPeerConnection.instances).toHaveLength(1);
    expect(sentEvents(peer)).toContainEqual({
      type: 'input_audio_buffer.commit',
      event_id: expect.stringMatching(/^transcription-stop-commit-/),
    });
    expect(stream.track.stop).toHaveBeenCalled();
    expect(peer?.channel.close).toHaveBeenCalled();
    expect(peer?.close).toHaveBeenCalled();
    expect(session.state).toBe('idle');
  });

  it('requests fresh credentials after a stopped session restarts', async () => {
    const getClientSecret = vi.fn(async () => 'ek_test');
    const session = createServerSession(getClientSecret);

    await session.start();
    const firstPeer = MockPeerConnection.instances[0];
    const firstStop = session.stop();
    const restart = session.start();
    expect(MockPeerConnection.instances).toHaveLength(1);
    emitVadDisabled(firstPeer);
    firstPeer?.channel.emit({
      type: 'input_audio_buffer.committed',
      item_id: 'restart-item',
    });
    firstPeer?.channel.emit({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'restart-item',
      transcript: '',
    });
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

    const stopPromise = session.stop();
    emitVadDisabled(peer);
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

  it('does not confuse a server-VAD commit with the explicit stop commit', async () => {
    const session = createServerSession();
    await session.start();
    const peer = MockPeerConnection.instances[0];

    const stopPromise = session.stop();
    peer?.channel.emit({
      type: 'input_audio_buffer.committed',
      item_id: 'automatic-vad-item',
    });
    peer?.channel.emit({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'automatic-vad-item',
      transcript: '自動確定',
    });
    await Promise.resolve();

    expect(
      sentEvents(peer).filter(
        (event) => event.type === 'input_audio_buffer.commit'
      )
    ).toHaveLength(0);
    expect(peer?.close).not.toHaveBeenCalled();

    emitVadDisabled(peer);
    const commitEvent = sentEvents(peer).find(
      (event) => event.type === 'input_audio_buffer.commit'
    );
    expect(commitEvent?.event_id).toEqual(expect.any(String));
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
  });

  it('uses a bounded fallback when stop finalization events never arrive', async () => {
    vi.useFakeTimers();
    try {
      const session = createServerSession();
      await session.start();
      const peer = MockPeerConnection.instances[0];

      const stopPromise = session.stop();
      await vi.advanceTimersByTimeAsync(10_000);
      await stopPromise;

      expect(peer?.close).toHaveBeenCalledOnce();
      expect(session.state).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not commit if disabling server VAD fails', async () => {
    vi.useFakeTimers();
    try {
      const session = createServerSession();
      await session.start();
      const peer = MockPeerConnection.instances[0];

      const stopPromise = session.stop();
      const vadUpdateEvent = sentEvents(peer).find(
        (event) =>
          event.type === 'session.update' && typeof event.event_id === 'string'
      );
      peer?.channel.emit({
        type: 'error',
        error: {
          message: 'Could not disable server VAD.',
          event_id: vadUpdateEvent?.event_id,
        },
      });

      expect(
        sentEvents(peer).filter(
          (event) => event.type === 'input_audio_buffer.commit'
        )
      ).toHaveLength(0);
      expect(peer?.close).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(10_000);
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
