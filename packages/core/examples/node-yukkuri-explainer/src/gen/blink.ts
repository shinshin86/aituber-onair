function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a deterministic per-frame blink schedule (1 = eyes closed). Blinks
 * happen every 2-6 seconds and last 0.1-0.2 seconds; very short clips still
 * get one blink near the middle.
 */
export function createBlinkSchedule(
  totalFrames: number,
  fps: number,
  seed = 42,
): Uint8Array {
  const closed = new Uint8Array(totalFrames);
  const random = mulberry32(seed);
  let cursor = 0;
  while (cursor < totalFrames) {
    const start = Math.round(cursor + (2 + random() * 4) * fps);
    const end = Math.min(
      totalFrames,
      start + Math.max(1, Math.round((0.1 + random() * 0.1) * fps)),
    );
    for (let frame = start; frame < end; frame += 1) closed[frame] = 1;
    cursor = end;
  }
  if (
    totalFrames >= Math.max(1, Math.round(fps * 0.5)) &&
    !closed.includes(1)
  ) {
    const start = Math.max(0, Math.floor(totalFrames / 2));
    const end = Math.min(
      totalFrames,
      start + Math.max(1, Math.round(fps * 0.12)),
    );
    for (let frame = start; frame < end; frame += 1) closed[frame] = 1;
  }
  return closed;
}
