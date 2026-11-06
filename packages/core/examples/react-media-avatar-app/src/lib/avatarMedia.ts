export const AVATAR_EMOTIONS = [
  'neutral',
  'happy',
  'angry',
  'sad',
  'relaxed',
  'surprised',
] as const;
export type AvatarEmotion = (typeof AVATAR_EMOTIONS)[number];
export type AvatarMediaKind = 'image' | 'video';
export interface AvatarMedia {
  id?: string;
  kind: AvatarMediaKind;
  name: string;
  source: 'bundled' | 'upload';
  url?: string;
  file?: File;
}
export type AvatarMediaMap = Partial<Record<AvatarEmotion, AvatarMedia>>;
export const MAX_AVATAR_MEDIA_BYTES = 100 * 1024 * 1024;
export const AVATAR_MEDIA_ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm';

export function normalizeAvatarEmotion(value: unknown): AvatarEmotion {
  const normalized =
    typeof value === 'string' ? value.trim().toLowerCase() : '';
  return AVATAR_EMOTIONS.find((emotion) => emotion === normalized) ?? 'neutral';
}

export function detectAvatarMediaKind(
  file: Pick<File, 'name' | 'type'>,
): AvatarMediaKind | null {
  const mime = file.type.toLowerCase().split(';')[0].trim();
  if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mime))
    return 'image';
  if (['video/mp4', 'video/webm'].includes(mime)) return 'video';
  // Extension fallback is only for files whose MIME is unavailable or generic.
  if (mime && mime !== 'application/octet-stream') return null;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension ?? ''))
    return 'image';
  if (['mp4', 'webm'].includes(extension ?? '')) return 'video';
  return null;
}

export function validateAvatarMedia(
  file: Pick<File, 'name' | 'type' | 'size'>,
): string | null {
  if (!detectAvatarMediaKind(file))
    return 'PNG・JPG・WebP・GIF・MP4・WebMを選択してください。';
  if (file.size > MAX_AVATAR_MEDIA_BYTES)
    return 'ファイルは100 MB以下にしてください。';
  if (file.size === 0) return '空のファイルは使用できません。';
  return null;
}

const bundled = (emotion: string): AvatarMedia => ({
  kind: 'image',
  name: `${emotion}.gif`,
  source: 'bundled',
  url: `/avatar/media/${emotion}.gif`,
});
export const BUNDLED_AVATAR_MEDIA = {
  neutral: bundled('neutral'),
  happy: bundled('happy'),
  angry: bundled('angry'),
  sad: bundled('sad'),
};

export function resolveAvatarMedia(
  emotion: unknown,
  uploads: AvatarMediaMap,
): AvatarMedia {
  const normalized = normalizeAvatarEmotion(emotion);
  return (
    uploads[normalized] ??
    uploads.neutral ??
    (BUNDLED_AVATAR_MEDIA as AvatarMediaMap)[normalized] ??
    BUNDLED_AVATAR_MEDIA.neutral
  );
}
