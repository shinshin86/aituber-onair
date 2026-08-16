import { BrowserVoiceActivityDetector } from '../src/providers/BrowserVoiceActivityDetector';

class MockMediaStreamAudioSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAnalyserNode {
  fftSize = 2048;
  smoothingTimeConstant = 0;
  disconnect = vi.fn();

  getFloatTimeDomainData(samples: Float32Array): void {
    samples.fill(MockAudioContext.inputLevel);
  }
}

class MockAudioContext {
  static inputLevel = 0;

  state: AudioContextState = 'running';
  private readonly sourceNode = new MockMediaStreamAudioSourceNode();
  private readonly analyserNode = new MockAnalyserNode();

  createMediaStreamSource = vi.fn(() => this.sourceNode);
  createAnalyser = vi.fn(() => this.analyserNode);
  resume = vi.fn(async () => undefined);
  close = vi.fn(async () => {
    this.state = 'closed';
  });
}

interface TestableBrowserVoiceActivityDetector {
  sampleAudioLevel(): void;
}

describe('BrowserVoiceActivityDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T00:00:00Z'));
    MockAudioContext.inputLevel = 0;
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, 'AudioContext');
  });

  it('ends speech from one silence sample after a throttled interval', async () => {
    const onSpeechEnd = vi.fn();
    const detector = new BrowserVoiceActivityDetector(
      {} as MediaStream,
      onSpeechEnd
    );
    const testableDetector =
      detector as unknown as TestableBrowserVoiceActivityDetector;
    await detector.start();

    MockAudioContext.inputLevel = 0.05;
    testableDetector.sampleAudioLevel();
    vi.setSystemTime(Date.now() + 50);
    testableDetector.sampleAudioLevel();
    vi.setSystemTime(Date.now() + 50);
    testableDetector.sampleAudioLevel();

    MockAudioContext.inputLevel = 0;
    vi.setSystemTime(Date.now() + 1_000);
    testableDetector.sampleAudioLevel();

    expect(onSpeechEnd).toHaveBeenCalledOnce();
    detector.stop();
  });
});
