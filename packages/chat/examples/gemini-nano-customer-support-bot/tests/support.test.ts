import { describe, expect, it } from 'vitest';
import canonicalKnowledge from '../../customer-support-bot/server/chat-package-knowledge.md?raw';
import {
  buildSupportSystemPrompt,
  getGeminiNanoLanguageOptions,
  PACKAGE_KNOWLEDGE,
  SUPPORT_RESPONSE_LENGTH,
} from '../src/support';
import { shouldSubmitMessageOnKeyDown } from '../src/components/messageInputKeydown';

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
  it('uses the very-short preset for faster concise support replies', () => {
    expect(SUPPORT_RESPONSE_LENGTH).toBe('veryShort');
    expect(buildSupportSystemPrompt('en')).toContain(
      'Reply in one short sentence',
    );
  });
});

describe('support knowledge', () => {
  it('includes the complete knowledge used by the server example', () => {
    expect(PACKAGE_KNOWLEDGE).toBe(canonicalKnowledge);
    expect(PACKAGE_KNOWLEDGE).toContain('## Deeper documentation');
  });
});
