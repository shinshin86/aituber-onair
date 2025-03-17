import { ChatScreenplay } from '../types';

/**
 * Extract emotion from text using regex
 * Extract emotion from text written in the format [happy], [sad], etc.
 */
const EMOTION_REGEX = /\[([a-z]+)\]/i;
const EMOTION_CLEANUP_REGEX = /\[[a-z]+\]\s*/gi;

/**
 * Convert text to screenplay (text with emotion)
 * @param text Original text (may contain emotion expressions like [happy])
 * @returns Screenplay object with emotion and text separated
 */
export function textToScreenplay(text: string): ChatScreenplay {
  const match = text.match(EMOTION_REGEX);

  if (match) {
    const emotion = match[1].toLowerCase();
    // Remove all emotion tags from the text and trim whitespace
    const cleanText = text.replace(EMOTION_CLEANUP_REGEX, '').trim();
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
export function textsToScreenplay(texts: string[]): ChatScreenplay[] {
  return texts.map((text) => textToScreenplay(text));
}

/**
 * Convert screenplay to text with emotion
 * @param screenplay Screenplay object
 * @returns Text with emotion (e.g. [happy] Hello)
 */
export function screenplayToText(screenplay: ChatScreenplay): string {
  if (screenplay.emotion) {
    return `[${screenplay.emotion}] ${screenplay.text}`;
  }
  return screenplay.text;
}
