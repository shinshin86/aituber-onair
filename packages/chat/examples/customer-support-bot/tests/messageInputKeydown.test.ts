import { describe, expect, it } from 'vitest';
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

describe('message input keydown', () => {
  it('submits a regular Enter keydown', () => {
    expect(shouldSubmitMessageOnKeyDown(keyDown({}))).toBe(true);
  });

  it('keeps Shift+Enter as a newline', () => {
    expect(shouldSubmitMessageOnKeyDown(keyDown({ shiftKey: true }))).toBe(
      false,
    );
  });

  it('ignores a synthetic composing Enter keydown', () => {
    expect(shouldSubmitMessageOnKeyDown(keyDown({ isComposing: true }))).toBe(
      false,
    );
  });

  it('ignores Safari composition confirmation keyCode 229', () => {
    expect(shouldSubmitMessageOnKeyDown(keyDown({ keyCode: 229 }))).toBe(false);
  });
});
