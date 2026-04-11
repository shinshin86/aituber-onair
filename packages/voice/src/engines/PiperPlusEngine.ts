import type { Talk } from '../types/voice';
import type { VoiceEngine } from './VoiceEngine';

export interface PiperPlusAssets {
  /** Base path where piper assets are served (e.g. '/piper/' or 'https://example.com/piper/'). Must end with '/'. */
  basePath: string;
  /** Model config JSON filename relative to basePath + 'models/' (e.g. 'tsukuyomi-config.json') */
  modelConfigFile: string;
  /** ONNX model filename relative to basePath + 'models/' (e.g. 'tsukuyomi-wavlm-300epoch.onnx') */
  modelFile: string;
  /** HTS voice filename relative to basePath + 'assets/voice/' (e.g. 'mei_normal.htsvoice') */
  voiceFile: string;
}

interface PiperPlusModelConfig {
  audio: {
    sample_rate: number;
  };
  inference?: {
    noise_scale?: number;
    length_scale?: number;
    noise_w?: number;
  };
  phoneme_id_map: Record<string, number[]>;
  prosody_id_map?: Record<string, number[]>;
}

interface PiperPlusModule {
  SimpleUnifiedPhonemizer: new (
    options?: Record<string, unknown>,
  ) => SimpleUnifiedPhonemizer;
}

interface SimpleUnifiedPhonemizer {
  initialize(config: {
    openjtalk: {
      jsPath: string;
      wasmPath: string;
      dictPath: string;
      voicePath: string;
    };
  }): Promise<void>;
  textToPhonemes(text: string, lang: string): Promise<string>;
  extractPhonemes(labels: string, lang: string): string[];
  dispose(): void;
}

interface OrtInferenceSession {
  run(
    feeds: Record<string, unknown>,
  ): Promise<Record<string, { data: Float32Array | ArrayLike<number> }>>;
  release?(): Promise<void>;
}

type ScriptType = 'classic' | 'module';

/**
 * WASM-based Japanese TTS engine powered by ONNX Runtime Web and OpenJTalk.
 *
 * This engine is intended for browser-only execution.
 */
export class PiperPlusEngine implements VoiceEngine {
  private phonemizer: SimpleUnifiedPhonemizer | null = null;
  private onnxSession: OrtInferenceSession | null = null;
  private modelConfig: PiperPlusModelConfig | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private assets?: PiperPlusAssets;
  private speed = 1.0;
  private noiseScale = 1.0;

  static isAvailable(): boolean {
    return (
      typeof globalThis.fetch === 'function' &&
      typeof globalThis.document !== 'undefined' &&
      typeof globalThis.window !== 'undefined'
    );
  }

