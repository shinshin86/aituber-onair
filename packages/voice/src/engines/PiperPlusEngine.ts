import type { Talk } from '../types/voice';
import { float32ToPcm16Wav } from '../utils/wavHeader';
import { fetchWithTimeout } from './internal/utils';
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
  /** Present on multilingual (zs-v1 based) models, which need a language id input */
  language_id_map?: Record<string, number>;
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

const DEFAULT_LANGUAGE = 'ja';

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
  private language = DEFAULT_LANGUAGE;

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

  /**
   * Set the language passed to multilingual models as their `lid` input.
   *
   * Models without a `language_id_map` ignore this. The default is `ja`.
   */
  setLanguage(language?: string): void {
    this.language = language?.trim() || DEFAULT_LANGUAGE;
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

        const configResponse = await fetchWithTimeout(
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
    const multilingual = isMultilingualModel(modelConfig);
    const modelInputs = multilingual
      ? buildMultilingualInputs(phonemes, labels, modelConfig.phoneme_id_map)
      : {
          phonemeIds: phonemesToIds(phonemes, modelConfig.phoneme_id_map),
          prosody: null,
        };
    const phonemeIds = modelInputs.phonemeIds;

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

    const languageId = resolveLanguageId(
      modelConfig.language_id_map,
      this.language,
    );
    if (languageId !== undefined) {
      feeds.lid = new ort.Tensor(
        'int64',
        new BigInt64Array([BigInt(languageId)]),
        [1],
      );
    }

    if (modelConfig.prosody_id_map) {
      const prosodyFeatures =
        modelInputs.prosody ?? extractProsody(labels, phonemeIds.length);
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
  return float32ToPcm16Wav(samples, sampleRate);
}

function normalizeBasePath(basePath: string): string {
  return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

/**
 * Multilingual piper-plus models take a language id. Prefer the requested
 * language, then Japanese (the only language OpenJTalk phonemizes), then the
 * first entry so the model still receives a valid id.
 */
function resolveLanguageId(
  languageIdMap: Record<string, number> | undefined,
  language: string,
): number | undefined {
  if (!languageIdMap) {
    return undefined;
  }

  const candidates = [
    language,
    DEFAULT_LANGUAGE,
    ...Object.keys(languageIdMap),
  ];
  for (const candidate of candidates) {
    const id = languageIdMap[candidate];
    if (typeof id === 'number') {
      return id;
    }
  }

  return undefined;
}

/**
 * Multilingual (zs-v1 based) piper-plus models are trained on sequences with a
 * pad id after every token: BOS, t0, PAD, t1, PAD, ..., EOS, and with raw
 * OpenJTalk accent values. Single-language Japanese models use the plain
 * token sequence built by `phonemesToIds`.
 */
function isMultilingualModel(config: PiperPlusModelConfig): boolean {
  return Object.keys(config.language_id_map ?? {}).length > 1;
}

const SPECIAL_TOKENS = new Set([
  '^',
  '$',
  '_',
  '#',
  '[',
  ']',
  '?',
  '?!',
  '?.',
  '?~',
]);
const EOS_TOKENS = new Set(['$', '?', '?!', '?.', '?~']);
/** Short inputs are padded with silence up to this many ids (piper-plus "Strategy A") */
const MIN_PHONEME_IDS = 15;
const MIN_BODY_FOR_PADDING = 3;

interface ModelInputs {
  phonemeIds: number[];
  prosody: number[][] | null;
}

function buildMultilingualInputs(
  tokens: string[],
  labels: string,
  phonemeIdMap: Record<string, number[]>,
): ModelInputs {
  const accents = extractRawAccents(labels);
  const firstId = (token: string, fallback: number) =>
    phonemeIdMap[token]?.[0] ?? fallback;
  const bos = firstId('^', 1);
  const pad = firstId('_', 0);
  const zero = [0, 0, 0];

  const phonemeIds = [bos];
  const prosody: number[][] = [zero];
  let eosToken = '$';
  let accentIndex = 0;

  for (const token of tokens) {
    if (token === '^') {
      continue;
    }
    if (EOS_TOKENS.has(token)) {
      eosToken = token;
      continue;
    }
    const isPhoneme = !SPECIAL_TOKENS.has(token);
    const accent = isPhoneme ? (accents[accentIndex++] ?? zero) : zero;
    const ids = phonemeIdMap[token];
    if (ids) {
      for (const id of ids) {
        phonemeIds.push(id);
        prosody.push(accent);
      }
    }
    phonemeIds.push(pad);
    prosody.push(zero);
  }

  phonemeIds.push(firstId(eosToken, firstId('$', 2)));
  prosody.push(zero);

  return padShortInputs({ phonemeIds, prosody }, pad);
}

/** Insert silence ids after BOS and before EOS so short lines keep their timing. */
function padShortInputs(inputs: ModelInputs, pad: number): ModelInputs {
  const { phonemeIds, prosody } = inputs;
  const total = phonemeIds.length;
  const body = total - 2;
  if (body < MIN_BODY_FOR_PADDING || total >= MIN_PHONEME_IDS) {
    return inputs;
  }
  const missing = MIN_PHONEME_IDS - total;
  const front = Math.floor(missing / 2);
  const back = missing - front;
  const zeros = (count: number) =>
    Array.from({ length: count }, () => [0, 0, 0]);
  return {
    phonemeIds: [
      phonemeIds[0],
      ...new Array(front).fill(pad),
      ...phonemeIds.slice(1, -1),
      ...new Array(back).fill(pad),
      phonemeIds[total - 1],
    ],
    prosody: prosody
      ? [
          prosody[0],
          ...zeros(front),
          ...prosody.slice(1, -1),
          ...zeros(back),
          prosody[total - 1],
        ]
      : null,
  };
}

/** Raw A1/A2/A3 accent values for every phoneme label (silence and pauses skipped). */
function extractRawAccents(labels: string): number[][] {
  const accents: number[][] = [];
  const reAccent1 = /\/A:([\d-]+)\+/;
  const reAccent2 = /\+([0-9]+)\+/;
  const reAccent3 = /\+([0-9]+)\//;
  for (const line of labels.split('\n')) {
    const phonemeMatch = line.match(/-([^-+]+)\+/);
    if (
      !phonemeMatch ||
      phonemeMatch[1] === 'sil' ||
      phonemeMatch[1] === 'pau'
    ) {
      continue;
    }
    const a1 = reAccent1.exec(line);
    const a2 = reAccent2.exec(line);
    const a3 = reAccent3.exec(line);
    accents.push(
      a1 && a2 && a3
        ? [
            Number.parseInt(a1[1], 10),
            Number.parseInt(a2[1], 10),
            Number.parseInt(a3[1], 10),
          ]
        : [0, 0, 0],
    );
  }
  return accents;
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
