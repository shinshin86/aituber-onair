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
  private speechStartedAt: number | null = null;
  private speechConfirmed = false;
  private silenceStartedAt: number | null = null;
  private stopped = false;

  constructor(
    private readonly stream: MediaStream,
    private readonly onSpeechEnd: () => void
  ) {}

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
    return this.speechStartedAt !== null || this.speechConfirmed;
  }

  stop(): boolean {
    const hasPendingSpeech = this.hasPendingSpeech();
    this.stopped = true;
    this.releaseAudioResources();
    this.resetTurn();
    return hasPendingSpeech;
  }

  private sampleAudioLevel(): void {
    if (!this.analyserNode || !this.samples) return;
    this.analyserNode.getFloatTimeDomainData(this.samples);

    let sumOfSquares = 0;
    for (const sample of this.samples) sumOfSquares += sample * sample;
    const rms = Math.sqrt(sumOfSquares / this.samples.length);
    const now = Date.now();

    if (rms >= RMS_THRESHOLD) {
      if (this.speechStartedAt === null) this.speechStartedAt = now;
      if (now - this.speechStartedAt >= MIN_SPEECH_DURATION_MS) {
        this.speechConfirmed = true;
      }
      this.silenceStartedAt = null;
      return;
    }

    if (!this.speechConfirmed) {
      this.speechStartedAt = null;
      return;
    }
    if (this.silenceStartedAt === null) {
      this.silenceStartedAt = now;
      return;
    }
    if (now - this.silenceStartedAt < SILENCE_DURATION_MS) return;

    this.resetTurn();
    this.onSpeechEnd();
  }

  private resetTurn(): void {
    this.speechStartedAt = null;
    this.speechConfirmed = false;
    this.silenceStartedAt = null;
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

    const audioContext = this.audioContext;
    this.audioContext = null;
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close().catch(() => undefined);
    }
  }
}
