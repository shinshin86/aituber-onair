import { PcmTurnAssembler, type CapturedAudioTurn } from './PcmTurnAssembler';

const TARGET_SAMPLE_RATE = 16_000;
const RMS_THRESHOLD = 0.015;
const MIN_SPEECH_DURATION_MS = 150;
const PRE_ROLL_MS = 200;
const MAX_UTTERANCE_MS = 30_000;
const WORKLET_PROCESSOR_NAME = 'aituber-pcm-capture';

const WORKLET_SOURCE = `
class AITuberPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleCount = Math.max(128, Math.round(sampleRate * 0.032));
    this.buffer = new Float32Array(this.targetSampleCount);
    this.bufferOffset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (channel && channel.length > 0) {
      let sourceOffset = 0;
      while (sourceOffset < channel.length) {
        const copyCount = Math.min(
          channel.length - sourceOffset,
          this.targetSampleCount - this.bufferOffset
        );
        this.buffer.set(
          channel.subarray(sourceOffset, sourceOffset + copyCount),
          this.bufferOffset
        );
        sourceOffset += copyCount;
        this.bufferOffset += copyCount;

        if (this.bufferOffset === this.targetSampleCount) {
          const chunk = this.buffer;
          this.port.postMessage(chunk, [chunk.buffer]);
          this.buffer = new Float32Array(this.targetSampleCount);
          this.bufferOffset = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('${WORKLET_PROCESSOR_NAME}', AITuberPcmCaptureProcessor);
`;

type AudioContextConstructor = new (
  contextOptions?: AudioContextOptions
) => AudioContext;

interface BrowserAudioWindow extends Window {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

export interface BrowserPcmTurnCaptureOptions {
  silenceDurationMs: number;
  onTurn: (turn: CapturedAudioTurn) => void;
}

function getAudioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const browser = window as BrowserAudioWindow;
  return browser.AudioContext ?? browser.webkitAudioContext;
}

function createAudioContext(
  AudioContextClass: AudioContextConstructor
): AudioContext {
  try {
    return new AudioContextClass({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    return new AudioContextClass();
  }
}

export class BrowserPcmTurnCapture {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private muteGainNode: GainNode | null = null;
  private assembler: PcmTurnAssembler | null = null;
  private acceptingSamples = false;

  constructor(
    private readonly stream: MediaStream,
    private readonly options: BrowserPcmTurnCaptureOptions
  ) {}

  async start(): Promise<void> {
    if (this.acceptingSamples) return;
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) {
      throw new Error('The Web Audio API is unavailable.');
    }
    if (typeof AudioWorkletNode === 'undefined') {
      throw new Error('AudioWorkletNode is unavailable.');
    }

    try {
      const audioContext = createAudioContext(AudioContextClass);
      this.audioContext = audioContext;
      if (!audioContext.audioWorklet) {
        throw new Error('AudioWorklet is unavailable.');
      }

      const workletUrl = URL.createObjectURL(
        new Blob([WORKLET_SOURCE], { type: 'text/javascript' })
      );
      try {
        await audioContext.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }

      const sourceNode = audioContext.createMediaStreamSource(this.stream);
      const workletNode = new AudioWorkletNode(
        audioContext,
        WORKLET_PROCESSOR_NAME,
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1,
          channelCountMode: 'explicit',
        }
      );
      const muteGainNode = audioContext.createGain();
      muteGainNode.gain.value = 0;
      sourceNode.connect(workletNode);
      workletNode.connect(muteGainNode);
      muteGainNode.connect(audioContext.destination);

      this.sourceNode = sourceNode;
      this.workletNode = workletNode;
      this.muteGainNode = muteGainNode;
      this.assembler = new PcmTurnAssembler({
        sampleRate: audioContext.sampleRate,
        rmsThreshold: RMS_THRESHOLD,
        minSpeechDurationMs: MIN_SPEECH_DURATION_MS,
        silenceDurationMs: this.options.silenceDurationMs,
        preRollMs: PRE_ROLL_MS,
        maxUtteranceMs: MAX_UTTERANCE_MS,
      });
      workletNode.port.onmessage = (event: MessageEvent<unknown>) => {
        if (!this.acceptingSamples || !(event.data instanceof Float32Array)) {
          return;
        }
        this.emitTurns(this.assembler?.pushChunk(event.data) ?? []);
      };

      if (audioContext.state === 'suspended') await audioContext.resume();
      if (audioContext.state !== 'running') {
        throw new Error('The Web Audio API could not start.');
      }
      this.acceptingSamples = true;
    } catch (cause) {
      await this.releaseResources();
      throw cause;
    }
  }

  async stop(): Promise<void> {
    this.acceptingSamples = false;
    this.emitTurns(this.assembler?.flush() ?? []);
    await this.releaseResources();
  }

  private emitTurns(turns: CapturedAudioTurn[]): void {
    for (const turn of turns) this.options.onTurn(turn);
  }

  private async releaseResources(): Promise<void> {
    this.acceptingSamples = false;
    if (this.workletNode) this.workletNode.port.onmessage = null;
    this.sourceNode?.disconnect();
    this.workletNode?.disconnect();
    this.muteGainNode?.disconnect();
    this.sourceNode = null;
    this.workletNode = null;
    this.muteGainNode = null;
    this.assembler?.reset();
    this.assembler = null;

    for (const track of this.stream.getTracks()) track.stop();

    const audioContext = this.audioContext;
    this.audioContext = null;
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close().catch(() => undefined);
    }
  }
}
