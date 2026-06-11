import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NodeAudioPlayer } from '../src/services/audio/NodeAudioPlayer';

afterEach(() => {
  vi.restoreAllMocks();
});

function waitForPlaybackStart(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('NodeAudioPlayer', () => {
  it('should remove temporary play-sound files when playback completes', async () => {
    const player = new NodeAudioPlayer();
    const onComplete = vi.fn();
    player.setOnComplete(onComplete);
    let tempFile = '';
    let playCallback: ((err?: Error) => void) | undefined;
    const play = vi.fn((file: string, callback: (err?: Error) => void) => {
      tempFile = file;
      playCallback = callback;
      return {
        kill: vi.fn(),
      };
    });
    const playSoundFactory = vi.fn(() => ({
      play,
    }));
    vi.spyOn(player as any, 'tryRequire')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(playSoundFactory);

    const playPromise = player.play(new ArrayBuffer(8));
    await waitForPlaybackStart();

    expect(fs.existsSync(tempFile)).toBe(true);
    playCallback?.();
    await playPromise;

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(tempFile)).toBe(false);
    expect(player.isPlaying()).toBe(false);
  });

  it('should remove temporary play-sound files when playback is stopped', async () => {
    const player = new NodeAudioPlayer();
    let tempFile = '';
    let playCallback: ((err?: Error) => void) | undefined;
    const kill = vi.fn();
    const playSoundFactory = vi.fn(() => ({
      play: vi.fn((file: string, callback: (err?: Error) => void) => {
        tempFile = file;
        playCallback = callback;
        return {
          kill,
        };
      }),
    }));
    vi.spyOn(player as any, 'tryRequire')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(playSoundFactory);

    const playPromise = player.play(new ArrayBuffer(8));
    await waitForPlaybackStart();

    expect(fs.existsSync(tempFile)).toBe(true);
    player.stop();

    expect(kill).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(tempFile)).toBe(false);
    expect(player.isPlaying()).toBe(false);

    playCallback?.(new Error('Playback stopped'));
    await expect(playPromise).rejects.toThrow('Playback stopped');
  });
});
