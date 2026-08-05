interface PendingRead<T> {
  readonly resolve: (result: IteratorResult<T>) => void;
  readonly reject: (error: unknown) => void;
}

type QueueState = 'open' | 'closed' | 'failed';

/**
 * A small browser-safe AsyncIterable queue used to decouple Turn execution
 * from event consumption. Values already queued are drained before a terminal
 * failure is rethrown to the consumer.
 */
export class AsyncEventQueue<T> implements AsyncIterableIterator<T> {
  private readonly values: T[] = [];
  private readonly readers: PendingRead<T>[] = [];
  private state: QueueState = 'open';
  private failure: unknown;

  constructor(private readonly onReturn?: () => void) {}

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }

  push(value: T): boolean {
    if (this.state !== 'open') return false;
    const reader = this.readers.shift();
    if (reader) {
      reader.resolve({ done: false, value });
    } else {
      this.values.push(value);
    }
    return true;
  }

  close(): void {
    if (this.state !== 'open') return;
    this.state = 'closed';
    this.resolveTerminalReaders();
  }

  fail(error: unknown): void {
    if (this.state !== 'open') return;
    this.state = 'failed';
    this.failure = error;
    this.resolveTerminalReaders();
  }

  next(): Promise<IteratorResult<T>> {
    const value = this.values.shift();
    if (value !== undefined) {
      return Promise.resolve({ done: false, value });
    }
    if (this.state === 'closed') {
      return Promise.resolve({ done: true, value: undefined });
    }
    if (this.state === 'failed') {
      return Promise.reject(this.failure);
    }
    return new Promise<IteratorResult<T>>((resolve, reject) => {
      this.readers.push({ resolve, reject });
    });
  }

  async return(): Promise<IteratorResult<T>> {
    const wasOpen = this.state === 'open';
    this.values.length = 0;
    if (wasOpen) {
      this.state = 'closed';
      this.resolveTerminalReaders();
      this.onReturn?.();
    }
    return { done: true, value: undefined };
  }

  async throw(error: unknown): Promise<IteratorResult<T>> {
    const wasOpen = this.state === 'open';
    this.values.length = 0;
    if (wasOpen) {
      this.state = 'failed';
      this.failure = error;
      this.resolveTerminalReaders();
      this.onReturn?.();
    }
    throw error;
  }

  private resolveTerminalReaders(): void {
    if (this.values.length > 0) return;
    const readers = this.readers.splice(0);
    for (const reader of readers) {
      if (this.state === 'failed') {
        reader.reject(this.failure);
      } else {
        reader.resolve({ done: true, value: undefined });
      }
    }
  }
}
