import { useEffect, useMemo, useState } from 'react';

interface AvatarPanelProps {
  mouthLevel: number;
  isSpeaking: boolean;
  smoothedValue: number;
  avatarImageUrls?: AvatarImageUrls;
}

const AVATAR_IMAGES = {
  mouth_close_eyes_open: '/avatar/mouth_close_eyes_open.png',
  mouth_close_eyes_close: '/avatar/mouth_close_eyes_close.png',
  mouth_open_eyes_open: '/avatar/mouth_open_eyes_open.png',
  mouth_open_eyes_close: '/avatar/mouth_open_eyes_close.png',
} as const;

export type AvatarImageKey = keyof typeof AVATAR_IMAGES;
export type AvatarImageUrls = Partial<Record<AvatarImageKey, string>>;

/** Hook for random blinking */
function useBlink() {
  const [eyesClosed, setEyesClosed] = useState(false);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let openTimeout: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      // Blink every 2-6 seconds
      const interval = 2000 + Math.random() * 4000;
      blinkTimeout = setTimeout(() => {
        setEyesClosed(true);
        // Keep eyes closed for 100-200ms
        openTimeout = setTimeout(() => {
          setEyesClosed(false);
          scheduleBlink();
        }, 100 + Math.random() * 100);
      }, interval);
    };

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(openTimeout);
    };
  }, []);

  return eyesClosed;
}

/** Select image key from mouth/eye state */
function selectImageKey(mouthOpen: boolean, eyesClosed: boolean): AvatarImageKey {
  if (mouthOpen) {
    return eyesClosed
      ? 'mouth_open_eyes_close'
      : 'mouth_open_eyes_open';
  }
  return eyesClosed
    ? 'mouth_close_eyes_close'
    : 'mouth_close_eyes_open';
}

/** Fallback SVG when image is unavailable */
function FallbackAvatar({ mouthOpen, eyesClosed }: { mouthOpen: boolean; eyesClosed: boolean }) {
  const mouthHeight = mouthOpen ? 14 : 2;
  const mouthY = 130 - mouthHeight / 2;
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      style={{ display: 'block', margin: '0 auto' }}
    >
      {/* Face */}
      <circle cx="100" cy="100" r="80" fill="#FFE0B2" stroke="#E0A060" strokeWidth="2" />
      {/* Left eye */}
      {eyesClosed ? (
        <line x1="58" y1="85" x2="82" y2="85" stroke="#333" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <circle cx="70" cy="85" r="8" fill="#333" />
      )}
      {/* Right eye */}
      {eyesClosed ? (
        <line x1="118" y1="85" x2="142" y2="85" stroke="#333" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <circle cx="130" cy="85" r="8" fill="#333" />
      )}
      {/* Mouth */}
      <ellipse
        cx="100"
        cy={mouthY + mouthHeight / 2}
        rx={mouthOpen ? 15 : 12}
        ry={Math.max(mouthHeight / 2, 1)}
        fill={mouthOpen ? '#C62828' : '#333'}
        stroke="#333"
        strokeWidth="1"
      />
    </svg>
  );
}

export function AvatarPanel({
  mouthLevel,
  isSpeaking,
  smoothedValue,
  avatarImageUrls,
}: AvatarPanelProps) {
  const eyesClosed = useBlink();
  const mouthOpen = isSpeaking && mouthLevel >= 1;
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  const imageKey = useMemo(
    () => selectImageKey(mouthOpen, eyesClosed),
    [mouthOpen, eyesClosed],
  );
  const imageSrc = avatarImageUrls?.[imageKey] || AVATAR_IMAGES[imageKey];
  const showImage = Boolean(imageSrc) && failedImageSrc !== imageSrc;

  // Debug bar width (0-100%)
  const barWidth = Math.min((smoothedValue / 0.12) * 100, 100);

  return (
    <div className="avatar-panel">
      <div className="avatar-container">
        {showImage && (
          <img
            src={imageSrc}
            alt="Avatar"
            className="avatar-image"
            onError={() => {
              setFailedImageSrc(imageSrc);
            }}
          />
        )}
        {!showImage && <FallbackAvatar mouthOpen={mouthOpen} eyesClosed={eyesClosed} />}
      </div>

      {/* Debug display */}
      <div className="debug-panel">
        <div className="debug-bar-container">
          <div className="debug-bar" style={{ width: `${barWidth}%` }} />
        </div>
        <div className="debug-info">
          <span>Mouth: {mouthLevel}/4</span>
          <span>RMS: {smoothedValue.toFixed(4)}</span>
          <span>{isSpeaking ? '🔊 Speaking' : '🔇 Idle'}</span>
        </div>
      </div>
    </div>
  );
}

/** Avatar composited into the chat background */
export function AvatarBackground({
  mouthLevel,
  isSpeaking,
  avatarImageUrls,
}: Omit<AvatarPanelProps, 'smoothedValue'>) {
  const eyesClosed = useBlink();
  const mouthOpen = isSpeaking && mouthLevel >= 1;
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  const imageKey = useMemo(
    () => selectImageKey(mouthOpen, eyesClosed),
    [mouthOpen, eyesClosed],
  );
  const imageSrc = avatarImageUrls?.[imageKey] || AVATAR_IMAGES[imageKey];
  const showImage = Boolean(imageSrc) && failedImageSrc !== imageSrc;

  return (
    <div className="avatar-background">
      <div className="avatar-container">
        {showImage && (
          <img
            src={imageSrc}
            alt=""
            className="avatar-image"
            onError={() => {
              setFailedImageSrc(imageSrc);
            }}
          />
        )}
        {!showImage && <FallbackAvatar mouthOpen={mouthOpen} eyesClosed={eyesClosed} />}
      </div>
    </div>
  );
}
