import { ChatScreenplay } from '../types';
import { EmotionParser } from './emotionParser';

/**
 * Convert text to screenplay (text with emotion)
 * @param text Original text (may contain emotion expressions like [happy])
 * @returns Screenplay object with emotion and text separated
 */
export function textToScreenplay(text: string): ChatScreenplay {
  const { emotion, cleanText } = EmotionParser.extractEmotion(text);

  if (emotion) {
    return {
      emotion,
      text: cleanText,
    };
  }

  return { text: cleanText };
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
    return EmotionParser.addEmotionTag(screenplay.emotion, screenplay.text);
  }
  return screenplay.text;
}