  setAssets(assets: PiperPlusAssets): void {
    const nextAssets = {
      ...assets,
      basePath: normalizeBasePath(assets.basePath),
    };

    if (
      this.assets &&
      this.assets.basePath === nextAssets.basePath &&
      this.assets.modelConfigFile === nextAssets.modelConfigFile &&
      this.assets.modelFile === nextAssets.modelFile &&
      this.assets.voiceFile === nextAssets.voiceFile
    ) {
      return;
    }

    this.assets = nextAssets;
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Set the speaking speed multiplier.
   *
   * Valid range is 0.5 to 2.0. The default value is 1.0.
   */
  setSpeed(speed?: number): void {
    if (speed === undefined || !Number.isFinite(speed)) {
      this.speed = 1.0;
      return;
    }

    this.speed = speed;
  }

  /**
   * Set the synthesis noise scale.
   *
   * Valid range is 0.0 to 2.0. The default value is 1.0.
   */
  setNoiseScale(noiseScale?: number): void {
    if (noiseScale === undefined || !Number.isFinite(noiseScale)) {
      this.noiseScale = 1.0;
      return;
    }

    this.noiseScale = noiseScale;
  }

  async initialize(): Promise<void> {
    const assets = this.requireAssets();

    if (!PiperPlusEngine.isAvailable()) {
      throw new Error('PiperPlus is only available in browser environments');
    }

    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        await loadScript(`${assets.basePath}dist/ort.min.js`);
        await loadScript(`${assets.basePath}piper-global-loader.js`, 'module');

        const ort = getOrtGlobal();
        const piperPlus = await getPiperPlus();

        ort.env.wasm.wasmPaths = `${assets.basePath}dist/`;
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.simd = true;

        const configResponse = await fetch(
          `${assets.basePath}models/${assets.modelConfigFile}`,
        );

        if (!configResponse.ok) {
          throw new Error(
            `Failed to fetch PiperPlus model config: ${configResponse.status} ${configResponse.statusText}`,
          );
        }

        const modelConfig =
          (await configResponse.json()) as PiperPlusModelConfig;

        const phonemizer = new piperPlus.SimpleUnifiedPhonemizer();
        await phonemizer.initialize({
          openjtalk: {
            jsPath: `${assets.basePath}dist/openjtalk.js`,
            wasmPath: `${assets.basePath}dist/openjtalk.wasm`,
            dictPath: `${assets.basePath}assets/dict`,
            voicePath: `${assets.basePath}assets/voice/${assets.voiceFile}`,
          },
        });

        const onnxSession = (await ort.InferenceSession.create(
          `${assets.basePath}models/${assets.modelFile}`,
          {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
          },
        )) as OrtInferenceSession;

        this.modelConfig = modelConfig;
        this.phonemizer = phonemizer;
        this.onnxSession = onnxSession;
        this.initialized = true;
      } catch (error) {
        await this.dispose();
        throw error;
      }
    })();

    return this.initPromise;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    void speaker;
    void apiKey;

    this.requireAssets();

    if (!this.initialized) {
      await this.initialize();
    }

    const ort = getOrtGlobal();
    const phonemizer = this.requirePhonemizer();
    const onnxSession = this.requireOnnxSession();
    const modelConfig = this.requireModelConfig();

    const text = input.message;
    const labels = await phonemizer.textToPhonemes(text, 'ja');
    const phonemes = phonemizer.extractPhonemes(labels, 'ja');
    const phonemeIds = phonemesToIds(phonemes, modelConfig.phoneme_id_map);

    const feeds: Record<string, unknown> = {
      input: new ort.Tensor(
        'int64',
        new BigInt64Array(phonemeIds.map((id) => BigInt(id))),
        [1, phonemeIds.length],
      ),
      input_lengths: new ort.Tensor(
        'int64',
        new BigInt64Array([BigInt(phonemeIds.length)]),
        [1],
      ),
      scales: new ort.Tensor(
        'float32',
        new Float32Array([
          this.noiseScale,
          // length_scale: lower = faster speech. Invert speed so that
          // higher speed values produce faster output.
          this.speed > 0 ? 1.0 / this.speed : 1.0,
          modelConfig.inference?.noise_w ?? 0.8,
        ]),
        [3],
      ),
    };

    if (modelConfig.prosody_id_map) {
      const prosodyFeatures = extractProsody(labels, phonemeIds.length);
      const flatProsody: bigint[] = [];
      for (const [accent1, accent2, accent3] of prosodyFeatures) {
        flatProsody.push(BigInt(accent1), BigInt(accent2), BigInt(accent3));
      }
      feeds.prosody_features = new ort.Tensor(
        'int64',
        new BigInt64Array(flatProsody),
        [1, phonemeIds.length, 3],
      );
    }

    const results = await onnxSession.run(feeds);
    const outputName = Object.keys(results)[0];
    const audioTensor = results.output ?? results[outputName];

    if (!audioTensor?.data) {
      throw new Error('PiperPlus inference did not return audio output');
    }

    const audio =
      audioTensor.data instanceof Float32Array
        ? audioTensor.data
        : Float32Array.from(audioTensor.data);

    return float32ToWav(audio, modelConfig.audio.sample_rate);
  }

  async dispose(): Promise<void> {
    const phonemizer = this.phonemizer;
    const onnxSession = this.onnxSession;

    this.phonemizer = null;
    this.onnxSession = null;
    this.modelConfig = null;
    this.initialized = false;
    this.initPromise = null;

    if (phonemizer) {
      try {
        phonemizer.dispose();
      } catch {
        // Ignore disposal errors.
      }
    }

    if (onnxSession?.release) {
      try {
        await onnxSession.release();
      } catch {
        // Ignore disposal errors.
      }
    }
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'こんにちは、テスト音声です。';
  }

  private requireAssets(): PiperPlusAssets {
    if (!this.assets) {
      throw new Error('PiperPlus assets are not configured');
    }

    return this.assets;
  }

  private requireModelConfig(): PiperPlusModelConfig {
    if (!this.modelConfig) {
      throw new Error('PiperPlus model config is not initialized');
    }

    return this.modelConfig;
  }

  private requirePhonemizer(): SimpleUnifiedPhonemizer {
    if (!this.phonemizer) {
      throw new Error('PiperPlus phonemizer is not initialized');
    }

    return this.phonemizer;
  }

  private requireOnnxSession(): OrtInferenceSession {
    if (!this.onnxSession) {
      throw new Error('PiperPlus ONNX session is not initialized');
    }

    return this.onnxSession;
  }
}

