import { matchesPlayMarkerLexicon } from './lexicon.js';
import type { InterventionKind, NoiseLexicon } from './types.js';

/**
 * Interventions that constitute a social violation (teasing-class). Benign
 * violation theory: the violation and the "this is play" appraisal must land
 * at the same time, so these interventions require a play marker in the same
 * reply.
 */
export const TEASING_INTERVENTIONS: ReadonlySet<InterventionKind> = new Set([
  'tsukkomi',
  'withheld_uptake',
  'boke_bait',
  'status_seesaw',
  'contrarian_reframe',
]);

const PLAY_MARKER_PATTERN =
  /[wｗ]|草|笑|（笑）|♪|☆|✨|😆|🤣|😂|！{2,}|!{2,}|〜|なんてね|なーんて|冗談|うそうそ|嘘うそ|知らんけど|でしょ[？?]|haha|lol|just kidding|kidding|joking|;\)/i;

/** Whether the text carries at least one decodable "this is play" marker. */
export function hasPlayMarker(text: string, lexicon?: NoiseLexicon): boolean {
  return (
    PLAY_MARKER_PATTERN.test(text) || matchesPlayMarkerLexicon(text, lexicon)
  );
}

export function requiresPlayMarker(
  applied: InterventionKind[] | undefined
): boolean {
  return (applied ?? []).some((kind) => TEASING_INTERVENTIONS.has(kind));
}
