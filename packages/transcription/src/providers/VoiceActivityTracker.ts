export interface VoiceActivityTrackerOptions {
  rmsThreshold: number;
  minSpeechDurationMs: number;
  silenceDurationMs: number;
}

export interface VoiceActivityTrackerCallbacks {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
}

export class VoiceActivityTracker {
  private candidateSpeechDurationMs = 0;
  private confirmedSpeech = false;
  private silenceDurationMs = 0;

  constructor(
    private readonly options: VoiceActivityTrackerOptions,
    private readonly callbacks: VoiceActivityTrackerCallbacks
  ) {}

  pushFrame(rms: number, durationMs: number): void {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;

    if (Number.isFinite(rms) && rms >= this.options.rmsThreshold) {
      this.candidateSpeechDurationMs += durationMs;
      this.silenceDurationMs = 0;

      if (
        !this.confirmedSpeech &&
        this.candidateSpeechDurationMs >= this.options.minSpeechDurationMs
      ) {
        this.confirmedSpeech = true;
        this.callbacks.onSpeechStart();
      }
      return;
    }

    if (!this.confirmedSpeech) {
      this.candidateSpeechDurationMs = 0;
      return;
    }

    this.silenceDurationMs += durationMs;
    if (this.silenceDurationMs < this.options.silenceDurationMs) return;

    this.reset();
    this.callbacks.onSpeechEnd();
  }

  reset(): void {
    this.candidateSpeechDurationMs = 0;
    this.confirmedSpeech = false;
    this.silenceDurationMs = 0;
  }

  hasPendingSpeech(): boolean {
    return this.candidateSpeechDurationMs > 0 || this.confirmedSpeech;
  }
}
