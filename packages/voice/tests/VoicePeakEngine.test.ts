import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoicePeakEngine } from '../src/engines/VoicePeakEngine';

describe('VoicePeakEngine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createFetchMock() {
    return vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => ({
          arrayBuffer: async () => new ArrayBuffer(8),
        }),
      });
  }

  function getAudioQueryEmotion(fetchMock: ReturnType<typeof createFetchMock>) {
    const [queryUrl] = fetchMock.mock.calls[0];
    return new URL(queryUrl).searchParams.get('emotion');
  }

  function getAudioQueryParams(fetchMock: ReturnType<typeof createFetchMock>) {
    const [queryUrl] = fetchMock.mock.calls[0];
    return new URL(queryUrl).searchParams;
  }

  function getSynthesisBody(fetchMock: ReturnType<typeof createFetchMock>) {
    const [, synthesisConfig] = fetchMock.mock.calls[1];
    return JSON.parse(synthesisConfig.body);
  }

  async function fetchAudio(
    engine: VoicePeakEngine,
    talk: { message: string; style: string } = {
      message: 'テストです',
      style: 'talk',
    },
  ) {
    await engine.fetchAudio(talk as any, 'f1');
  }

  it('should keep backward compatibility for explicit single-tag emotion', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    engine.setEmotion('happy');
    await fetchAudio(engine);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getAudioQueryEmotion(fetchMock)).toBe('happy');
    expect(getSynthesisBody(fetchMock).emotion).toBe('happy');
  });

  it('should omit neutral single-tag emotion override', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    engine.setEmotion('neutral');
    await fetchAudio(engine);

    expect(getAudioQueryParams(fetchMock).has('emotion')).toBe(false);
    expect(getSynthesisBody(fetchMock)).not.toHaveProperty('emotion');
  });

  it('should map talk.style when no override is provided', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    await fetchAudio(engine, {
      message: 'うれしいです',
      style: 'happy',
    });

    expect(getAudioQueryEmotion(fetchMock)).toBe('happy');
    expect(getSynthesisBody(fetchMock).emotion).toBe('happy');
  });

  it('should omit emotion when talk.style resolves to neutral', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    await fetchAudio(engine, {
      message: '通常の読み上げです',
      style: 'talk',
    });

    expect(getAudioQueryParams(fetchMock).has('emotion')).toBe(false);
    expect(getSynthesisBody(fetchMock)).not.toHaveProperty('emotion');
  });

  it('should serialize weighted emotions', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    engine.setEmotion({ happy: 40, fun: 60 });
    await fetchAudio(engine);

    expect(getAudioQueryEmotion(fetchMock)).toBe('happy=40,fun=60');
    expect(getSynthesisBody(fetchMock).emotion).toBe('happy=40,fun=60');
  });

  it('should ignore neutral weights during serialization', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    engine.setEmotion({ neutral: 50, happy: 50 });
    await fetchAudio(engine);

    expect(getAudioQueryEmotion(fetchMock)).toBe('happy=50');
    expect(getSynthesisBody(fetchMock).emotion).toBe('happy=50');
  });

  it('should ignore zero weights during serialization', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    engine.setEmotion({ happy: 0, fun: 60 });
    await fetchAudio(engine);

    expect(getAudioQueryEmotion(fetchMock)).toBe('fun=60');
    expect(getSynthesisBody(fetchMock).emotion).toBe('fun=60');
  });

  it('should omit emotion when an empty override is provided', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    engine.setEmotion({});
    await fetchAudio(engine, {
      message: 'emotion なし',
      style: 'happy',
    });

    expect(getAudioQueryParams(fetchMock).has('emotion')).toBe(false);
    expect(getSynthesisBody(fetchMock)).not.toHaveProperty('emotion');
  });

  it('should clear override and fall back to talk.style mapping', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    engine.setEmotion({ happy: 40, fun: 60 });
    engine.setEmotion(undefined);
    await fetchAudio(engine, {
      message: 'かなしいです',
      style: 'sad',
    });

    expect(getAudioQueryEmotion(fetchMock)).toBe('sad');
    expect(getSynthesisBody(fetchMock).emotion).toBe('sad');
  });

  it('should validate weighted emotion values before issuing fetch', () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    expect(() => engine.setEmotion({ happy: -1 })).toThrow(
      'VoicePeak emotion weight for "happy" must be between 0 and 100, got -1.',
    );
    expect(() => engine.setEmotion({ happy: 101 })).toThrow(
      'VoicePeak emotion weight for "happy" must be between 0 and 100, got 101.',
    );
    expect(() => engine.setEmotion({ happy: 40.5 })).toThrow(
      'VoicePeak emotion weight for "happy" must be an integer, got 40.5.',
    );
    expect(() => engine.setEmotion({ happy: 70, fun: 40 })).toThrow(
      'VoicePeak emotion weights must sum to 100 or less (neutral excluded), got 110.',
    );
    expect(() => engine.setEmotion({ xyz: 40 } as any)).toThrow(
      'VoicePeak emotion weights contain an unknown key "xyz". Valid keys: happy, fun, angry, sad, neutral, surprised.',
    );
    expect(() => engine.setEmotion({ happy: 70, neutral: 50 })).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should combine weighted emotion with speed and pitch overrides', async () => {
    const engine = new VoicePeakEngine();
    const fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as any;

    engine.setEmotion({ happy: 40, fun: 60 });
    engine.setSpeed(120);
    engine.setPitch(-50);
    await fetchAudio(engine);

    const queryParams = getAudioQueryParams(fetchMock);
    const synthesisBody = getSynthesisBody(fetchMock);

    expect(queryParams.get('emotion')).toBe('happy=40,fun=60');
    expect(queryParams.get('speed')).toBe('120');
    expect(queryParams.get('pitch')).toBe('-50');
    expect(synthesisBody.emotion).toBe('happy=40,fun=60');
    expect(synthesisBody.speed).toBe(120);
    expect(synthesisBody.pitch).toBe(-50);
  });
});
