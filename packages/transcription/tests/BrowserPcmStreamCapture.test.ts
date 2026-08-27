import {
  BrowserPcmStreamCapture,
  float32ToPcm16LittleEndian,
} from '../src/providers/BrowserPcmStreamCapture';

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioWorkletNode extends MockAudioNode {
  static instances: MockAudioWorkletNode[] = [];

  readonly port = {
    onmessage: null as ((event: MessageEvent<unknown>) => void) | null,
    postMessage: vi.fn((message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message &&
        message.type === 'flush'
      ) {
        this.port.onmessage?.(
          new MessageEvent('message', { data: { type: 'flushed' } })
        );
      }
    }),
  };

  constructor() {
    super();
    MockAudioWorkletNode.instances.push(this);
  }
}

class MockAudioContext {
  readonly sampleRate = 48_000;
  state: AudioContextState = 'running';
  readonly destination = new MockAudioNode();
  readonly audioWorklet = { addModule: vi.fn(async () => undefined) };
  readonly sourceNode = new MockAudioNode();
  readonly gainNode = Object.assign(new MockAudioNode(), {
    gain: { value: 1 },
  });

  createMediaStreamSource = vi.fn(() => this.sourceNode);
  createGain = vi.fn(() => this.gainNode);
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

class MockBlob {
  constructor(readonly parts: BlobPart[]) {}
}

const createObjectURL = vi.fn((_blob: Blob) => 'blob:stream-worklet');
const revokeObjectURL = vi.fn((_url: string) => undefined);

describe('BrowserPcmStreamCapture', () => {
  beforeEach(() => {
    MockAudioWorkletNode.instances = [];
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);
    vi.stubGlobal('Blob', MockBlob);
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

  it('converts normalized float samples to signed little-endian PCM16', () => {
    const output = float32ToPcm16LittleEndian(
      new Float32Array([-1, -0.5, 0, 0.5, 1])
    );
    const view = new DataView(output.buffer);

    expect(
      Array.from({ length: 5 }, (_, index) => view.getInt16(index * 2, true))
    ).toEqual([-32_768, -16_384, 0, 16_384, 32_767]);
  });

  it('resamples worklet chunks to 16kHz and emits PCM16 bytes', async () => {
    const track = { stop: vi.fn() };
    const stream = {
      getTracks: () => [track],
    } as unknown as MediaStream;
    const onChunk = vi.fn();
    const capture = new BrowserPcmStreamCapture(stream, { onChunk });

    await capture.start();
    const worklet = MockAudioWorkletNode.instances[0];
    worklet?.port.onmessage?.(
      new MessageEvent('message', {
        data: new Float32Array(4_800).fill(0.5),
      })
    );

    expect(onChunk).toHaveBeenCalledOnce();
    expect(onChunk.mock.calls[0]?.[0]).toBeInstanceOf(Uint8Array);
    expect(onChunk.mock.calls[0]?.[0]).toHaveLength(3_200);

    await capture.stop();
    expect(worklet?.port.postMessage).toHaveBeenCalledWith({ type: 'flush' });
    expect(track.stop).toHaveBeenCalledOnce();
  });
});
