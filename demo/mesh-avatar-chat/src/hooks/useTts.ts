import { PiperPlusEngine, WebSpeechEngine } from '@aituber-onair/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickJapaneseVoice } from '../lib/webSpeechVoice';
import type { VoiceKind } from './useSettings';

export type PiperStatus = 'idle' | 'loading' | 'ready' | 'error' | 'missing';

/** Files inside public/piper/, as packaged by scripts/fetch-piper-assets.sh */
const PIPER_ASSETS = {
  basePath: `${import.meta.env.BASE_URL}piper/`,
  modelConfigFile: 'sample-voice-v2.onnx.json',
  modelFile: 'sample-voice-v2.onnx',
  voiceFile: 'mei_normal.htsvoice',
};

// Listening test on macOS Chrome: raising the pitch made Google's voice worse,
// so the browser voice is left as the vendor tuned it.
const PIPER_NOISE_SCALE = 0.667;

/** The large files behind the Miko voice, fetched first so a progress bar can show them. */
const PIPER_PREFETCH_FILES = [
  'dist/ort-wasm-simd.wasm',
  'assets/dict/sys.dic',
  'assets/dict/matrix.bin',
  'assets/dict/char.bin',
  `models/${PIPER_ASSETS.modelFile}`,
];
const WEB_SPEECH_RATE = 1.0;
const WEB_SPEECH_PITCH = 1.0;

export interface SpeakOptions {
  voice: VoiceKind;
  /** Web Speech voice name; empty picks automatically */
  webSpeechVoice?: string;
  /** Speed multiplier for the piper-plus voice (1 = as trained) */
  piperSpeed?: number;
}

export interface UseTtsOptions {
  /** Plays a WAV buffer and resolves when playback ends (drives lip sync) */
  play: (buffer: ArrayBuffer) => Promise<void>;
  stopPlayback: () => void;
  /** Fake mouth movement while Web Speech plays audio we cannot analyse */
  envelope: { start: () => void; stop: () => void };
}

/** Emoji and leftover emotion tags are for the bubble, not for the voice. */
function toSpokenText(text: string): string {
  return text
    .replace(/\[[a-z]+\]/gi, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\u200d|\ufe0f/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const PIPER_CACHE_NAME = 'mesh-avatar-chat-piper-v2';

/** Resolves once the page is controlled by the service worker, or gives up quickly. */
async function waitForServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return false;
  if (navigator.serviceWorker.controller) return true;
  const ready = navigator.serviceWorker.ready.then(() => true);
  const timeout = new Promise<boolean>((resolve) =>
    window.setTimeout(() => resolve(false), 3000),
  );
  const ok = await Promise.race([ready, timeout]);
  return ok && Boolean(navigator.serviceWorker.controller);
}

/**
 * Downloads the voice files into Cache Storage, reporting bytes received over
 * the total. The service worker then answers the engine's requests from that
 * cache, so nothing is downloaded twice and later visits start offline.
 * Files already in the cache count as complete.
 */
async function prefetchWithProgress(
  urls: string[],
  onProgress: (ratio: number) => void,
): Promise<void> {
  const cache = await caches.open(PIPER_CACHE_NAME);
  const pending: string[] = [];
  for (const url of urls) {
    if (!(await cache.match(url))) pending.push(url);
  }
  if (pending.length === 0) {
    onProgress(1);
    return;
  }
  const sizes = await Promise.all(
    pending.map(async (url) => {
      try {
        const head = await fetch(url, { method: 'HEAD' });
        return Number(head.headers.get('content-length')) || 0;
      } catch {
        return 0;
      }
    }),
  );
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const received = new Array<number>(pending.length).fill(0);
  const report = () => {
    if (total > 0) {
      const done = received.reduce((sum, bytes) => sum + bytes, 0);
      onProgress(Math.min(1, done / total));
    }
  };
  onProgress(0);
  await Promise.all(
    pending.map(async (url, index) => {
      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new Error(`Failed to download ${url}: ${response.status}`);
      }
      // One branch goes into the cache, the other is read only to count bytes.
      const stored = cache.put(url, response.clone());
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received[index] += value.byteLength;
        report();
      }
      await stored;
    }),
  );
  onProgress(1);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?\n])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Two voices behind one `speak()`: the Web Speech API (instant, no download)
 * and piper-plus with the Miko voice model (prepared in the background).
 */
