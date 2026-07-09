import { Talk } from '../types/voice';
import { DirectSpeechOptions, SelfPlayingVoiceEngine } from './VoiceEngine';

export interface WebSpeechEngineDependencies {
  synthesis?: SpeechSynthesis;
  utteranceCtor?: typeof SpeechSynthesisUtterance;
  voiceLoadTimeoutMs?: number;
}

const DEFAULT_VOICE_LOAD_TIMEOUT_MS = 1000;

function getGlobalSpeechSynthesis(): SpeechSynthesis | undefined {
  return (
    globalThis as typeof globalThis & { speechSynthesis?: SpeechSynthesis }
  ).speechSynthesis;
}

function getGlobalUtteranceCtor(): typeof SpeechSynthesisUtterance | undefined {
  return (
    globalThis as typeof globalThis & {
      SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
    }
  ).SpeechSynthesisUtterance;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createUnsupportedError(): Error {
  return new Error(
    'Web Speech API is not available in this runtime. Use webSpeech only in a browser that supports speechSynthesis.',
  );
}

function getVoiceId(voice: SpeechSynthesisVoice): string {
  return voice.voiceURI || voice.name;
}

function findVoice(
  voices: SpeechSynthesisVoice[],
  speaker: string,
): SpeechSynthesisVoice | undefined {
  const normalizedSpeaker = speaker.trim();
  if (!normalizedSpeaker) {
    return undefined;
  }

  return voices.find(
    (voice) =>
      voice.name === normalizedSpeaker ||
      voice.voiceURI === normalizedSpeaker ||
      getVoiceId(voice) === normalizedSpeaker,
  );
}

export async function waitForWebSpeechVoices(
  synthesis: SpeechSynthesis,
  timeoutMs = DEFAULT_VOICE_LOAD_TIMEOUT_MS,
): Promise<SpeechSynthesisVoice[]> {
  const initialVoices = synthesis.getVoices();
  if (initialVoices.length > 0 || timeoutMs <= 0) {
    return initialVoices;
  }

  return await new Promise((resolve) => {
    let settled = false;
    let previousHandler:
      | ((this: SpeechSynthesis, ev: Event) => unknown)
      | null = null;

    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);

      if ('onvoiceschanged' in synthesis) {
        synthesis.onvoiceschanged = previousHandler;
      }

      resolve(voices);
    };

    const handleVoicesChanged = () => {
      finish(synthesis.getVoices());
    };

    if ('onvoiceschanged' in synthesis) {
      previousHandler = synthesis.onvoiceschanged;
      synthesis.onvoiceschanged = handleVoicesChanged;
    }

    const timeoutId = setTimeout(() => {
      finish(synthesis.getVoices());
    }, timeoutMs);
  });
}

export async function getWebSpeechVoiceList(
  options: { timeoutMs?: number; synthesis?: SpeechSynthesis } = {},
): Promise<SpeechSynthesisVoice[]> {
  const synthesis = options.synthesis ?? getGlobalSpeechSynthesis();
  if (!synthesis) {
    throw createUnsupportedError();
  }

  return await waitForWebSpeechVoices(synthesis, options.timeoutMs);
}

/**
 * Web Speech API engine.
 *
 * speechSynthesis plays audio directly in the browser and does not expose audio
 * bytes. fetchAudio() therefore returns an empty buffer only for VoiceEngine
 * compatibility; VoiceEngineAdapter uses speakDirectly().
 */
export class WebSpeechEngine implements SelfPlayingVoiceEngine {
  readonly playsAudioDirectly = true;

  private synthesis?: SpeechSynthesis;
  private utteranceCtor?: typeof SpeechSynthesisUtterance;
  private voiceLoadTimeoutMs: number;
  private rate?: number;
  private pitch?: number;
  private volume?: number;
  private language?: string;

  constructor(dependencies: WebSpeechEngineDependencies = {}) {
    this.synthesis = dependencies.synthesis;
    this.utteranceCtor = dependencies.utteranceCtor;
    this.voiceLoadTimeoutMs =
      dependencies.voiceLoadTimeoutMs ?? DEFAULT_VOICE_LOAD_TIMEOUT_MS;
  }

  async fetchAudio(
    input: Talk,
    speaker: string,
    apiKey?: string,
  ): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async speakDirectly(
    input: Talk,
    speaker: string,
    options: DirectSpeechOptions = {},
  ): Promise<void> {
    const text = input.message.trim();
    if (!text) {
      return;
    }

    const synthesis = this.getSynthesis();
    const UtteranceCtor = this.getUtteranceCtor();
    const voices = await waitForWebSpeechVoices(
      synthesis,
      this.voiceLoadTimeoutMs,
    );
    const voice = findVoice(voices, speaker);

    if (speaker.trim() && !voice) {
      throw new Error(`Web Speech voice not found: ${speaker}`);
    }

    const utterance = new UtteranceCtor(text);
    const lang = options.lang ?? this.language;
    if (lang) {
      utterance.lang = lang;
    }
    if (voice) {
      utterance.voice = voice;
    }

    const rate = options.rate ?? this.rate;
    if (rate !== undefined) {
      utterance.rate = clampNumber(rate, 0.1, 10);
    }

    const pitch = options.pitch ?? this.pitch;
    if (pitch !== undefined) {
      utterance.pitch = clampNumber(pitch, 0, 2);
    }

    const volume = options.volume ?? this.volume;
    if (volume !== undefined) {
      utterance.volume = clampNumber(volume, 0, 1);
    }

    await new Promise<void>((resolve, reject) => {
      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        reject(
          new Error(
            `Web Speech synthesis failed: ${
              'error' in event ? event.error : 'unknown'
            }`,
          ),
        );
      };

      synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    this.getSynthesis().cancel();
  }

  isSpeaking(): boolean {
    const synthesis = this.synthesis ?? getGlobalSpeechSynthesis();
    return Boolean(synthesis?.speaking || synthesis?.pending);
  }

  getTestMessage(textVoiceText?: string): string {
    return textVoiceText || 'Web Speech API voice test';
  }

  setRate(value?: number): void {
    this.rate = value;
  }

  setPitch(value?: number): void {
    this.pitch = value;
  }

  setVolume(value?: number): void {
    this.volume = value;
  }

  setLanguage(value?: string): void {
    this.language = value;
  }

  private getSynthesis(): SpeechSynthesis {
    const synthesis = this.synthesis ?? getGlobalSpeechSynthesis();
    if (!synthesis) {
      throw createUnsupportedError();
    }

    return synthesis;
  }

  private getUtteranceCtor(): typeof SpeechSynthesisUtterance {
    const UtteranceCtor = this.utteranceCtor ?? getGlobalUtteranceCtor();
    if (!UtteranceCtor) {
      throw createUnsupportedError();
    }

    return UtteranceCtor;
  }
}
