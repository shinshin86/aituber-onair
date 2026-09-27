// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioLipsync } from './useAudioLipsync';

class MockAudio {
  static instances: MockAudio[] = [];

  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  resolvePlay: (() => void) | null = null;
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  play = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        this.resolvePlay = resolve;
      }),
  );

  constructor(_url: string) {
    void _url;
    MockAudio.instances.push(this);
  }
}

const audioNode = { connect: vi.fn(), disconnect: vi.fn() };

class MockAudioContext {
  state = 'running';
  destination = {};
  createAnalyser = () => ({
    ...audioNode,
    fftSize: 0,
    minDecibels: 0,
    maxDecibels: 0,
    smoothingTimeConstant: 0,
  });
  createMediaElementSource = () => audioNode;
  close = vi.fn(async () => {});
}

describe('useAudioLipsync playback timing', () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: ReturnType<typeof useAudioLipsync>;

  beforeEach(async () => {
    MockAudio.instances = [];
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    URL.createObjectURL = vi.fn(() => 'blob:test-audio');
    URL.revokeObjectURL = vi.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    function Probe() {
      current = useAudioLipsync();
      return null;
    }
    await act(async () => root.render(<Probe />));
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    container?.remove();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts only when audio plays and ends with playback', async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    let playback: Promise<void>;

    await act(async () => {
      playback = current.play(new ArrayBuffer(4), { onStart, onEnd });
    });

    const audio = MockAudio.instances[0];
    expect(onStart).not.toHaveBeenCalled();
    expect(current.isSpeaking).toBe(false);

    await act(async () => audio.onplaying?.());
    expect(onStart).toHaveBeenCalledOnce();
    expect(current.isSpeaking).toBe(true);

    await act(async () => audio.onended?.());
    await act(async () => audio.resolvePlay?.());
    await playback!;
    expect(onEnd).toHaveBeenCalledOnce();
    expect(current.isSpeaking).toBe(false);
  });

  it('ends the active playback when stopped', async () => {
    const onEnd = vi.fn();
    let playback: Promise<void>;

    await act(async () => {
      playback = current.play(new ArrayBuffer(4), { onEnd });
    });
    await act(async () => MockAudio.instances[0].onplaying?.());
    await act(async () => current.stop());
    await act(async () => MockAudio.instances[0].resolvePlay?.());
    await playback!;

    expect(onEnd).toHaveBeenCalledOnce();
    expect(current.isSpeaking).toBe(false);
  });
});
