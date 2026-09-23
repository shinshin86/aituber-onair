export interface KnowledgeSection {
  id: string;
  title: string;
  body: string;
}

interface SectionMeta {
  keywords: string[];
  strongKeywords?: string[];
  boosts?: { whenAll: string[][]; score: number }[];
  docUrl?: string;
}

export const PACKAGE_README_URL =
  'https://github.com/shinshin86/aituber-onair/tree/main/packages/chat';

export const SECTION_META: Record<string, SectionMeta> = {
  'relationship-to-other-aituber-onair-packages': {
    strongKeywords: ['audio', 'tts', 'voice synthesis', '音声', '合成'],
    keywords: ['packages', 'core', 'voice', 'manneri', 'bushitsu', 'kizuna'],
  },
  installation: {
    strongKeywords: [
      'install',
      'installation',
      'npm',
      'google apps script',
      'gas',
      'umd',
      'script tag',
      'インストール',
      '導入',
    ],
    keywords: [],
  },
  'quick-start': {
    strongKeywords: [
      'quick start',
      '使い方',
      '始め方',
      '基本',
      'conversation context',
      'history',
      '文脈',
      '履歴',
      '会話',
    ],
    keywords: [],
    docUrl: `${PACKAGE_README_URL}#basic-chat`,
  },
  'built-in-providers': {
    keywords: [
      'provider',
      'providers',
      'プロバイダー',
      'openai',
      'claude',
      'gemini',
      'kimi',
      'mistral',
      'sakana',
    ],
    boosts: [
      {
        whenAll: [['provider', 'providers', 'プロバイダー']],
        score: 4,
      },
    ],
  },
  'openai-models': {
    keywords: ['openai', 'gpt', 'model', 'models', 'モデル'],
    boosts: [
      {
        whenAll: [
          ['openai', 'gpt'],
          ['model', 'models', 'モデル'],
        ],
        score: 4,
      },
    ],
  },
  'claude-models': {
    keywords: ['claude', 'anthropic', 'model', 'models', 'モデル'],
    boosts: [
      {
        whenAll: [
          ['claude', 'anthropic'],
          ['model', 'models', 'モデル'],
        ],
        score: 4,
      },
    ],
  },
  'gemini-models': {
    keywords: ['gemini', 'gemma', 'model', 'models', 'モデル'],
    boosts: [
      {
        whenAll: [
          ['gemini', 'gemma'],
          ['model', 'models', 'モデル'],
        ],
        score: 4,
      },
    ],
  },
  'other-provider-examples': {
    strongKeywords: [
      'gemini nano',
      'gemini-nano',
      'api key-free',
      'api key free',
      'reasoning',
      'kimi',
    ],
    keywords: [
      'openrouter',
      'zai',
      'xai',
      'grok',
      'deepseek',
      'mistral',
      'ministral',
      'sakana',
      'fugu',
      'glm',
      'moonshot',
      'provider',
    ],
  },
  'openai-compatible-endpoints': {
    keywords: [
      'openai-compatible',
      'compatible',
      'self-hosted',
      'ローカル',
      '互換',
      'endpoint',
      'エンドポイント',
    ],
    docUrl: `${PACKAGE_README_URL}#openai-compatible-localself-hosted`,
  },
  streaming: {
    keywords: ['stream', 'streaming', 'ストリーミング', '逐次'],
  },
  'tool-and-function-calling': {
    keywords: [
      'tool',
      'tools',
      'function calling',
      '関数呼び出し',
      'ツール',
      'function',
    ],
    docUrl: `${PACKAGE_README_URL}#toolfunction-calling`,
  },
  'model-context-protocol': {
    strongKeywords: ['mcp', 'model context protocol', 'プロトコル'],
    keywords: [],
    docUrl: `${PACKAGE_README_URL}#model-context-protocol-mcp`,
  },
  vision: {
    keywords: ['vision', 'image', '画像', 'ビジョン', '写真', '画像入力'],
    docUrl: `${PACKAGE_README_URL}#vision-chat`,
  },
  'response-length': {
    strongKeywords: ['short', 'long', '短く', '長く', '短い', '長い'],
    keywords: [
      'response length',
      'length',
      'token',
      'tokens',
      '長さ',
      '応答長',
      'トークン',
    ],
    boosts: [{ whenAll: [['maxTokens']], score: 64 }],
    docUrl: `${PACKAGE_README_URL}#response-length-control`,
  },
  'capability-discovery': {
    keywords: ['capability', 'capabilities', '能力', '機能', 'discovery'],
  },
  'browser-api-key-safety': {
    strongKeywords: [
      'api key',
      'key safety',
      'localstorage',
      'local storage',
      '秘密',
      'secret',
    ],
    keywords: ['キー'],
  },
  'browser-cors-notes': {
    strongKeywords: ['cors', 'cross-origin', 'sakana', 'ブラウザ', 'オリジン'],
    keywords: [],
  },
  'frequently-asked-questions': {
    strongKeywords: ['faq', 'question', 'history', '履歴'],
    keywords: [
      'faq',
      'question',
      '質問',
      '回答',
      'トラブル',
      'model',
      'models',
      'provider',
      'providers',
      'プロバイダー',
    ],
  },
};

