import { afterEach, describe, expect, it } from 'vitest';
import { BrowserAudioPlayer } from '../src/services/audio/BrowserAudioPlayer';
import { NodeAudioPlayer } from '../src/services/audio/NodeAudioPlayer';
import {
  AudioPlayerFactory,
  RuntimeDetection,
} from '../src/services/audio/AudioPlayerFactory';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalProcess = globalThis.process;
const originalDeno = (globalThis as any).Deno;
const originalBun = (globalThis as any).Bun;

function setGlobalValue(key: keyof typeof globalThis | string, value: unknown) {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
}

function restoreRuntimeGlobals() {
  setGlobalValue('window', originalWindow);
  setGlobalValue('document', originalDocument);
  setGlobalValue('process', originalProcess);
  setGlobalValue('Deno', originalDeno);
  setGlobalValue('Bun', originalBun);
}

function clearRuntimeGlobals() {
  setGlobalValue('window', undefined);
  setGlobalValue('document', undefined);
  setGlobalValue('process', undefined);
  setGlobalValue('Deno', undefined);
  setGlobalValue('Bun', undefined);
}

afterEach(() => {
  restoreRuntimeGlobals();
});

describe('AudioPlayerFactory and RuntimeDetection', () => {
  it('should detect browser runtime and create a BrowserAudioPlayer', () => {
    clearRuntimeGlobals();
    const documentMock = {
      createElement: () => ({
        addEventListener: () => {},
        removeEventListener: () => {},
        pause: () => {},
        remove: () => {},
        currentTime: 0,
      }),
    };
    setGlobalValue('document', documentMock);
    setGlobalValue('window', { document: documentMock });

    expect(RuntimeDetection.getRuntimeName()).toBe('browser');
    expect(AudioPlayerFactory.createAudioPlayer()).toBeInstanceOf(
      BrowserAudioPlayer,
    );
  });

  it('should detect Deno runtime and create a BrowserAudioPlayer', () => {
    clearRuntimeGlobals();
    setGlobalValue('window', {});
    setGlobalValue('Deno', { version: { deno: '1.0.0' } });

    expect(RuntimeDetection.getRuntimeName()).toBe('deno');
    expect(AudioPlayerFactory.createAudioPlayer()).toBeInstanceOf(
      BrowserAudioPlayer,
    );
  });

  it('should detect Bun runtime and create a NodeAudioPlayer', () => {
    clearRuntimeGlobals();
    setGlobalValue('Bun', { version: '1.0.0' });
    setGlobalValue('process', { versions: { node: '20.0.0' } });

    expect(RuntimeDetection.getRuntimeName()).toBe('bun');
    expect(AudioPlayerFactory.createAudioPlayer()).toBeInstanceOf(
      NodeAudioPlayer,
    );
  });

  it('should detect Node.js runtime and create a NodeAudioPlayer', () => {
    clearRuntimeGlobals();
    setGlobalValue('process', { versions: { node: '20.0.0' } });

    expect(RuntimeDetection.getRuntimeName()).toBe('node');
    expect(AudioPlayerFactory.createAudioPlayer()).toBeInstanceOf(
      NodeAudioPlayer,
    );
  });

  it('should fall back to a NodeAudioPlayer for unknown runtime', () => {
    clearRuntimeGlobals();

    expect(RuntimeDetection.getRuntimeName()).toBe('unknown');
    expect(AudioPlayerFactory.createAudioPlayer()).toBeInstanceOf(
      NodeAudioPlayer,
    );
    expect(AudioPlayerFactory.getRuntimeInfo()).toMatchObject({
      runtime: 'unknown',
      isBrowser: false,
      isDeno: false,
      isBun: false,
      isNode: false,
      hasWindow: false,
      hasDocument: false,
      hasProcess: false,
    });
  });
});
