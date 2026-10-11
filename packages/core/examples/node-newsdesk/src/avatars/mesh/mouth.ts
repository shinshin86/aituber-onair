import type { DecodedAudio } from '../../gen/audio.js';

// mouth analysis: short RMS windows so the dip between morae (~7/s) survives
const ENVELOPE_HOP_SEC = 0.01;
const ENVELOPE_WINDOW_SEC = 0.02;
/** Local range used to find the rise and fall of each mora. */
const SYLLABLE_SPAN_SEC = 0.07;
/** Below this share of the local peak-to-trough range a stretch counts as a held sound. */
const HELD_SOUND_RATIO = 0.3;

/** RMS envelope of the samples, one value per `ENVELOPE_HOP_SEC`. */
export function createEnvelope(
  audio: Pick<DecodedAudio, 'samples' | 'sampleRate'>,
): Float32Array {
  const hop = Math.max(1, Math.round(audio.sampleRate * ENVELOPE_HOP_SEC));
  const half = Math.round((audio.sampleRate * ENVELOPE_WINDOW_SEC) / 2);
  const count = Math.ceil(audio.samples.length / hop);
  const envelope = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const center = i * hop + Math.floor(hop / 2);
    const start = Math.max(0, center - half);
    const end = Math.min(audio.samples.length, center + half);
    let sumSq = 0;
    for (let index = start; index < end; index += 1)
      sumSq += audio.samples[index] ** 2;
    envelope[i] = Math.sqrt(sumSq / Math.max(1, end - start));
  }
  return envelope;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))
  ];
}

/**
 * Derive a mouth-open value (0..1) per video frame.
 *
 * Loudness alone keeps the mouth open through a whole phrase: voices are loud
 * enough to sit at any fixed ceiling, and per-frame RMS with smoothing hides the
 * short dips between morae. So the envelope is taken every 10 ms, normalized to
 * the voice's own level (a high percentile of voiced windows instead of a fixed
 * ceiling), and each point is scaled by where it sits between the local trough
 * and peak: the mouth opens on each mora and closes in the dip before the next.
 * Held sounds (little local variation) keep the mouth open.
 */
export function createMouthValues(
  audio: Pick<DecodedAudio, 'samples' | 'sampleRate'>,
  fps: number,
  totalFrames: number,
): Float32Array {
  const envelope = createEnvelope(audio);
  const peak = envelope.reduce((max, v) => Math.max(max, v), 0);
  const values = new Float32Array(totalFrames);
  if (peak <= 1e-6) return values;
  const voiced = Array.from(envelope).filter((v) => v > peak * 0.08);
  const ceiling = Math.max(percentile(voiced, 0.9), peak * 0.2);
  const floor = ceiling * 0.08;
  const span = Math.max(1, Math.round(SYLLABLE_SPAN_SEC / ENVELOPE_HOP_SEC));
  const open = new Float32Array(envelope.length);
  for (let i = 0; i < envelope.length; i += 1) {
    let lo = Number.POSITIVE_INFINITY;
    let hi = 0;
    for (
      let k = Math.max(0, i - span);
      k <= Math.min(envelope.length - 1, i + span);
      k += 1
    ) {
      lo = Math.min(lo, envelope[k]);
      hi = Math.max(hi, envelope[k]);
    }
    const level = Math.min(
      1,
      Math.max(0, (envelope[i] - floor) / (ceiling - floor)),
    );
    const range = hi - lo;
    // (range is 0 in silence, where level is 0 anyway)
    const shape =
      range <= 1e-9 || range < hi * HELD_SOUND_RATIO
        ? 1
        : Math.max(0, (envelope[i] - lo) / range);
    open[i] = level * Math.sqrt(shape);
  }
  // one value per video frame: the mean of the 10 ms points it covers
  const perSecond = 1 / ENVELOPE_HOP_SEC;
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const start = Math.floor((frame / fps) * perSecond);
    const end = Math.min(
      open.length,
      Math.max(start + 1, Math.floor(((frame + 1) / fps) * perSecond)),
    );
    let sum = 0;
    for (let i = start; i < end; i += 1) sum += open[i];
    values[frame] = end > start ? sum / (end - start) : 0;
  }
  return values;
}
