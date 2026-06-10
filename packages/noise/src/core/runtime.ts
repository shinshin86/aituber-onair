export type NoiseRuntime = 'browser' | 'node' | 'unknown';

export function detectNoiseRuntime(): NoiseRuntime {
  if (
    typeof globalThis.window !== 'undefined' &&
    typeof globalThis.document !== 'undefined'
  ) {
    return 'browser';
  }

  const processLike = (globalThis as { process?: { versions?: unknown } })
    .process;

  if (processLike?.versions) {
    return 'node';
  }

  return 'unknown';
}
