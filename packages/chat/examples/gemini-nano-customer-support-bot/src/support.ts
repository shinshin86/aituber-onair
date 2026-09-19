import { ChatServiceFactory, type ChatService } from '@aituber-onair/chat';
import packageKnowledge from './chat-package-knowledge.md?raw';
import type { Language } from './i18n';
import {
  getSectionDocUrl,
  PACKAGE_README_URL,
  parseKnowledgeSections,
  selectSectionsWithFallback,
  type KnowledgeSection,
} from './knowledge';

export const PACKAGE_KNOWLEDGE = packageKnowledge;
export const KNOWLEDGE_SECTIONS = parseKnowledgeSections(PACKAGE_KNOWLEDGE);
export const SUPPORT_RESPONSE_LENGTH = 'short' as const;

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
- Never write URLs; the interface attaches relevant documentation links.
- Be concise, warm, practical, and easy to understand.

Public support knowledge about the package scope:

${KNOWLEDGE_SECTIONS.find((section) => section.id === 'scope')?.body ?? ''}`.trim();

export const buildSupportUserPrompt = (
  question: string,
  sections: KnowledgeSection[],
): string => {
  const reference = sections.length
    ? sections
        .map((section) => `### ${section.title}\n${section.body}`)
        .join('\n\n')
    : 'No matching documentation was found for this question.';

  return `Reference:\n${reference}\n\nQuestion: ${question}`;
};

export const getSupportSections = (
  question: string,
  previousSections: KnowledgeSection[] = [],
): KnowledgeSection[] =>
  selectSectionsWithFallback(question, KNOWLEDGE_SECTIONS, previousSections);

export const getSupportSourceLinks = (
  sections: KnowledgeSection[],
  fallbackTitle: string,
) => {
  const links = sections.flatMap((section) => {
    const url = getSectionDocUrl(section.id);
    return url ? [{ title: section.title, url }] : [];
  });
  return links.length
    ? links
    : [{ title: fallbackTitle, url: PACKAGE_README_URL }];
};

export const createSupportService = (language: Language): ChatService =>
  ChatServiceFactory.createChatService('gemini-nano', {
    responseLength: SUPPORT_RESPONSE_LENGTH,
    ...getGeminiNanoLanguageOptions(language),
  });
