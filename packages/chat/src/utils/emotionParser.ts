// Define emotion types and list locally to avoid dependency on voice package
const emotions = ['happy', 'sad', 'angry', 'surprised', 'neutral'] as const;
type EmotionType = (typeof emotions)[number];

/**
 * Regular expressions for emotion tag parsing
 */
export const EMOTION_TAG_REGEX = /\[([a-z]+)\]/i;
export const EMOTION_TAG_CLEANUP_REGEX = /\[[a-z]+\]\s*/gi;

/**
 * Result of emotion extraction
 */
export interface EmotionExtractionResult {
  emotion?: string;
  cleanText: string;
}

/**
 * Utility class for parsing and handling emotion tags in text
 */
export class EmotionParser {
  /**
   * Extract emotion from text and return clean text
   * @param text Text that may contain emotion tags like [happy]
   * @returns Object containing extracted emotion and clean text
   */
  static extractEmotion(text: string): EmotionExtractionResult {
    const match = text.match(EMOTION_TAG_REGEX);

    if (match) {
      const emotion = match[1].toLowerCase();
      const cleanText = text.replace(EMOTION_TAG_CLEANUP_REGEX, '').trim();
      return {
        emotion,
        cleanText,
      };
    }

    return { cleanText: text };
  }

  /**
   * Check if an emotion is valid
   * @param emotion Emotion string to validate
   * @returns True if the emotion is valid
   */
  static isValidEmotion(emotion: string): emotion is EmotionType {
    return emotions.includes(emotion as any);
  }

  /**
   * Remove all emotion tags from text
   * @param text Text containing emotion tags
   * @returns Clean text without emotion tags
   */
  static cleanEmotionTags(text: string): string {
    return text.replace(EMOTION_TAG_CLEANUP_REGEX, '').trim();
  }

  /**
   * Add emotion tag to text
   * @param emotion Emotion to add
   * @param text Text content
   * @returns Text with emotion tag prepended
   */
  static addEmotionTag(emotion: string, text: string): string {
    return `[${emotion}] ${text}`;
  }
}
