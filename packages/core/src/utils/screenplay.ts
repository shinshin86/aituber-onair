import { Screenplay } from '../types';

/**
 * Extract emotion from text using regex
 * Extract emotion from text written in the format [happy], [sad], etc.
 */
const EMOTION_REGEX = /^\s*\[([a-z]+)\]\s*/i;

/**
 * Convert text to screenplay (text with emotion)
 * @param text Original text (may contain emotion expressions like [happy])
 * @returns Screenplay object with emotion and text separated
 */
export function textToScreenplay(text: string): Screenplay {
  const match = text.match(EMOTION_REGEX);

  if (match) {
    const emotion = match[1].toLowerCase();
    const cleanText = text.replace(EMOTION_REGEX, '');
    return {
      emotion,
      text: cleanText,
    };
  }

  return { text };
}

/**
 * Convert multiple texts to screenplay array
 * @param texts Text array
 * @returns Array of screenplay objects
 */
export function textsToScreenplay(texts: string[]): Screenplay[] {
  return texts.map((text) => textToScreenplay(text));
}

/**
 * Convert screenplay to text with emotion
 * @param screenplay Screenplay object
 * @returns Text with emotion (e.g. [happy] Hello)
 */
export function screenplayToText(screenplay: Screenplay): string {
  if (screenplay.emotion) {
    return `[${screenplay.emotion}] ${screenplay.text}`;
  }
  return screenplay.text;
}
