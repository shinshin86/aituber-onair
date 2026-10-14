import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceEngine } from '../src/engines/VoiceEngine';
import { VoiceEngineFactory } from '../src/engines/VoiceEngineFactory';
import { VoiceEngineAdapter } from '../src/services/VoiceEngineAdapter';
import { AudioPlayerFactory } from '../src/services/audio/AudioPlayerFactory';

describe('VoiceEngineAdapter empty audio', () => {
  let completePlayback: () => void;
  const player = {
    play: vi.fn<[ArrayBuffer, string?], Promise<void>>(),
    stop: vi.fn(),
    isPlaying: vi.fn(() => false),
    setOnComplete: vi.fn((callback: () => void) => {
      completePlayback = callback;
    }),
    dispose: vi.fn(),
  };

  const stubEngine = (audio: ArrayBuffer) => {
    const engine: VoiceEngine = {
      fetchAudio: vi.fn().mockResolvedValue(audio),
      getTestMessage: () => 'Test speech',
    };
    vi.spyOn(VoiceEngineFactory, 'getEngine').mockReturnValue(engine);
    return engine;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    completePlayback = () => undefined;
    player.play.mockImplementation(async () => completePlayback());
    vi.spyOn(AudioPlayerFactory, 'createAudioPlayer').mockReturnValue(player);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(['none', 'openai'] as const)('%s engine', (engineType) => {
    it.each(['speak', 'speakText'] as const)(
      '%s skips the player and completes once for empty audio',
      async (method) => {
        // Use the actual NoneEngine; other engines may also return no audio.
        if (engineType === 'openai') stubEngine(new ArrayBuffer(0));
        const onComplete = vi.fn();
        const adapter = new VoiceEngineAdapter({
          engineType,
          speaker: 'test-speaker',
          onComplete,
        });

        const speech =
          method === 'speak'
            ? adapter.speak({ text: 'Silent speech', emotion: 'happy' })
            : adapter.speakText('[happy] Silent speech');

        await expect(speech).resolves.toBeUndefined();
        expect(player.play).not.toHaveBeenCalled();
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(adapter.isPlaying()).toBe(false);
      },
    );

    it.each(['speak', 'speakText'] as const)(
      '%s skips custom playback and completes once for empty audio',
      async (method) => {
        if (engineType === 'openai') stubEngine(new ArrayBuffer(0));
        const onComplete = vi.fn();
        const onPlay = vi.fn(async () => onComplete());
        const adapter = new VoiceEngineAdapter({
          engineType,
          speaker: 'test-speaker',
          onPlay,
          onComplete,
        });

        const speech =
          method === 'speak'
            ? adapter.speak({ text: 'Silent speech' })
            : adapter.speakText('Silent speech');

        await expect(speech).resolves.toBeUndefined();
        expect(onPlay).not.toHaveBeenCalled();
        expect(player.play).not.toHaveBeenCalled();
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
    );
  });

  it('resolves without an optional completion callback', async () => {
    const adapter = new VoiceEngineAdapter({ engineType: 'none', speaker: '' });

    await expect(adapter.speakText('Silent speech')).resolves.toBeUndefined();

    expect(player.play).not.toHaveBeenCalled();
  });

  it('still delegates non-empty audio to the player and its completion callback', async () => {
    const audio = new ArrayBuffer(4);
    stubEngine(audio);
    const onComplete = vi.fn();
    const adapter = new VoiceEngineAdapter({
      engineType: 'openai',
      speaker: 'test-speaker',
      onComplete,
    });

    await adapter.speakText('Audible speech', { audioElementId: 'voice' });

    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledWith(audio, 'voice');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'still leaves non-empty custom playback completion to onPlay (reports completion: %s)',
    async (reportsCompletion) => {
      const audio = new ArrayBuffer(4);
      stubEngine(audio);
      const onComplete = vi.fn();
      const onPlay = vi.fn(async () => {
        if (reportsCompletion) onComplete();
      });
      const adapter = new VoiceEngineAdapter({
        engineType: 'openai',
        speaker: 'test-speaker',
        onPlay,
        onComplete,
      });
      const options = { audioElementId: 'voice' };

      await adapter.speakText('Audible speech', options);

      expect(onPlay).toHaveBeenCalledTimes(1);
      expect(onPlay).toHaveBeenCalledWith(audio, options);
      expect(player.play).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledTimes(reportsCompletion ? 1 : 0);
    },
  );

  it('keeps prefetched empty and non-empty requests in order without blocking the queue', async () => {
    const audio = new ArrayBuffer(4);
    const engine = stubEngine(audio);
    let finishFirst: (audio: ArrayBuffer) => void = () => undefined;
    vi.mocked(engine.fetchAudio).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
    );
    const events: string[] = [];
    const onComplete = vi.fn(() => {
      events.push('complete');
    });
    const onPlay = vi.fn(async () => {
      events.push('play');
      onComplete();
    });
    const adapter = new VoiceEngineAdapter({
      engineType: 'openai',
      speaker: 'test-speaker',
      onPlay,
      onComplete,
    });

    const first = adapter.speakText('Silent first');
    const second = adapter.speak({ text: 'Audible second' });
    await vi.waitFor(() => expect(engine.fetchAudio).toHaveBeenCalledTimes(2));
    expect(onPlay).not.toHaveBeenCalled();
    finishFirst(new ArrayBuffer(0));
    await Promise.all([first, second]);

    expect(events).toEqual(['complete', 'play', 'complete']);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith(audio, undefined);
    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(player.play).not.toHaveBeenCalled();
  });

  it('keeps self-playing engines on their direct speech path', async () => {
    const engine = {
      ...stubEngine(new ArrayBuffer(0)),
      playsAudioDirectly: true as const,
      speakDirectly: vi.fn().mockResolvedValue(undefined),
      stopSpeaking: vi.fn(),
    };
    vi.mocked(VoiceEngineFactory.getEngine).mockReturnValue(engine);
    const onPlay = vi.fn();
    const onComplete = vi.fn();
    const adapter = new VoiceEngineAdapter({
      engineType: 'webSpeech',
      speaker: '',
      onPlay,
      onComplete,
    });

    await adapter.speakText('Direct speech');

    expect(engine.speakDirectly).toHaveBeenCalledTimes(1);
    expect(engine.fetchAudio).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
