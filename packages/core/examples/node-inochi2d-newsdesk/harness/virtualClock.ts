export type VirtualAnimationFrameCallback = (timestamp: number) => void;

/** Deterministic mulberry32 random-number generator. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Browser-style virtual clock whose queued animation callbacks run only when
 * the caller advances and flushes a frame.
 */
export class VirtualClock {
  private timestampMs = 0;
  private nextAnimationFrameId = 1;
  private animationFrames = new Map<number, VirtualAnimationFrameCallback>();
  private nextRandom = createSeededRandom(0);

  /** Reset time, queued callbacks, callback IDs, and the seeded RNG. */
  reset(seed: number, timestampMs = 0): void {
    this.timestampMs = timestampMs;
    this.nextAnimationFrameId = 1;
    this.animationFrames.clear();
    this.nextRandom = createSeededRandom(seed);
  }

  /** Current virtual time in milliseconds. */
  now(): number {
    return this.timestampMs;
  }

  /** Advance virtual time without executing animation callbacks. */
  advance(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error('Virtual clock deltaSeconds must be non-negative.');
    }
    this.timestampMs += deltaSeconds * 1000;
  }

  /** Queue a callback in browser requestAnimationFrame insertion order. */
  requestAnimationFrame(callback: VirtualAnimationFrameCallback): number {
    const id = this.nextAnimationFrameId;
    this.nextAnimationFrameId += 1;
    this.animationFrames.set(id, callback);
    return id;
  }

  /** Cancel one queued callback. */
  cancelAnimationFrame(id: number): void {
    this.animationFrames.delete(id);
  }

  /** Number of callbacks waiting for the next virtual frame. */
  pendingAnimationFrames(): number {
    return this.animationFrames.size;
  }

  /**
   * Flush all callbacks that were queued at the start of this frame. Callbacks
   * scheduled during the flush remain queued for the next virtual timestamp,
   * matching browser rAF semantics.
   */
  flushAnimationFrame(): number {
    const callbacks = [...this.animationFrames.values()];
    this.animationFrames.clear();
    for (const callback of callbacks) callback(this.timestampMs);
    return callbacks.length;
  }

  /** Return the next deterministic random value in the range [0, 1). */
  random(): number {
    return this.nextRandom();
  }
}

/** Install one virtual clock into the browser before importing the bridge. */
export function installBrowserVirtualClock(clock: VirtualClock): void {
  window.requestAnimationFrame = (callback) =>
    clock.requestAnimationFrame(callback);
  window.cancelAnimationFrame = (id) => clock.cancelAnimationFrame(id);
  Object.defineProperty(window.performance, 'now', {
    configurable: true,
    value: () => clock.now(),
  });
  Date.now = () => Math.floor(clock.now());
  Math.random = () => clock.random();
}
