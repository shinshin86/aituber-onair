import { RewriteUnavailableError } from '../core/rewriteUnavailable.js';
import { normalizeModulation, type NoiseModulation } from './modulation.js';

export interface NeuralAttentionPhase {
  /** Probability mass over source clauses in their original order. */
  weights: number[];
  focus: number;
  /** Difference between the largest and second largest weights. */
  contrast: number;
}
export interface NeuralAttention {
  opening: NeuralAttentionPhase;
  settling: NeuralAttentionPhase;
}

/** Integrate content-specific population projections without reducing temporal order. */
export function decodeNeuralAttention(
  modulation: NoiseModulation,
  keys: number[],
  strength = 0.9
): NeuralAttention {
  const frames = normalizeModulation(modulation).readoutTrace;
  if (!frames?.some((frame) => frame.activity > 0))
    throw new RewriteUnavailableError('neural_inactive');
  if (
    !keys.length ||
    keys.length > 64 ||
    JSON.stringify(keys) !== JSON.stringify(modulation.contentKeys) ||
    !frames.every((f) => f.contentAxes?.length === keys.length)
  )
    throw new RewriteUnavailableError('neural_unavailable');
  if (!Number.isFinite(strength) || strength < 0 || strength > 1)
    throw new Error('Invalid neural attention strength');
  const duration = frames[frames.length - 1].endStep;
  function phase(start: number, end: number): NeuralAttentionPhase {
    const axes = keys.map(() => 0);
    let mass = 0;
    for (const frame of frames ?? []) {
      const overlap = Math.max(
        0,
        Math.min(end, frame.endStep) - Math.max(start, frame.startStep)
      );
      const weight = overlap * frame.activity;
      mass += weight;
      for (let i = 0; i < keys.length; i++)
        axes[i] += (frame.contentAxes?.[i] ?? 0) * weight;
    }
    // A silent window yields uniform attention, never an invented impulse.
    const scores = axes.map((v) => v / (mass || 1));
    const peak = Math.max(...scores);
    const exp = scores.map((v) => Math.exp((v - peak) * 8 * strength));
    const total = exp.reduce((sum, v) => sum + v, 0);
    const weights = exp.map((v) => v / total);
    const ranked = weights.map((weight, index) => ({ weight, index }));
    ranked.sort((a, b) => b.weight - a.weight);
    return {
      weights,
      focus: ranked[0].index,
      contrast: ranked.length > 1 ? ranked[0].weight - ranked[1].weight : 0,
    };
  }
  return {
    opening: phase(0, duration / 2),
    settling: phase(duration / 2, duration),
  };
}

/** Stable lexical binding only; the key contains no salience or writing-style choice. */
export function bindNeuralContent(anchors: string[], draft: string): number[] {
  if (
    !Array.isArray(anchors) ||
    !anchors.length ||
    anchors.length > 64 ||
    !anchors.every(
      (s) =>
        typeof s === 'string' &&
        s.trim().length > 0 &&
        s.length <= 6000 &&
        draft.includes(s)
    )
  )
    throw new Error('Invalid neural content anchors');
  const keys = anchors.map((s) => {
    let h = 2166136261;
    for (const ch of s.normalize('NFKC'))
      h = Math.imul(h ^ (ch.codePointAt(0) ?? 0), 16777619);
    return h >>> 0;
  });
  if (
    new Set(keys).size !== new Set(anchors.map((s) => s.normalize('NFKC'))).size
  )
    throw new Error('Neural content binding collision');
  return keys;
}