export function float32ToWav(
  samples: Float32Array,
  sampleRate: number,
): ArrayBuffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, Math.round(pcm), true);
    offset += bytesPerSample;
  }

  return buffer;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function normalizeBasePath(basePath: string): string {
  return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

function phonemesToIds(
  phonemes: string[],
  phonemeIdMap: Record<string, number[]>,
): number[] {
  let processedPhonemes = phonemes;

  if (phonemes.length < 20) {
    processedPhonemes = [
      phonemes[0],
      '_',
      '_',
      ...phonemes.slice(1, -1),
      '_',
      '_',
      phonemes[phonemes.length - 1],
    ];
  }

  const ids: number[] = [];
  for (const phoneme of processedPhonemes) {
    if (phonemeIdMap[phoneme]) {
      ids.push(...phonemeIdMap[phoneme]);
    } else {
      ids.push(...(phonemeIdMap._ || [0]));
    }
  }

  return ids;
}

function extractProsody(labels: string, count: number): number[][] {
  const lines = labels.split('\n').filter((line) => line.trim());
  const prosody: number[][] = [[0, 0, 0]];
  const reAccent1 = /\/A:([\d-]+)\+/;
  const reAccent2 = /\+([0-9]+)\+/;
  const reAccent3 = /\+([0-9]+)\//;

  for (const line of lines) {
    const phonemeMatch = line.match(/-([^+]+)\+/);
    if (
      phonemeMatch &&
      phonemeMatch[1] !== 'sil' &&
      phonemeMatch[1] !== 'pau'
    ) {
      const accent1 = reAccent1.exec(line);
      const accent2 = reAccent2.exec(line);
      const accent3 = reAccent3.exec(line);
      prosody.push([
        accent1
          ? Math.max(0, Math.min(10, Number.parseInt(accent1[1], 10) + 5))
          : 0,
        accent2 ? Math.min(10, Number.parseInt(accent2[1], 10)) : 0,
        accent3 ? Math.min(10, Number.parseInt(accent3[1], 10)) : 0,
      ]);
    }
  }

  prosody.push([0, 0, 0]);

  while (prosody.length < count) {
    prosody.push([0, 0, 0]);
  }

  return prosody.slice(0, count);
}

async function loadScript(src: string, type: ScriptType = 'classic') {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-src="${src}"]`,
  );

  if (existing) {
    if (existing.dataset.loaded === 'true') {
      return;
    }

    await waitForScriptLoad(existing, src);
    return;
  }

  const script = document.createElement('script');
  script.dataset.src = src;
  script.src = src;

  if (type === 'module') {
    script.type = 'module';
  }

  const waitPromise = waitForScriptLoad(script, src);
  document.head.appendChild(script);
  await waitPromise;
}

async function waitForScriptLoad(
  script: HTMLScriptElement,
  src: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => {
        reject(new Error(`Failed to load ${src}`));
      },
      { once: true },
    );
  });
}

function getOrtGlobal(): any {
  const ort = (globalThis as any).ort;

  if (!ort?.env?.wasm || !ort?.InferenceSession || !ort?.Tensor) {
    throw new Error('ONNX Runtime Web global is not available');
  }

  return ort;
}

function getPiperPlus(): Promise<PiperPlusModule> {
  const piperPlus = (globalThis as any).window?.__PiperPlus;

  if (piperPlus) {
    return Promise.resolve(piperPlus as PiperPlusModule);
  }

  return new Promise((resolve) => {
    window.addEventListener(
      'piper-plus-ready',
      () => {
        resolve((window as any).__PiperPlus as PiperPlusModule);
      },
      { once: true },
    );
  });
}
