import { resampleTo16k } from './resampleTo16k';

const TARGET_SAMPLE_RATE = 16_000;
const CHUNK_DURATION_MS = 100;
const FLUSH_TIMEOUT_MS = 500;
const WORKLET_PROCESSOR_NAME = 'aituber-pcm-stream-capture';

const WORKLET_SOURCE = `
class AITuberPcmStreamCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleCount = Math.max(
      128,
      Math.round(sampleRate * ${CHUNK_DURATION_MS / 1000})
    );
    this.buffer = new Float32Array(this.targetSampleCount);
    this.bufferOffset = 0;
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === 'flush') {
        if (this.bufferOffset > 0) {
          const chunk = this.buffer.slice(0, this.bufferOffset);
          this.port.postMessage(chunk, [chunk.buffer]);
          this.buffer = new Float32Array(this.targetSampleCount);
          this.bufferOffset = 0;
        }
        this.port.postMessage({ type: 'flushed' });
      }
    };
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

registerProcessor(
  '${WORKLET_PROCESSOR_NAME}',
  AITuberPcmStreamCaptureProcessor
);
`;

type AudioContextConstructor = new (
  contextOptions?: AudioContextOptions
) => AudioContext;

interface BrowserAudioWindow extends Window {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

export interface BrowserPcmStreamCaptureOptions {
  onChunk: (pcm16: Uint8Array) => void;
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

export function float32ToPcm16LittleEndian(input: Float32Array): Uint8Array {
  const output = new Uint8Array(input.length * 2);
  const view = new DataView(output.buffer);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(index * 2, Math.round(value), true);
  }
  return output;
}

export class BrowserPcmStreamCapture {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private muteGainNode: GainNode | null = null;
  private acceptingSamples = false;
  private flushResolve: (() => void) | null = null;

  constructor(
    private readonly stream: MediaStream,
    private readonly options: BrowserPcmStreamCaptureOptions
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
      workletNode.port.onmessage = (event: MessageEvent<unknown>) => {
        if (
          typeof event.data === 'object' &&
          event.data !== null &&
          'type' in event.data &&
          event.data.type === 'flushed'
        ) {
          this.flushResolve?.();
          this.flushResolve = null;
          return;
        }
        if (!this.acceptingSamples || !(event.data instanceof Float32Array)) {
          return;
        }
        const samples = resampleTo16k(event.data, audioContext.sampleRate);
        this.options.onChunk(float32ToPcm16LittleEndian(samples));
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
    if (this.acceptingSamples && this.workletNode) {
      await this.flush(this.workletNode).catch(() => undefined);
    }
    this.acceptingSamples = false;
    await this.releaseResources();
  }

  private flush(workletNode: AudioWorkletNode): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.flushResolve === complete) this.flushResolve = null;
        resolve();
      }, FLUSH_TIMEOUT_MS);
      const complete = () => {
        clearTimeout(timer);
        resolve();
      };
      this.flushResolve = complete;
      workletNode.port.postMessage({ type: 'flush' });
    });
  }

  private async releaseResources(): Promise<void> {
    this.acceptingSamples = false;
    this.flushResolve?.();
    this.flushResolve = null;
    if (this.workletNode) this.workletNode.port.onmessage = null;
    this.sourceNode?.disconnect();
    this.workletNode?.disconnect();
    this.muteGainNode?.disconnect();
    this.sourceNode = null;
    this.workletNode = null;
    this.muteGainNode = null;

    for (const track of this.stream.getTracks()) track.stop();

    const audioContext = this.audioContext;
    this.audioContext = null;
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close().catch(() => undefined);
    }
  }
}
