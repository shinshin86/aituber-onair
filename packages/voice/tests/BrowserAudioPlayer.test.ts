import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserAudioPlayer } from '../src/services/audio/BrowserAudioPlayer';

class MockAudioElement {
  private readonly listeners = new Map<string, Set<(event: Event) => void>>();
  readonly play = vi.fn(() => Promise.resolve());
  readonly pause = vi.fn();
  src = '';
  currentTime = 0;

  addEventListener(eventName: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(eventName) ?? new Set();
    listeners.add(listener);
    this.listeners.set(eventName, listeners);
  }

  removeEventListener(
    eventName: string,
    listener: (event: Event) => void,
  ): void {
    this.listeners.get(eventName)?.delete(listener);
  }

  dispatch(eventName: string): void {
    const event = new Event(eventName);
    for (const listener of this.listeners.get(eventName) ?? []) {
      listener(event);
    }
  }

  listenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.size ?? 0;
  }

  remove(): void {}
}

const originalDocument = globalThis.document;
const originalWindow = globalThis.window;
const originalUrl = globalThis.URL;

function installBrowserMocks(audioElement: MockAudioElement) {
  const documentMock = {
    createElement: vi.fn(() => audioElement),
    getElementById: vi.fn(() => null),
  };

  Object.defineProperty(globalThis, 'document', {
    value: documentMock,
    writable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: {
      document: documentMock,
    },
    writable: true,
  });
  Object.defineProperty(globalThis, 'URL', {
    value: {
      createObjectURL: vi.fn(() => 'blob:audio'),
      revokeObjectURL: vi.fn(),
    },
    writable: true,
  });

  return {
    documentMock,
    urlMock: globalThis.URL as unknown as {
      createObjectURL: ReturnType<typeof vi.fn>;
      revokeObjectURL: ReturnType<typeof vi.fn>;
    },
  };
}

afterEach(() => {
  Object.defineProperty(globalThis, 'document', {
    value: originalDocument,
    writable: true,
  });
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    writable: true,
  });
  Object.defineProperty(globalThis, 'URL', {
    value: originalUrl,
    writable: true,
  });
  vi.restoreAllMocks();
});

describe('BrowserAudioPlayer', () => {
  it('should call onComplete once when default audio playback ends', async () => {
    const audioElement = new MockAudioElement();
    const { urlMock } = installBrowserMocks(audioElement);
    const onComplete = vi.fn();
    const player = new BrowserAudioPlayer();
    player.setOnComplete(onComplete);

    const playPromise = player.play(new ArrayBuffer(4));
    await Promise.resolve();
    audioElement.dispatch('ended');
    await playPromise;

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(player.isPlaying()).toBe(false);
    expect(urlMock.revokeObjectURL).toHaveBeenCalledWith('blob:audio');
    expect(audioElement.listenerCount('ended')).toBe(0);
    expect(audioElement.listenerCount('error')).toBe(0);
  });

  it('should remove listeners and revoke object URL when play fails', async () => {
    const audioElement = new MockAudioElement();
    const { urlMock } = installBrowserMocks(audioElement);
    const error = new Error('Playback blocked');
    audioElement.play.mockRejectedValueOnce(error);
    const player = new BrowserAudioPlayer();

    await expect(player.play(new ArrayBuffer(4))).rejects.toThrow(
      'Playback blocked',
    );

    expect(player.isPlaying()).toBe(false);
    expect(urlMock.revokeObjectURL).toHaveBeenCalledWith('blob:audio');
    expect(audioElement.listenerCount('ended')).toBe(0);
    expect(audioElement.listenerCount('error')).toBe(0);
  });
});
