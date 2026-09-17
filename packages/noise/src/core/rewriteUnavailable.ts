import type { NoiseSkipReason } from './types.js';

/** An intentional rewrite skip, distinct from a provider failure. */
export class RewriteUnavailableError extends Error {
  constructor(
    public readonly reason: Extract<
      NoiseSkipReason,
      | 'neural_unavailable'
      | 'neural_inactive'
      | 'neural_unfocused'
      | 'unsplittable'
      | 'no_licensed_intervention'
      | 'quality_fail'
    >
  ) {
    super(`Rewrite unavailable: ${reason}`);
    this.name = 'RewriteUnavailableError';
  }
}
