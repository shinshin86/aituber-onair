import type { LocalizedPrompts } from '../types/prompts.js';

/**
 * Default prompts for multiple languages
 */
export const DEFAULT_PROMPTS: LocalizedPrompts = {
  ja: {
    intervention: [
      '話題を変えて、新しい内容について話してください。',
      '別の角度から話題を展開してみましょう。',
      '新しいテーマで会話を続けてください。',
      '会話に変化をもたらすため、違う話題にしてみませんか？',
    ],
    interventionReasons: {
      similarityHigh: '類似度が高い ({score}%)',
      patternRepetition: 'パターンの繰り返し (最大{count}回)',
      topicBias: '話題の偏り ({count}件)',
      thresholdExceeded: '閾値を超過',
    },
  },
  en: {
    intervention: [
      'Please change the topic and talk about something new.',
      "Let's explore the topic from a different angle.",
      'Please continue the conversation with a new theme.',
      'How about changing to a different topic to bring variety to the conversation?',
    ],
    interventionReasons: {
      similarityHigh: 'High similarity ({score}%)',
      patternRepetition: 'Pattern repetition (max {count} times)',
      topicBias: 'Narrow topic focus ({count} topics)',
      thresholdExceeded: 'Threshold exceeded',
    },
  },
};
