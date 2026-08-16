import { LocalWhisperWorkerClient } from '../src/providers/LocalWhisperWorkerClient';
import type {
  LocalWhisperWorkerRequest,
  LocalWhisperWorkerResponse,
} from '../src/providers/localWhisperProtocol';

interface PostedMessage {
  message: LocalWhisperWorkerRequest;
  transfer: Transferable[];
}

class MockWorker {
  static instances: MockWorker[] = [];

  readonly postedMessages: PostedMessage[] = [];
  readonly terminate = vi.fn();
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  constructor(
    readonly url: string | URL,
    readonly options: WorkerOptions
  ) {
    MockWorker.instances.push(this);
  }

  postMessage(message: LocalWhisperWorkerRequest, transfer: Transferable[]) {
    const cloned = structuredClone(message, { transfer });
    this.postedMessages.push({ message: cloned, transfer });
  }

  emit(response: LocalWhisperWorkerResponse): void {
    this.onmessage?.(new MessageEvent('message', { data: response }));
  }

  fail(message: string): void {
    this.onerror?.(new ErrorEvent('error', { message }));
  }
}

function currentWorker(): MockWorker {
  const worker = MockWorker.instances.at(-1);
  if (!worker) throw new Error('Expected a worker instance.');
  return worker;
}

async function createLoadedClient(): Promise<LocalWhisperWorkerClient> {
  const client = new LocalWhisperWorkerClient('/local-whisper.worker.js');
  const loadPromise = client.load();
  currentWorker().emit({ type: 'ready' });
  await loadPromise;
  return client;
}

describe('LocalWhisperWorkerClient', () => {
  beforeEach(() => {
    MockWorker.instances = [];
    vi.stubGlobal('Worker', MockWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the model once and resolves on ready', async () => {
    const client = new LocalWhisperWorkerClient('/worker.js');

    const firstLoad = client.load();
    const secondLoad = client.load();
    const worker = currentWorker();
    worker.emit({ type: 'ready' });
    await Promise.all([firstLoad, secondLoad]);

    expect(worker.url).toBe('/worker.js');
    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.postedMessages.map(({ message }) => message)).toEqual([
      { type: 'load' },
    ]);
  });

  it('forwards normalized progress messages and lets listeners unsubscribe', () => {
    const client = new LocalWhisperWorkerClient('/worker.js');
    const listener = vi.fn();
    const unsubscribe = client.onProgress(listener);
    const progress = {
      phase: 'download' as const,
      file: 'model.onnx',
      loadedBytes: 25,
      totalBytes: 100,
      progress: 0.25,
    };

    currentWorker().emit({ type: 'progress', progress });
    unsubscribe();
    currentWorker().emit({
      type: 'progress',
      progress: { phase: 'initialize' },
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(progress);
  });

  it('resolves transcription by request ID and transfers audio ownership', async () => {
    const client = await createLoadedClient();
    const worker = currentWorker();
    const audio = new Float32Array([0.1, -0.1]);

    const resultPromise = client.transcribe({ audio, language: 'ja' });
    await vi.waitFor(() => {
      expect(worker.postedMessages).toHaveLength(2);
    });
    const posted = worker.postedMessages[1];
    const request = posted?.message;
    if (!request || request.type !== 'transcribe') {
      throw new Error('Expected a transcription request.');
    }
    worker.emit({
      type: 'result',
      requestId: request.requestId,
      text: 'こんにちは',
    });

    await expect(resultPromise).resolves.toBe('こんにちは');
    expect(posted.transfer).toHaveLength(1);
    expect(audio.byteLength).toBe(0);
  });

  it('posts multiple inference requests sequentially', async () => {
    const client = await createLoadedClient();
    const worker = currentWorker();

    const first = client.transcribe({ audio: new Float32Array([0.1]) });
    const second = client.transcribe({ audio: new Float32Array([0.2]) });
    await vi.waitFor(() => {
      expect(worker.postedMessages).toHaveLength(2);
    });

    const firstRequest = worker.postedMessages[1]?.message;
    if (!firstRequest || firstRequest.type !== 'transcribe') {
      throw new Error('Expected the first transcription request.');
    }
    worker.emit({
      type: 'result',
      requestId: firstRequest.requestId,
      text: 'first',
    });
    await first;
    await vi.waitFor(() => {
      expect(worker.postedMessages).toHaveLength(3);
    });
    const secondRequest = worker.postedMessages[2]?.message;
    if (!secondRequest || secondRequest.type !== 'transcribe') {
      throw new Error('Expected the second transcription request.');
    }
    worker.emit({
      type: 'result',
      requestId: secondRequest.requestId,
      text: 'second',
    });

    await expect(second).resolves.toBe('second');
  });

  it('rejects pending work when the worker fails', async () => {
    const client = await createLoadedClient();
    const resultPromise = client.transcribe({
      audio: new Float32Array([0.1]),
    });
    await Promise.resolve();

    currentWorker().fail('WebGPU device lost');

    await expect(resultPromise).rejects.toThrow('WebGPU device lost');
    await expect(
      client.transcribe({ audio: new Float32Array([0.2]) })
    ).rejects.toThrow('WebGPU device lost');
  });

  it('rejects loading and queued inference when disposed', async () => {
    const client = new LocalWhisperWorkerClient('/worker.js');
    const loadPromise = client.load();
    const resultPromise = client.transcribe({
      audio: new Float32Array([0.1]),
    });

    client.dispose();

    await expect(loadPromise).rejects.toThrow('disposed');
    await expect(resultPromise).rejects.toThrow('disposed');
    expect(currentWorker().terminate).toHaveBeenCalledOnce();
  });
});
