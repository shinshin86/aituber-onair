import {
  VoiceActivityTracker,
  type VoiceActivityTrackerOptions,
} from './VoiceActivityTracker';

interface PcmChunk {
  audio: Float32Array;
  aboveThreshold: boolean;
  speechSamples: number;
}

export interface CapturedAudioTurn {
  audio: Float32Array;
  sampleRate: number;
  confirmedSpeechDurationMs: number;
}

export interface PcmTurnAssemblerOptions extends VoiceActivityTrackerOptions {
  sampleRate: number;
  preRollMs: number;
  maxUtteranceMs: number;
}

function calculateRms(audio: Float32Array): number {
  if (audio.length === 0) return 0;

  let sumOfSquares = 0;
  for (const sample of audio) sumOfSquares += sample * sample;
  return Math.sqrt(sumOfSquares / audio.length);
}

export class PcmTurnAssembler {
  private readonly tracker: VoiceActivityTracker;
  private readonly preRollSampleLimit: number;
  private readonly maxUtteranceSamples: number;
  private preRollChunks: PcmChunk[] = [];
  private preRollSamples = 0;
  private turnChunks: PcmChunk[] = [];
  private turnSamples = 0;
  private speechActive = false;
  private pendingTurns: CapturedAudioTurn[] = [];

  constructor(private readonly options: PcmTurnAssemblerOptions) {
    this.preRollSampleLimit = Math.max(
      0,
      Math.floor((options.sampleRate * options.preRollMs) / 1000)
    );
    this.maxUtteranceSamples = Math.max(
      1,
      Math.floor((options.sampleRate * options.maxUtteranceMs) / 1000)
    );
    this.tracker = new VoiceActivityTracker(options, {
      onSpeechStart: () => this.startTurn(),
      onSpeechEnd: () => this.endTurn(),
    });
  }

  pushChunk(audio: Float32Array): CapturedAudioTurn[] {
    if (audio.length === 0) return [];

    const rms = calculateRms(audio);
    const durationMs = (audio.length / this.options.sampleRate) * 1000;
    const isSpeech = Number.isFinite(rms) && rms >= this.options.rmsThreshold;
    const chunk: PcmChunk = {
      audio,
      aboveThreshold: isSpeech,
      speechSamples: this.speechActive && isSpeech ? audio.length : 0,
    };

    if (this.speechActive) {
      this.appendTurnChunk(chunk);
      this.drainMaximumTurns();
    } else {
      this.appendPreRollChunk(chunk);
    }

    this.tracker.pushFrame(rms, durationMs);
    if (this.speechActive && isSpeech && chunk.speechSamples === 0) {
      if (!this.turnChunks.includes(chunk)) this.appendTurnChunk(chunk);
      chunk.speechSamples = chunk.audio.length;
    }

    this.drainMaximumTurns();

    return this.takePendingTurns();
  }

  flush(): CapturedAudioTurn[] {
    if (this.speechActive && this.turnSamples > 0) {
      this.pendingTurns.push(this.takeTurn(this.turnSamples));
    }
    const turns = this.takePendingTurns();
    this.reset();
    return turns;
  }

  reset(): void {
    this.tracker.reset();
    this.preRollChunks = [];
    this.preRollSamples = 0;
    this.turnChunks = [];
    this.turnSamples = 0;
    this.speechActive = false;
    this.pendingTurns = [];
  }

  hasConfirmedSpeech(): boolean {
    return this.speechActive;
  }

  private startTurn(): void {
    this.speechActive = true;
    this.turnChunks = this.preRollChunks;
    this.turnSamples = this.preRollSamples;
    for (let index = this.turnChunks.length - 1; index >= 0; index -= 1) {
      const chunk = this.turnChunks[index];
      if (!chunk?.aboveThreshold) break;
      chunk.speechSamples = chunk.audio.length;
    }
    this.preRollChunks = [];
    this.preRollSamples = 0;
  }

  private endTurn(): void {
    if (this.turnSamples > 0) {
      this.pendingTurns.push(this.takeTurn(this.turnSamples));
    }
    this.speechActive = false;
  }

  private appendPreRollChunk(chunk: PcmChunk): void {
    if (this.preRollSampleLimit === 0) return;

    this.preRollChunks.push(chunk);
    this.preRollSamples += chunk.audio.length;
    let excessSamples = this.preRollSamples - this.preRollSampleLimit;

    while (excessSamples > 0) {
      const first = this.preRollChunks[0];
      if (!first) break;
      if (first.audio.length <= excessSamples) {
        this.preRollChunks.shift();
        this.preRollSamples -= first.audio.length;
        excessSamples -= first.audio.length;
        continue;
      }

      first.audio = first.audio.slice(excessSamples);
      this.preRollSamples -= excessSamples;
      excessSamples = 0;
    }
  }

  private appendTurnChunk(chunk: PcmChunk): void {
    this.turnChunks.push(chunk);
    this.turnSamples += chunk.audio.length;
  }

  private drainMaximumTurns(): void {
    while (this.speechActive && this.turnSamples >= this.maxUtteranceSamples) {
      this.pendingTurns.push(this.takeTurn(this.maxUtteranceSamples));
    }
  }

  private takeTurn(sampleCount: number): CapturedAudioTurn {
    const audio = new Float32Array(sampleCount);
    let outputOffset = 0;
    let speechSamples = 0;

    while (outputOffset < sampleCount) {
      const chunk = this.turnChunks[0];
      if (!chunk) break;

      const takeCount = Math.min(
        chunk.audio.length,
        sampleCount - outputOffset
      );
      audio.set(chunk.audio.subarray(0, takeCount), outputOffset);
      outputOffset += takeCount;

      const takenSpeechSamples =
        chunk.speechSamples === 0
          ? 0
          : Math.min(chunk.speechSamples, takeCount);
      speechSamples += takenSpeechSamples;

      if (takeCount === chunk.audio.length) {
        this.turnChunks.shift();
      } else {
        chunk.audio = chunk.audio.slice(takeCount);
        chunk.speechSamples -= takenSpeechSamples;
      }
    }

    this.turnSamples -= sampleCount;
    return {
      audio,
      sampleRate: this.options.sampleRate,
      confirmedSpeechDurationMs:
        (speechSamples / this.options.sampleRate) * 1000,
    };
  }

  private takePendingTurns(): CapturedAudioTurn[] {
    const turns = this.pendingTurns;
    this.pendingTurns = [];
    return turns;
  }
}
