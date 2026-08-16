import { VoiceActivityTracker } from './VoiceActivityTracker';

const SAMPLE_INTERVAL_MS = 50;
const RMS_THRESHOLD = 0.015;
const MIN_SPEECH_DURATION_MS = 150;
const SILENCE_DURATION_MS = 700;

type AudioContextConstructor = new () => AudioContext;

interface BrowserAudioWindow extends Window {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

function getAudioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const browser = window as BrowserAudioWindow;
  return browser.AudioContext ?? browser.webkitAudioContext;
}

export function supportsBrowserVoiceActivityDetection(): boolean {
  return getAudioContextConstructor() !== undefined;
}

export class BrowserVoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private samples: Float32Array<ArrayBuffer> | null = null;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private lastSampleAtMs: number | null = null;
  private readonly tracker: VoiceActivityTracker;
  private stopped = false;

  constructor(
    private readonly stream: MediaStream,
    private readonly onSpeechEnd: () => void
  ) {
    this.tracker = new VoiceActivityTracker(
      {
        rmsThreshold: RMS_THRESHOLD,
        minSpeechDurationMs: MIN_SPEECH_DURATION_MS,
        silenceDurationMs: SILENCE_DURATION_MS,
      },
      {
        onSpeechStart: () => undefined,
        onSpeechEnd: this.onSpeechEnd,
      }
    );
  }

  async start(): Promise<void> {
    if (this.sampleTimer) return;
    this.stopped = false;
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) {
      throw new Error('The Web Audio API is unavailable.');
    }

    try {
      const audioContext = new AudioContextClass();
      const sourceNode = audioContext.createMediaStreamSource(this.stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0;
      sourceNode.connect(analyserNode);

      this.audioContext = audioContext;
      this.sourceNode = sourceNode;
      this.analyserNode = analyserNode;
      this.samples = new Float32Array(analyserNode.fftSize);

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      if (this.stopped) {
        throw new Error('The browser voice activity detector was stopped.');
      }
      if (audioContext.state !== 'running') {
        throw new Error('The Web Audio API could not start.');
      }

      this.sampleTimer = setInterval(
        () => this.sampleAudioLevel(),
        SAMPLE_INTERVAL_MS
      );
    } catch (cause) {
      this.releaseAudioResources();
      throw cause;
    }
  }

  hasPendingSpeech(): boolean {
    return this.tracker.hasPendingSpeech();
  }

  stop(): boolean {
    const hasPendingSpeech = this.hasPendingSpeech();
    this.stopped = true;
    this.releaseAudioResources();
    this.tracker.reset();
    return hasPendingSpeech;
  }

  private sampleAudioLevel(): void {
    if (!this.analyserNode || !this.samples) return;
    this.analyserNode.getFloatTimeDomainData(this.samples);

    const sampledAtMs = Date.now();
    const durationMs =
      this.lastSampleAtMs === null
        ? SAMPLE_INTERVAL_MS
        : sampledAtMs - this.lastSampleAtMs;
    this.lastSampleAtMs = sampledAtMs;

    let sumOfSquares = 0;
    for (const sample of this.samples) sumOfSquares += sample * sample;
    const rms = Math.sqrt(sumOfSquares / this.samples.length);
    this.tracker.pushFrame(rms, durationMs);
  }

  private releaseAudioResources(): void {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    this.sourceNode?.disconnect();
    this.analyserNode?.disconnect();
    this.sourceNode = null;
    this.analyserNode = null;
    this.samples = null;
    this.lastSampleAtMs = null;

    const audioContext = this.audioContext;
    this.audioContext = null;
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close().catch(() => undefined);
    }
  }
}
