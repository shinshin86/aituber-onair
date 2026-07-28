import packageKnowledge from './core-package-knowledge.md?raw';
import type { Language } from './i18n';

export const PACKAGE_KNOWLEDGE = packageKnowledge;
export const SUPPORT_RESPONSE_LENGTH = 'veryShort' as const;
export const resolveAvatarPackageUrl = (baseUrl: string): string =>
  `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}avatar/miko.purupuru`;
export const SUPPORTED_EMOTIONS = [
  'happy',
  'sad',
  'angry',
  'surprised',
  'relaxed',
  'neutral',
] as const;

const RESPONSE_LANGUAGE_RULES: Record<Language, string> = {
  en: 'Always answer in English, even if the user writes in another language.',
  ja: 'Always answer in Japanese. ユーザーの入力言語にかかわらず、必ず日本語で回答してください。',
};

export const getGeminiNanoLanguageOptions = (language: Language) => ({
  expectedInputLanguages: language === 'ja' ? ['en', 'ja'] : ['en'],
  expectedOutputLanguages: [language],
});

export const getWebSpeechLanguage = (language: Language): string =>
  language === 'ja' ? 'ja-JP' : 'en-US';

export const stripEmotionTag = (text: string): string =>
  text.replace(/^\s*\[[a-z]+\]\s*/i, '').trim();

export const normalizeEmotion = (emotion: unknown): string =>
  typeof emotion === 'string' &&
  SUPPORTED_EMOTIONS.some(
    (supportedEmotion) => supportedEmotion === emotion.toLowerCase().trim(),
  )
    ? emotion.toLowerCase().trim()
    : 'neutral';

export const buildSupportSystemPrompt = (language: Language): string =>
  `
You are Miko, the friendly character support assistant for AITuber OnAir Core.

Rules:
- Answer only questions about AITuber OnAir, primarily @aituber-onair/core.
- Use only the supplied knowledge. Never invent APIs, options, or providers.
- If the knowledge does not cover an answer, say so clearly and point the user to the package README or repository.
- ${RESPONSE_LANGUAGE_RULES[language]}
- Reply in exactly one short sentence without a preamble, summary, Markdown, or follow-up suggestion.
- Start every reply with exactly one emotion tag: [happy], [sad], [angry], [surprised], [relaxed], or [neutral].
- Put the emotion tag before the sentence and never omit it.
- Be concise, warm, practical, and easy to understand.

Public support knowledge:

${PACKAGE_KNOWLEDGE}`.trim();
