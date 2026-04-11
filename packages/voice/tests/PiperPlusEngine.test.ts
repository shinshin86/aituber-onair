import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PiperPlusEngine,
  float32ToWav,
  type PiperPlusAssets,
} from '../src/engines/PiperPlusEngine';

const assets: PiperPlusAssets = {
  basePath: '/piper/',
  modelConfigFile: 'tsukuyomi-config.json',
  modelFile: 'tsukuyomi-wavlm-300epoch.onnx',
  voiceFile: 'mei_normal.htsvoice',
};

class MockScriptElement extends EventTarget {
  dataset: Record<string, string> = {};
  src = '';
  type = '';
}

class MockDocument {
  private readonly scripts = new Map<string, MockScriptElement>();
  readonly head: {
    appendChild: (script: MockScriptElement) => MockScriptElement;
  };

  constructor(private readonly onAppend: (script: MockScriptElement) => void) {
    this.head = {
      appendChild: (script) => {
        this.scripts.set(script.dataset.src, script);
        this.onAppend(script);
        return script;
      },
    };
  }

  querySelector(selector: string): MockScriptElement | null {
    const match = selector.match(/script\[data-src="(.+)"\]/);
    if (!match) {
      return null;
    }

    return this.scripts.get(match[1]) ?? null;
  }

  createElement(tagName: string): MockScriptElement {
    if (tagName !== 'script') {
      throw new Error(`Unsupported tag requested in test: ${tagName}`);
    }

    return new MockScriptElement();
  }
}

function createMockResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function createRuntimeMocks() {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalOrt = (globalThis as any).ort;

  const phonemizer = {
    initialize: vi.fn().mockResolvedValue(undefined),
    textToPhonemes: vi
      .fn()
      .mockResolvedValue('xx-sil+yy/A:-1+2+3/zz\nxx-a+yy/A:0+1+2/zz'),
    extractPhonemes: vi.fn().mockReturnValue(['^', 'a', '$']),
    dispose: vi.fn(),
  };

  const run = vi.fn().mockResolvedValue({
    output: {
      data: new Float32Array([0, 0.5, -0.5]),
    },
  });
  const release = vi.fn().mockResolvedValue(undefined);

  const ort = {
    env: {
      wasm: {},
    },
    Tensor: class {
      constructor(
        public type: string,
        public data: BigInt64Array | Float32Array,
        public dims: number[],
      ) {}
    },
    InferenceSession: {
      create: vi.fn().mockResolvedValue({
        run,
        release,
      }),
    },
  };

  const mockWindow = new EventTarget() as Window &
    typeof globalThis & {
      __PiperPlus?: unknown;
      document: Document;
    };

  const mockDocument = new MockDocument((script) => {
    queueMicrotask(() => {
      if (script.src.endsWith('ort.min.js')) {
        (globalThis as any).ort = ort;
      }

      if (script.src.endsWith('piper-global-loader.js')) {
        mockWindow.__PiperPlus = {
          SimpleUnifiedPhonemizer: vi.fn(() => phonemizer),
        };
        mockWindow.dispatchEvent(new Event('piper-plus-ready'));
      }

      script.dispatchEvent(new Event('load'));
    });
  });

  mockWindow.document = mockDocument as unknown as Document;

  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    writable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: mockDocument,
    writable: true,
  });
  Object.defineProperty(globalThis, 'fetch', {
    value: vi.fn().mockResolvedValue(
      createMockResponse({
        audio: {
          sample_rate: 22050,
        },
        inference: {
          noise_scale: 0.667,
          length_scale: 1.0,
          noise_w: 0.8,
        },
        phoneme_id_map: {
          _: [0],
          '^': [1],
          a: [10],
          $: [2],
        },
        prosody_id_map: {
          0: [0],
          1: [1],
        },
      }),
    ),
    writable: true,
  });

  return {
    phonemizer,
    run,
    release,
    ort,
    restore() {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      });
      Object.defineProperty(globalThis, 'document', {
        value: originalDocument,
        writable: true,
      });
      Object.defineProperty(globalThis, 'fetch', {
        value: originalFetch,
        writable: true,
      });
      if (originalOrt === undefined) {
        (globalThis as any).ort = undefined;
      } else {
        (globalThis as any).ort = originalOrt;
      }
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PiperPlusEngine', () => {
  it('should return the default Japanese test message', () => {
    const engine = new PiperPlusEngine();

    expect(engine.getTestMessage()).toBe('こんにちは、テスト音声です。');
  });

  it('should throw when assets are not configured', async () => {
    const engine = new PiperPlusEngine();

    await expect(
      engine.fetchAudio(
        { style: 'neutral', message: 'test message' },
        'tsukuyomi',
      ),
    ).rejects.toThrow('PiperPlus assets are not configured');
  });

  it('should store configured assets and runtime parameters', () => {
    const engine = new PiperPlusEngine();

    engine.setAssets(assets);
    engine.setSpeed(1.25);
    engine.setNoiseScale(0.55);

    expect((engine as any).assets).toEqual(assets);
    expect((engine as any).speed).toBe(1.25);
    expect((engine as any).noiseScale).toBe(0.55);
  });

  it('should keep initialization when the same assets are applied again', async () => {
    const runtime = createRuntimeMocks();
    const engine = new PiperPlusEngine();
    engine.setAssets(assets);

    const initializeSpy = vi.spyOn(engine, 'initialize');

    await engine.fetchAudio(
      { style: 'neutral', message: 'こんにちは' },
      'tsukuyomi',
    );

    engine.setAssets({
      ...assets,
      basePath: '/piper',
    });

    await engine.fetchAudio(
      { style: 'neutral', message: 'もう一度' },
      'tsukuyomi',
    );

    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    runtime.restore();
  });

  it('should lazily initialize on first fetchAudio and return WAV data', async () => {
    const runtime = createRuntimeMocks();
    const engine = new PiperPlusEngine();
    engine.setAssets(assets);

    const initializeSpy = vi.spyOn(engine, 'initialize');

    const audioBuffer = await engine.fetchAudio(
      { style: 'neutral', message: 'こんにちは' },
      'tsukuyomi',
    );
    await engine.fetchAudio(
      { style: 'neutral', message: 'もう一度' },
      'tsukuyomi',
    );

    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(runtime.ort.env.wasm).toMatchObject({
      wasmPaths: '/piper/dist/',
      numThreads: 1,
      simd: true,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/piper/models/tsukuyomi-config.json',
    );
    expect(runtime.phonemizer.initialize).toHaveBeenCalledWith({
      openjtalk: {
        jsPath: '/piper/dist/openjtalk.js',
        wasmPath: '/piper/dist/openjtalk.wasm',
        dictPath: '/piper/assets/dict',
        voicePath: '/piper/assets/voice/mei_normal.htsvoice',
      },
    });
    expect(runtime.ort.InferenceSession.create).toHaveBeenCalledWith(
      '/piper/models/tsukuyomi-wavlm-300epoch.onnx',
      {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      },
    );

    const view = new DataView(audioBuffer);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1))).toBe('RI');
    expect(view.getUint32(24, true)).toBe(22050);

    runtime.restore();
  });

  it('should dispose phonemizer and ONNX session resources', async () => {
    const runtime = createRuntimeMocks();
    const engine = new PiperPlusEngine();
    engine.setAssets(assets);

    await engine.initialize();
    await engine.dispose();

    expect(runtime.phonemizer.dispose).toHaveBeenCalledTimes(1);
    expect(runtime.release).toHaveBeenCalledTimes(1);
    expect((engine as any).phonemizer).toBeNull();
    expect((engine as any).onnxSession).toBeNull();

    runtime.restore();
  });

  it('should convert Float32 audio to a WAV buffer', () => {
    const wavBuffer = float32ToWav(new Float32Array([0, 1, -1]), 16000);
    const view = new DataView(wavBuffer);

    expect(
      String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3),
      ),
    ).toBe('RIFF');
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
  });
});
