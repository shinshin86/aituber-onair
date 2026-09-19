import { describe, expect, it } from 'vitest';
import canonicalKnowledge from '../../customer-support-bot/server/chat-package-knowledge.md?raw';
import {
  buildSupportSystemPrompt,
  buildSupportUserPrompt,
  getGeminiNanoLanguageOptions,
  KNOWLEDGE_SECTIONS,
  PACKAGE_KNOWLEDGE,
  SUPPORT_RESPONSE_LENGTH,
} from '../src/support';
import { shouldSubmitMessageOnKeyDown } from '../src/components/messageInputKeydown';
import {
  SECTION_META,
  parseKnowledgeSections,
  selectSections,
  selectSectionsWithFallback,
} from '../src/knowledge';

const keyDown = (overrides: {
  key?: string;
  shiftKey?: boolean;
  keyCode?: number;
  isComposing?: boolean;
}) => ({
  key: overrides.key ?? 'Enter',
  shiftKey: overrides.shiftKey ?? false,
  keyCode: overrides.keyCode ?? 13,
  nativeEvent: { isComposing: overrides.isComposing ?? false },
});

describe('Gemini Nano support language configuration', () => {
  it('configures English input and output for the English UI', () => {
    expect(getGeminiNanoLanguageOptions('en')).toEqual({
      expectedInputLanguages: ['en'],
      expectedOutputLanguages: ['en'],
    });
  });

  it('accepts the English knowledge prompt and Japanese user input', () => {
    expect(getGeminiNanoLanguageOptions('ja')).toEqual({
      expectedInputLanguages: ['en', 'ja'],
      expectedOutputLanguages: ['ja'],
    });
  });

  it('requires the selected response language in the system prompt', () => {
    expect(buildSupportSystemPrompt('en')).toContain(
      'Always answer in English',
    );
    expect(buildSupportSystemPrompt('ja')).toContain(
      '必ず日本語で回答してください',
    );
  });
});

describe('message input keydown', () => {
  it('submits a regular Enter keydown', () => {
    expect(shouldSubmitMessageOnKeyDown(keyDown({}))).toBe(true);
  });

  it('keeps Shift+Enter as a newline', () => {
    expect(shouldSubmitMessageOnKeyDown(keyDown({ shiftKey: true }))).toBe(
      false,
    );
  });

  it('does not submit while an IME composition is being confirmed', () => {
    expect(shouldSubmitMessageOnKeyDown(keyDown({ isComposing: true }))).toBe(
      false,
    );
    expect(shouldSubmitMessageOnKeyDown(keyDown({ keyCode: 229 }))).toBe(false);
  });
});

describe('response length', () => {
  it('uses the short preset and keeps length guidance at the service level', () => {
    expect(SUPPORT_RESPONSE_LENGTH).toBe('short');
    expect(buildSupportSystemPrompt('en')).not.toContain(
      'Reply in one short sentence',
    );
  });
});

