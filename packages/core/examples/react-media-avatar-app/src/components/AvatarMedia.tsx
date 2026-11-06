import { useEffect, useRef, useState } from 'react';
import { type AvatarMedia, BUNDLED_AVATAR_MEDIA } from '../lib/avatarMedia';

interface MediaElementProps {
  media: AvatarMedia;
  className?: string;
  hidden?: boolean;
  onReady?: () => void;
  onError?: () => void;
}

export function AvatarMediaElement({
  media,
  className,
  hidden,
  onReady,
  onError,
}: MediaElementProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element =
      media.kind === 'video' ? videoRef.current : imageRef.current;
    if (!element) return;
    const url = media.file
      ? URL.createObjectURL(media.file)
      : (media.url ?? '');
    element.src = url;
    return () => {
      // Release only after this element stops using the file, including during a transition.
      if (element instanceof HTMLVideoElement) element.pause();
      element.removeAttribute('src');
      if (media.file) URL.revokeObjectURL(url);
    };
  }, [media]);

  const props = {
    className,
    onError,
    style: { visibility: hidden ? ('hidden' as const) : undefined },
  };
  return media.kind === 'video' ? (
    <video
      {...props}
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label="アバター動画"
      onLoadedData={onReady}
    />
  ) : (
    <img {...props} ref={imageRef} alt="アバター" onLoad={onReady} />
  );
}

export function AvatarMediaDisplay({ media }: { media: AvatarMedia }) {
  const [displayed, setDisplayed] = useState<AvatarMedia | null>(null);
  const [failed, setFailed] = useState<AvatarMedia | null>(null);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const next = failed === media ? BUNDLED_AVATAR_MEDIA.neutral : media;
  // Keep the loaded element mounted until its replacement has decoded a frame.
  const fallbackUnavailable =
    fallbackFailed && next === BUNDLED_AVATAR_MEDIA.neutral;
  const layers = fallbackUnavailable
    ? displayed
      ? [displayed]
      : []
    : displayed && displayed !== next
      ? [displayed, next]
      : [next];
  return (
    <div className="avatar-media-stack">
      {layers.map((item) => (
        <AvatarMediaElement
          key={item.id ?? item.url}
          media={item}
          className="avatar-image"
          hidden={item !== displayed}
          onReady={() => setDisplayed(item)}
          onError={() => {
            if (item === BUNDLED_AVATAR_MEDIA.neutral) setFallbackFailed(true);
            else setFailed(item);
          }}
        />
      ))}
      {fallbackUnavailable && !displayed && (
        <div
          className="avatar-fallback"
          role="img"
          aria-label="アバターを読み込めません"
        >
          ●
        </div>
      )}
      {(failed === media || fallbackUnavailable) && (
        <span className="avatar-media-error" role="status">
          メディアを再生できません。設定から別のファイルを選択してください。
        </span>
      )}
    </div>
  );
}
