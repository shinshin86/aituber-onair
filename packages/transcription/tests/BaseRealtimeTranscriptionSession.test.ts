import { BaseRealtimeTranscriptionSession } from '../src/BaseRealtimeTranscriptionSession';
import type { TranscriptionProgress } from '../src/types';

class TestTranscriptionSession extends BaseRealtimeTranscriptionSession {
  constructor() {
    super('web-speech', {
      interimResults: false,
      multipleLanguages: false,
      keywords: false,
      configurableDelay: false,
    });
  }

  async start(): Promise<void> {}

  async stop(): Promise<void> {}

  async dispose(): Promise<void> {
    this.clearListeners();
  }

  reportProgress(progress: TranscriptionProgress): void {
    this.emitProgress(progress);
  }
}

describe('BaseRealtimeTranscriptionSession', () => {
  it('registers, unsubscribes, and clears progress listeners', async () => {
    const session = new TestTranscriptionSession();
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    const unsubscribe = session.onProgress(firstListener);
    session.onProgress(secondListener);
    const progress: TranscriptionProgress = {
      phase: 'download',
      file: 'model.onnx',
      loadedBytes: 25,
      totalBytes: 100,
      progress: 0.25,
    };

    session.reportProgress(progress);
    unsubscribe();
    session.reportProgress({ phase: 'initialize' });
    await session.dispose();
    session.reportProgress({ phase: 'ready' });

    expect(firstListener).toHaveBeenCalledOnce();
    expect(firstListener).toHaveBeenCalledWith(progress);
    expect(secondListener).toHaveBeenCalledTimes(2);
    expect(secondListener).toHaveBeenLastCalledWith({ phase: 'initialize' });
  });
});