export function useTts({ play, stopPlayback, envelope }: UseTtsOptions) {
  const webRef = useRef<WebSpeechEngine | null>(null);
  const piperRef = useRef<PiperPlusEngine | null>(null);
  const [piperStatus, setPiperStatus] = useState<PiperStatus>('idle');
  /** 0..1 while the voice files download, null otherwise */
  const [piperProgress, setPiperProgress] = useState<number | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speakSeqRef = useRef(0);
  const envelopeRef = useRef(envelope);
  const playRef = useRef(play);
  const stopPlaybackRef = useRef(stopPlayback);

  useEffect(() => {
    envelopeRef.current = envelope;
    playRef.current = play;
    stopPlaybackRef.current = stopPlayback;
  }, [envelope, play, stopPlayback]);

  const getWeb = useCallback(() => {
    if (!webRef.current) webRef.current = new WebSpeechEngine();
    return webRef.current;
  }, []);

  const webSpeechAvailable = useMemo(
    () =>
      typeof speechSynthesis !== 'undefined' &&
      typeof SpeechSynthesisUtterance !== 'undefined',
    [],
  );

  /** Downloads and initialises piper-plus; safe to call more than once. */
  const preparePiper = useCallback(async () => {
    if (piperRef.current) return;
    if (!PiperPlusEngine.isAvailable()) {
      setPiperStatus('error');
      return;
    }
    setPiperStatus('loading');
    try {
      const probe = await fetch(
        `${PIPER_ASSETS.basePath}models/${PIPER_ASSETS.modelConfigFile}`,
        { method: 'HEAD' },
      );
      if (!probe.ok) {
        setPiperStatus('missing');
        return;
      }
      // Without a service worker the engine downloads on its own; the bar
      // then stays indeterminate instead of counting the same bytes twice.
      if (await waitForServiceWorker()) {
        await prefetchWithProgress(
          PIPER_PREFETCH_FILES.map(
            (file) =>
              new URL(`${PIPER_ASSETS.basePath}${file}`, location.href).href,
          ),
          setPiperProgress,
        );
      }
      setPiperProgress(null);
      const engine = new PiperPlusEngine();
      engine.setAssets(PIPER_ASSETS);
      // The model was evaluated with noise_scale 0.667 (its config value).
      engine.setNoiseScale(PIPER_NOISE_SCALE);
      await engine.initialize();
      piperRef.current = engine;
      setPiperStatus('ready');
    } catch (error) {
      console.error('Failed to prepare piper-plus:', error);
      setPiperProgress(null);
      setPiperStatus('error');
    }
  }, []);

  const stop = useCallback(() => {
    speakSeqRef.current += 1;
    try {
      webRef.current?.stopSpeaking();
    } catch {
      // not supported here
    }
    stopPlaybackRef.current();
    envelopeRef.current.stop();
  }, []);

  const speak = useCallback(
    async (text: string, options: SpeakOptions): Promise<void> => {
      const message = toSpokenText(text);
      if (!message) return;
      stop();
      const seq = speakSeqRef.current;
      const piper = piperRef.current;

      if (options.voice === 'piperPlus' && piper) {
        piper.setSpeed(options.piperSpeed);
        const chunks = splitSentences(message);
        let next = piper.fetchAudio({ style: 'talk', message: chunks[0] }, '');
        for (let i = 0; i < chunks.length; i++) {
          const buffer = await next;
          if (seq !== speakSeqRef.current) return;
          if (i + 1 < chunks.length) {
            next = piper.fetchAudio(
              { style: 'talk', message: chunks[i + 1] },
              '',
            );
          }
          await playRef.current(buffer);
          if (seq !== speakSeqRef.current) return;
        }
        return;
      }

      if (!webSpeechAvailable) return;
      const voice = pickJapaneseVoice(voices, options.webSpeechVoice);
      envelopeRef.current.start();
      // Browsers without a usable voice may never fire `end`; stop the mouth
      // after the time the text could plausibly take.
      const limitMs = 4000 + message.length * 350;
      let timer = 0;
      const timeout = new Promise<void>((resolve) => {
        timer = window.setTimeout(() => {
          try {
            getWeb().stopSpeaking();
          } catch {
            // ignore
          }
          resolve();
        }, limitMs);
      });
      try {
        await Promise.race([
          getWeb().speakDirectly(
            { style: 'talk', message },
            voice?.name ?? '',
            { lang: 'ja-JP', rate: WEB_SPEECH_RATE, pitch: WEB_SPEECH_PITCH },
          ),
          timeout,
        ]);
      } catch (error) {
        console.warn('Web Speech failed:', error);
      } finally {
        window.clearTimeout(timer);
        if (seq === speakSeqRef.current) envelopeRef.current.stop();
      }
    },
    [getWeb, stop, voices, webSpeechAvailable],
  );

  /** Deletes the downloaded voice files from Cache Storage (the loaded voice keeps working). */
  const clearPiperCache = useCallback(async (): Promise<boolean> => {
    if (!('caches' in window)) return false;
    try {
      return await caches.delete(PIPER_CACHE_NAME);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
      void piperRef.current?.dispose();
    };
  }, [stop]);

  return {
    speak,
    stop,
    preparePiper,
    clearPiperCache,
    piperStatus,
    piperProgress,
    piperReady: piperStatus === 'ready',
    webSpeechAvailable,
    voices,
    setVoices,
  };
}
