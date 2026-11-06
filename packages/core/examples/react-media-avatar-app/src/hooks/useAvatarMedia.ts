import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AvatarEmotion,
  type AvatarMediaMap,
  detectAvatarMediaKind,
  validateAvatarMedia,
} from '../lib/avatarMedia';
import {
  clearAvatarMedia,
  loadAvatarMedia,
  saveAvatarMedia,
} from '../lib/avatarMediaStorage';

let nextUploadId = 0;

export function useAvatarMedia() {
  const [uploads, setUploads] = useState<AvatarMediaMap>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const pendingRef = useRef(true);
  const mountedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;
    loadAvatarMedia()
      .then((files) => {
        if (cancelled) return;
        const restored: AvatarMediaMap = {};
        for (const [emotion, file] of Object.entries(files)) {
          const kind = detectAvatarMediaKind(file);
          if (kind)
            restored[emotion as AvatarEmotion] = {
              id: `upload-${++nextUploadId}`,
              kind,
              file,
              name: file.name,
              source: 'upload',
            };
        }
        setUploads(restored);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            '保存したメディアを読み込めませんでした。ブラウザの保存設定を確認してください。',
          );
      })
      .finally(() => {
        if (!cancelled) {
          pendingRef.current = false;
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const changeMedia = useCallback(
    async (emotion: AvatarEmotion | null, file: File | null) => {
      if (pendingRef.current) return;
      const validationError = file ? validateAvatarMedia(file) : null;
      if (validationError) {
        setError(validationError);
        return;
      }
      pendingRef.current = true;
      setBusy(true);
      setError('');
      try {
        if (emotion) await saveAvatarMedia(emotion, file);
        else await clearAvatarMedia();
        if (!mountedRef.current) return;
        setUploads((previous) => {
          if (!emotion) return {};
          const next = { ...previous };
          const kind = file && detectAvatarMediaKind(file);
          if (file && kind)
            next[emotion] = {
              id: `upload-${++nextUploadId}`,
              kind,
              file,
              name: file.name,
              source: 'upload',
            };
          else delete next[emotion];
          return next;
        });
      } catch {
        if (mountedRef.current)
          setError(
            'メディアを保存・削除できませんでした。空き容量とブラウザの保存設定を確認してください。',
          );
      } finally {
        pendingRef.current = false;
        if (mountedRef.current) setBusy(false);
      }
    },
    [],
  );

  return { uploads, busy, error, changeMedia };
}
