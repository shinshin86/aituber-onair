import type {
  NoiseModulation,
  NoiseModulator,
  NoiseModulatorInput,
} from '../brain/modulation.js';

/** Small protocol: the caller owns the Worker URL and can choose either backend. */
export function createWorkerNoiseModulator(
  worker: Worker,
  timeoutMs = 1000
): NoiseModulator & { dispose(): void } {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error('Invalid worker timeout');
  let nextId = 0;
  let disposed = false;
  const pending = new Map<
    number,
    {
      resolve(value: NoiseModulation): void;
      reject(reason: Error): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  const dispose = () => {
    disposed = true;
    worker.terminate();
    worker.removeEventListener('message', onMessage);
    worker.removeEventListener('error', onError);
    for (const task of pending.values()) {
      clearTimeout(task.timer);
      task.reject(new Error('Brain worker stopped'));
    }
    pending.clear();
  };
  const onMessage = (event: MessageEvent) => {
    const message = event.data;
    if (message?.type !== 'noise-brain-result') return;
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    clearTimeout(task.timer);
    if (message.error) task.reject(new Error(String(message.error)));
    else task.resolve(message.modulation);
  };
  const onError = () => dispose();
  worker.addEventListener('message', onMessage);
  worker.addEventListener('error', onError);
  return {
    dispose,
    modulate(input) {
      if (disposed) return Promise.reject(new Error('Brain worker stopped'));
      return new Promise((resolve, reject) => {
        const id = nextId++;
        const timer = setTimeout(dispose, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        try {
          worker.postMessage({ type: 'noise-brain-input', id, input });
        } catch {
          dispose();
        }
      });
    },
  };
}

interface WorkerEndpoint {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent) => void
  ): void;
  postMessage(message: unknown): void;
}

/** Bind immediately; a loading promise queues requests until initialization finishes. */
export function exposeNoiseBrainWorker(
  scope: WorkerEndpoint,
  brain: NoiseModulator | Promise<NoiseModulator>
): void {
  const ready = Promise.resolve(brain).then(
    (value) => ({ value, error: false as const }),
    () => ({ value: undefined, error: true as const })
  );
  let queue: Promise<void> = Promise.resolve();
  scope.addEventListener('message', (event) => {
    if (event.data?.type !== 'noise-brain-input') return;
    const { id, input } = event.data as {
      id: number;
      input: NoiseModulatorInput;
    };
    queue = queue.then(async () => {
      try {
        const loaded = await ready;
        if (loaded.error) throw new Error('Brain initialization failed');
        scope.postMessage({
          type: 'noise-brain-result',
          id,
          modulation: await loaded.value.modulate(input),
        });
      } catch {
        scope.postMessage({
          type: 'noise-brain-result',
          id,
          error: 'Brain modulation failed',
        });
      }
    });
  });
}
