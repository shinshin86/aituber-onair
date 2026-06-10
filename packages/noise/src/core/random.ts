export interface RandomSource {
  next(): number;
}

export function createSeededRandom(
  seed: string | number | undefined
): RandomSource {
  let state =
    seed === undefined
      ? Date.now()
      : hashSeed(typeof seed === 'number' ? `${seed}` : seed);

  if (state === 0) {
    state = 0x6d2b79f5;
  }

  return {
    next() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