describe('knowledge retrieval', () => {
  it('keeps section metadata aligned with the knowledge document', () => {
    const sections = parseKnowledgeSections(PACKAGE_KNOWLEDGE);
    const sectionIds = new Set(sections.map((section) => section.id));

    for (const [id, meta] of Object.entries(SECTION_META)) {
      expect(sectionIds).toContain(id);
      if (meta.docUrl) expect(PACKAGE_KNOWLEDGE).toContain(meta.docUrl);
    }
  });

  it('selects vision for a Japanese image question, not installation', () => {
    const selected = selectSections('画像を送れますか', KNOWLEDGE_SECTIONS);

    expect(selected[0]?.id).toBe('vision');
    expect(selected.map((section) => section.id)).not.toContain('installation');
  });

  it('ranks the CORS section first for a CORS question', () => {
    const selected = selectSections(
      'How do I fix a CORS error?',
      KNOWLEDGE_SECTIONS,
    );

    expect(selected[0]?.id).toBe('browser-cors-notes');
  });

  it('returns no references for an unrelated question', () => {
    const selected = selectSections(
      'What is the weather on Mars tomorrow?',
      KNOWLEDGE_SECTIONS,
    );

    expect(selected).toEqual([]);
    const prompt = buildSupportUserPrompt(
      'What is the weather on Mars tomorrow?',
      selected,
    );
    expect(prompt).toContain('No matching documentation was found');
    for (const section of KNOWLEDGE_SECTIONS) {
      expect(prompt).not.toContain(section.body);
    }
  });

  it('builds a stable, scope-only system prompt', () => {
    const english = buildSupportSystemPrompt('en');
    const japanese = buildSupportSystemPrompt('ja');

    expect(buildSupportSystemPrompt('en')).toBe(english);
    expect(buildSupportSystemPrompt('en')).not.toContain(
      'MODEL_CLAUDE_5_SONNET',
    );
    expect(buildSupportSystemPrompt('en')).not.toContain('https://');
    expect(english).toContain('A unified service factory');
    expect(japanese).toContain('A unified service factory');
  });

  it.each([
    {
      question: 'How do I use Model Context Protocol?',
      first: 'model-context-protocol',
      includes: ['model-context-protocol'],
      excludes: ['openai-models', 'claude-models', 'gemini-models'],
    },
    {
      question: 'Can I use it from Google Apps Script?',
      first: 'installation',
      includes: ['installation'],
      excludes: ['gemini-models'],
    },
    {
      question: 'GASで使えますか',
      first: 'installation',
      includes: ['installation'],
      excludes: [],
    },
    {
      question: 'Does Gemini Nano need an API key?',
      first: 'other-provider-examples',
      includes: ['other-provider-examples'],
      excludes: [],
    },
    {
      question: 'Gemini Nanoは使えますか',
      first: 'other-provider-examples',
      includes: ['other-provider-examples'],
      excludes: [],
    },
    {
      question: 'How do I keep conversation context?',
      first: 'quick-start',
      includes: ['quick-start'],
      excludes: [],
    },
    {
      question: '会話の文脈を保持するには?',
      first: 'quick-start',
      includes: ['quick-start'],
      excludes: [],
    },
    {
      question: '応答を短くしたい',
      first: 'response-length',
      includes: ['response-length'],
      excludes: [],
    },
    {
      question: 'localStorage is safe?',
      first: 'browser-api-key-safety',
      includes: ['browser-api-key-safety'],
      excludes: ['openai-compatible-endpoints'],
    },
    {
      question: 'Sakanaがブラウザで動かない',
      first: 'browser-cors-notes',
      includes: ['browser-cors-notes'],
      excludes: [],
    },
    {
      question: 'Kimiのreasoning effortは?',
      first: 'other-provider-examples',
      includes: ['other-provider-examples'],
      excludes: [],
    },
    {
      question: '音声合成はできますか',
      first: 'relationship-to-other-aituber-onair-packages',
      includes: ['relationship-to-other-aituber-onair-packages'],
      excludes: [],
    },
    {
      question: 'どのモデルが使えますか',
      first: 'openai-models',
      includes: ['openai-models', 'claude-models', 'gemini-models'],
      excludes: [],
    },
    {
      question: 'Which models are supported?',
      first: 'openai-models',
      includes: ['openai-models', 'claude-models', 'gemini-models'],
      excludes: [],
    },
    {
      question: '対応プロバイダーは?',
      first: 'built-in-providers',
      includes: ['built-in-providers'],
      excludes: [],
    },
    {
      question: 'Which providers are supported?',
      first: 'built-in-providers',
      includes: ['built-in-providers'],
      excludes: [],
    },
    {
      question: 'Claudeのモデル一覧',
      first: 'claude-models',
      includes: ['claude-models'],
      excludes: [],
    },
    {
      question: 'getProviderCapabilitiesとは',
      first: 'capability-discovery',
      includes: ['capability-discovery'],
      excludes: [],
    },
    {
      question: 'What is processVisionChat?',
      first: 'vision',
      includes: ['vision'],
      excludes: [],
    },
    {
      question: 'runOnceText',
      first: 'installation',
      includes: ['installation'],
      excludes: [],
    },
    {
      question: 'MODEL_GPT_5_6_TERRA',
      first: 'openai-models',
      includes: ['openai-models'],
      excludes: [],
    },
    {
      question: 'Does openai-compatible support MCP?',
      first: 'model-context-protocol',
      includes: ['openai-compatible-endpoints', 'model-context-protocol'],
      excludes: [],
    },
    {
      question: 'maxTokensの使い方',
      first: 'response-length',
      includes: ['response-length'],
      excludes: [],
    },
  ])(
    'retrieves the relevant section for $question',
    ({ question, first, includes, excludes }) => {
      const selected = selectSections(question, KNOWLEDGE_SECTIONS);
      const selectedIds = selected.map((section) => section.id);

      expect(selected[0]?.id).toBe(first);
      for (const id of includes) expect(selectedIds).toContain(id);
      for (const id of excludes) expect(selectedIds).not.toContain(id);
    },
  );

  it.each(['What is the weather on Mars tomorrow?', 'こんにちは'])(
    'returns no sections for %s',
    (question) => {
      expect(selectSections(question, KNOWLEDGE_SECTIONS)).toEqual([]);
    },
  );

  it('reuses the previous sections for an unmatched follow-up', () => {
    const previous = selectSections('画像を送れますか', KNOWLEDGE_SECTIONS);

    expect(
      selectSectionsWithFallback(
        'それはどうやって?',
        KNOWLEDGE_SECTIONS,
        previous,
      ),
    ).toEqual(previous);
    expect(
      selectSectionsWithFallback('それはどうやって?', KNOWLEDGE_SECTIONS, []),
    ).toEqual([]);
    expect(
      selectSectionsWithFallback(
        'How do I fix a CORS error?',
        KNOWLEDGE_SECTIONS,
        previous,
      )[0]?.id,
    ).toBe('browser-cors-notes');
  });
});

describe('support knowledge', () => {
  it('includes the complete knowledge used by the server example', () => {
    expect(PACKAGE_KNOWLEDGE).toBe(canonicalKnowledge);
    expect(PACKAGE_KNOWLEDGE).toContain('## Deeper documentation');
  });
});
