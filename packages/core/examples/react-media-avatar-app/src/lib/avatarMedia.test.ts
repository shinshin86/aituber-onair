import { describe, expect, it } from 'vitest';
import {
  AVATAR_EMOTIONS,
  BUNDLED_AVATAR_MEDIA,
  MAX_AVATAR_MEDIA_BYTES,
  type AvatarMedia,
  detectAvatarMediaKind,
  normalizeAvatarEmotion,
  resolveAvatarMedia,
  validateAvatarMedia,
} from './avatarMedia';

describe('media avatar validation', () => {
  it.each(['png', 'jpg', 'jpeg', 'webp', 'gif'])(
    'recognizes %s without MIME metadata',
    (extension) => {
      expect(
        detectAvatarMediaKind({
          name: `avatar.${extension.toUpperCase()}`,
          type: '',
        }),
      ).toBe('image');
    },
  );
  it.each(['mp4', 'webm'])(
    'recognizes %s with generic MIME metadata',
    (extension) => {
      expect(
        detectAvatarMediaKind({
          name: `avatar.${extension}`,
          type: 'application/octet-stream',
        }),
      ).toBe('video');
    },
  );
  it('prioritizes a supported MIME over the extension', () => {
    expect(
      detectAvatarMediaKind({ name: 'avatar.png', type: 'video/webm' }),
    ).toBe('video');
    expect(detectAvatarMediaKind({ name: 'avatar', type: 'image/gif' })).toBe(
      'image',
    );
  });
  it('rejects unsupported MIME types and extensions', () => {
    expect(
      detectAvatarMediaKind({ name: 'avatar.png', type: 'image/svg+xml' }),
    ).toBeNull();
    expect(detectAvatarMediaKind({ name: 'avatar.txt', type: '' })).toBeNull();
  });
  it('accepts the size limit and rejects larger or empty files', () => {
    const file = {
      name: 'avatar.gif',
      type: 'image/gif',
      size: MAX_AVATAR_MEDIA_BYTES,
    };
    expect(validateAvatarMedia(file)).toBeNull();
    expect(validateAvatarMedia({ ...file, size: file.size + 1 })).toContain(
      '100 MB',
    );
    expect(validateAvatarMedia({ ...file, size: 0 })).toContain('空');
  });
});

describe('media avatar emotion resolution', () => {
  const neutral: AvatarMedia = {
    name: 'custom-neutral',
    source: 'upload',
    kind: 'video',
  };
  const happy: AvatarMedia = {
    name: 'custom-happy',
    source: 'upload',
    kind: 'image',
  };
  it.each(AVATAR_EMOTIONS)('preserves the Core emotion %s', (emotion) => {
    expect(normalizeAvatarEmotion(emotion)).toBe(emotion);
  });
  it('normalizes casing and treats unknown values as neutral', () => {
    expect(normalizeAvatarEmotion(' Happy ')).toBe('happy');
    for (const value of ['thinking', 'excited', undefined, null, 42])
      expect(normalizeAvatarEmotion(value)).toBe('neutral');
  });
  it('uses emotion upload before neutral upload', () => {
    expect(resolveAvatarMedia('happy', { happy, neutral })).toBe(happy);
    expect(resolveAvatarMedia('angry', { happy, neutral })).toBe(neutral);
  });
  it('uses the bundled emotion then bundled neutral when uploads are absent', () => {
    expect(resolveAvatarMedia('happy', {})).toBe(BUNDLED_AVATAR_MEDIA.happy);
    expect(resolveAvatarMedia('sad', { happy })).toBe(BUNDLED_AVATAR_MEDIA.sad);
    expect(resolveAvatarMedia('relaxed', { happy })).toBe(
      BUNDLED_AVATAR_MEDIA.neutral,
    );
    expect(resolveAvatarMedia('surprised', {})).toBe(
      BUNDLED_AVATAR_MEDIA.neutral,
    );
    expect(resolveAvatarMedia('unknown', { neutral })).toBe(neutral);
  });
});
