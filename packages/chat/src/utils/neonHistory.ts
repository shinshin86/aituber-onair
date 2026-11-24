/** In-memory, route-specific history. Enumerable symbols survive message
 * spreads, but JSON serialization cannot forward them to other providers.
 */
export const NEON_HISTORY = Symbol('neon-history');

type NeonHistory =
  | { route: 'native'; parts: unknown[] }
  | { route: 'openrouter'; endpoint: string; details: unknown[] };

export type NeonHistoryCarrier = { [NEON_HISTORY]?: NeonHistory };

export function getNeonHistory(message: object): NeonHistory | undefined {
  return (message as NeonHistoryCarrier)[NEON_HISTORY];
}
