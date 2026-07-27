import { ChatServiceFactory, type ChatService } from '@aituber-onair/chat';
import packageKnowledge from './chat-package-knowledge.md?raw';
import type { Language } from './i18n';

export const PACKAGE_KNOWLEDGE = packageKnowledge;
export const SUPPORT_RESPONSE_LENGTH = 'veryShort' as const;

const RESPONSE_LANGUAGE_RULES: Record<Language, string> = {
  en: 'Always answer in English, even if the user writes in another language.',
  ja: 'Always answer in Japanese. ユーザーの入力言語にかかわらず、必ず日本語で回答してください。',
};

export const getGeminiNanoLanguageOptions = (language: Language) => ({
  expectedInputLanguages: language === 'ja' ? ['en', 'ja'] : ['en'],
  expectedOutputLanguages: [language],
});

export const buildSupportSystemPrompt = (language: Language): string =>
  `
You are the friendly support assistant for AITuber OnAir.

Rules:
- Answer only questions about AITuber OnAir packages, primarily @aituber-onair/chat.
- Use only the supplied knowledge. Never invent APIs, options, or model names.
- If the knowledge does not cover an answer, say so clearly and point the user to the package README or repository.
- ${RESPONSE_LANGUAGE_RULES[language]}
- Reply in one short sentence without a preamble, summary, or follow-up suggestion.
- Be concise, warm, practical, and easy to understand.

Public support knowledge:

${PACKAGE_KNOWLEDGE}`.trim();

export const createSupportService = (language: Language): ChatService =>
  ChatServiceFactory.createChatService('gemini-nano', {
    responseLength: SUPPORT_RESPONSE_LENGTH,
    ...getGeminiNanoLanguageOptions(language),
  });
