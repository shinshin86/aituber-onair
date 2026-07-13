import type { NoiseLexicon } from './types.js';

/** Case-insensitive substring match against an app-supplied phrase list. */
function matchesPhrases(text: string, phrases: string[] | undefined): boolean {
  if (!phrases || phrases.length === 0) {
    return false;
  }

  const lower = text.toLowerCase();

  return phrases.some((phrase) => {
    const trimmed = phrase.trim().toLowerCase();
    return trimmed.length > 0 && lower.includes(trimmed);
  });
}

export function matchesPredictableLexicon(
  text: string,
  lexicon: NoiseLexicon | undefined
): boolean {
  return matchesPhrases(text, lexicon?.predictablePhrases);
}

export function matchesStockReplyLexicon(
  text: string,
  lexicon: NoiseLexicon | undefined
): boolean {
  return matchesPhrases(text, lexicon?.stockReplies);
}

export function matchesPlayMarkerLexicon(
  text: string,
  lexicon: NoiseLexicon | undefined
): boolean {
  return matchesPhrases(text, lexicon?.playMarkers);
}
