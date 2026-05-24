import { describe, expect, it, vi } from 'vitest';
import {
  normalizeTwitchComment,
  normalizeWebComment,
  normalizeYouTubeComment,
} from '../src';

describe('normalizers', () => {
  it('normalizes a YouTube comment to LiveComment', () => {
    const comment = normalizeYouTubeComment({
      id: 'yt-1',
      userName: 'Alice',
      userIconUrl: 'https://example.com/alice.png',
      userComment: 'こんにちは',
      publishedAt: '2026-05-23T10:00:00.000Z',
    });

    expect(comment).toMatchObject({
      id: 'yt-1',
      platform: 'youtube',
      text: 'こんにちは',
      author: {
        id: 'Alice',
        name: 'Alice',
        displayName: 'Alice',
      },
    });
    expect(comment.timestamp).toBe(
      new Date('2026-05-23T10:00:00.000Z').getTime()
    );
  });

  it('maps YouTube userIconUrl to author.avatarUrl', () => {
    const comment = normalizeYouTubeComment({
      id: 'yt-1',
      userName: 'Alice',
      userIconUrl: 'https://example.com/alice.png',
      userComment: 'こんにちは',
      publishedAt: '2026-05-23T10:00:00.000Z',
    });

    expect(comment.author.avatarUrl).toBe('https://example.com/alice.png');
  });

  it('generates a stable id for Twitch comments without id', () => {
    const input = {
      userName: 'bob',
      userComment: 'hello',
      publishedAt: '2026-05-23T10:00:00.000Z',
    };

    expect(normalizeTwitchComment(input).id).toBe(
      normalizeTwitchComment(input).id
    );
    expect(normalizeTwitchComment(input).id).toContain('twitch:bob');
  });

  it('uses Date.now for Twitch comments without publishedAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-23T12:00:00.000Z'));

    const comment = normalizeTwitchComment({
      userName: 'bob',
      userComment: 'hello',
    });

    expect(comment.timestamp).toBe(Date.now());
    vi.useRealTimers();
  });

  it('normalizes anonymous web comments as Guest', () => {
    const comment = normalizeWebComment({
      text: 'hello',
      timestamp: 123,
    });

    expect(comment).toMatchObject({
      platform: 'web',
      text: 'hello',
      timestamp: 123,
      author: {
        id: 'guest',
        name: 'Guest',
        displayName: 'Guest',
      },
    });
  });
});
