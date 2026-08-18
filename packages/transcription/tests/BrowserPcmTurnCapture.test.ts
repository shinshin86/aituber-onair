import { BrowserPcmTurnCapture } from '../src/providers/BrowserPcmTurnCapture';

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioWorkletNode extends MockAudioNode {
  readonly port = { onmessage: null };
}

class MockAudioContext {
  readonly sampleRate = 48_000;
  readonly state: AudioContextState = 'running';
  readonly destination = new MockAudioNode();
  readonly audioWorklet = { addModule: vi.fn(async () => undefined) };
  readonly sourceNode = new MockAudioNode();
  readonly gainNode = Object.assign(new MockAudioNode(), {
    gain: { value: 1 },
  });

  createMediaStreamSource = vi.fn(() => this.sourceNode);
  createGain = vi.fn(() => this.gainNode);
  resume = vi.fn(async () => undefined);
  close = vi.fn(async () => undefined);
}

class MockBlob {
  constructor(readonly parts: BlobPart[]) {}
}

const createObjectURL = vi.fn((_blob: Blob) => 'blob:worklet');
const revokeObjectURL = vi.fn((_url: string) => undefined);

describe('BrowserPcmTurnCapture', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);
    vi.stubGlobal('Blob', MockBlob);
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  });

  it('batches 128-frame worklet blocks into approximately 32ms messages', async () => {
    const stream = {
      getTracks: () => [],
    } as unknown as MediaStream;
    const capture = new BrowserPcmTurnCapture(stream, {
      silenceDurationMs: 500,
      onTurn: vi.fn(),
    });
    await capture.start();
    const blob = createObjectURL.mock.calls[0]?.[0] as unknown as
      | MockBlob
      | undefined;
    const source = blob?.parts.join('');
    if (!source) throw new Error('Expected the AudioWorklet source.');

    const postMessage = vi.fn();
    class TestAudioWorkletProcessor {
      readonly port = { postMessage };
    }
    let Processor:
      | (new () => {
          process(inputs: Float32Array[][]): boolean;
        })
      | undefined;
    const evaluateWorklet = new Function(
      'AudioWorkletProcessor',
      'registerProcessor',
      'sampleRate',
      source
    );
    evaluateWorklet(
      TestAudioWorkletProcessor,
      (_name: string, RegisteredProcessor: typeof Processor) => {
        Processor = RegisteredProcessor;
      },
      48_000
    );
    if (!Processor) throw new Error('Expected a registered processor.');
    const processor = new Processor();

    for (let block = 0; block < 11; block += 1) {
      processor.process([[new Float32Array(128)]]);
    }
    expect(postMessage).not.toHaveBeenCalled();

    processor.process([[new Float32Array(128)]]);

    expect(postMessage).toHaveBeenCalledOnce();
    const [chunk, transfer] = postMessage.mock.calls[0] ?? [];
    expect(chunk).toBeInstanceOf(Float32Array);
    expect(chunk).toHaveLength(1_536);
    expect(transfer).toEqual([chunk.buffer]);
    await capture.stop();
  });
});
