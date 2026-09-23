import { describe, expect, it } from 'vitest';
import {
  buildBondAwareSystemPrompt,
  createBondIdentity,
  formatBondStage,
  getBondContextDisplayName,
} from './kizunaBond';

describe('createBondIdentity', () => {
  it('keeps YouTube and Twitch viewers separate by source', () => {
    expect(createBondIdentity('youtube', 'Aki')).toMatchObject({
      userId: 'youtube:Aki',
      displayName: 'Aki',
      isOwner: false,
    });
    expect(createBondIdentity('twitch', 'Aki').userId).toBe('twitch:Aki');
  });

  it('uses a stable owner identity for the chat form', () => {
    expect(createBondIdentity('form', 'ignored')).toEqual({
      userId: 'form:owner',
      displayName: 'あなた',
      source: 'form',
      isOwner: true,
    });
  });
});

describe('buildBondAwareSystemPrompt', () => {
  it('appends context only when it exists', () => {
    expect(buildBondAwareSystemPrompt('base', '')).toBe('base');
    expect(buildBondAwareSystemPrompt('base', 'regular viewer')).toContain(
      'regular viewer',
    );
  });
});

describe('formatBondStage', () => {
  it('uses plain Japanese labels for built-in stages', () => {
    expect(formatBondStage('stranger')).toBe('知り合ったばかり');
    expect(formatBondStage('companion')).toBe('相棒');
  });
});

describe('getBondContextDisplayName', () => {
  it('does not expose an external display name to the system prompt context', () => {
    expect(getBondContextDisplayName('youtube')).toBe('YouTube視聴者');
    expect(getBondContextDisplayName('twitch')).toBe('Twitch視聴者');
    expect(getBondContextDisplayName('form')).toBe('あなた');
  });
});