const slugify = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const isAsciiTerm = (term: string): boolean =>
  Array.from(term).every((character) => character.charCodeAt(0) < 128);

const containsTerm = (text: string, term: string): boolean => {
  const normalizedTerm = term.toLowerCase();
  if (isAsciiTerm(normalizedTerm)) {
    if (normalizedTerm.includes(' ') && text.includes(normalizedTerm)) {
      return true;
    }
    if (
      text.includes(`_${normalizedTerm}`) ||
      text.includes(`${normalizedTerm}_`)
    ) {
      return true;
    }
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pluralSuffix = normalizedTerm.endsWith('s') ? '' : 's?';
    return new RegExp(`\\b${escaped}${pluralSuffix}\\b`, 'i').test(text);
  }
  return text.toLowerCase().includes(normalizedTerm);
};

const IDENTIFIER_STOPWORDS = new Set([
  'which',
  'what',
  'where',
  'when',
  'how',
  'does',
  'need',
  'supported',
  'can',
  'from',
  'use',
  'google',
  'script',
  'provider',
  'providers',
  'model',
  'models',
]);

const getIdentifierWords = (identifier: string): string[] =>
  identifier
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[_-]+|\s+/)
    .map((word) => word.toLowerCase())
    .map((word) => (word.endsWith('ies') ? `${word.slice(0, -3)}y` : word))
    .filter((word) => word.length >= 3 && !IDENTIFIER_STOPWORDS.has(word));

const scoreKeywords = (
  question: string,
  meta: SectionMeta,
): { strong: number; weak: number } => ({
  strong: (meta.strongKeywords ?? []).reduce(
    (total, keyword) => total + (containsTerm(question, keyword) ? 6 : 0),
    0,
  ),
  weak: meta.keywords.reduce(
    (total, keyword) => total + (containsTerm(question, keyword) ? 1 : 0),
    0,
  ),
});

const scoreIdentifiers = (
  question: string,
  section: KnowledgeSection,
): { score: number; hasExactMatch: boolean } =>
  Array.from(question.matchAll(/[a-z][a-z0-9_\-[\]]{4,}/gi)).reduce(
    (result, match) => {
      const rawIdentifier = match[0];
      const identifier = rawIdentifier.toLowerCase();
      if (IDENTIFIER_STOPWORDS.has(identifier)) return result;
      const searchable = `${section.title}\n${section.body}`.toLowerCase();
      const hasExactMatch = searchable.includes(identifier);
      const titleWords = getIdentifierWords(rawIdentifier);
      const titleScore = titleWords.some((word) =>
        containsTerm(section.title, word),
      )
        ? 4
        : 0;
      return {
        score: result.score + (hasExactMatch ? 8 : 0) + titleScore,
        hasExactMatch: result.hasExactMatch || hasExactMatch,
      };
    },
    { score: 0, hasExactMatch: false } as {
      score: number;
      hasExactMatch: boolean;
    },
  );

const scoreBoosts = (question: string, meta: SectionMeta): number =>
  (meta.boosts ?? []).reduce(
    (total, boost) =>
      total +
      (boost.whenAll.every((group) =>
        group.some((term) => containsTerm(question, term)),
      )
        ? boost.score
        : 0),
    0,
  );

export const parseKnowledgeSections = (markdown: string): KnowledgeSection[] =>
  markdown
    .split(/^## /m)
    .slice(1)
    .map((rawSection) => {
      const [rawTitle, ...bodyLines] = rawSection.split('\n');
      const title = rawTitle.trim();
      return {
        id: slugify(title),
        title,
        body: bodyLines.join('\n').trim(),
      };
    });

export const selectSections = (
  question: string,
  sections: KnowledgeSection[],
  options: { limit?: number } = {},
): KnowledgeSection[] => {
  const limit = options.limit ?? 3;
  const normalizedQuestion = question.toLowerCase();

  return sections
    .filter(
      (section) =>
        section.id !== 'scope' && section.id !== 'deeper-documentation',
    )
    .map((section) => {
      const meta = SECTION_META[section.id];
      if (!meta) return { section, score: 0, strongScore: 0 };
      const keywordScore = scoreKeywords(normalizedQuestion, meta);
      const identifierScore = scoreIdentifiers(question, section);
      const score =
        keywordScore.strong * 10 +
        keywordScore.weak +
        identifierScore.score +
        scoreBoosts(normalizedQuestion, meta);
      return {
        section,
        score,
        strongScore:
          keywordScore.strong + (identifierScore.hasExactMatch ? 1 : 0),
      };
    })
    .filter(({ score, strongScore }, _, scoredSections) => {
      const hasStrongMatch = scoredSections.some(
        (candidate) => candidate.strongScore > 0,
      );
      return score > 0 && (!hasStrongMatch || strongScore > 0);
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        sections.indexOf(left.section) - sections.indexOf(right.section),
    )
    .slice(0, limit)
    .map(({ section }) => section);
};

export const getSectionDocUrl = (sectionId: string): string | undefined =>
  SECTION_META[sectionId]?.docUrl;

export const selectSectionsWithFallback = (
  question: string,
  sections: KnowledgeSection[],
  previousSections: KnowledgeSection[],
  options: { limit?: number } = {},
): KnowledgeSection[] => {
  const selected = selectSections(question, sections, options);
  return selected.length ? selected : previousSections;
};
