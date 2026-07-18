import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  drawPngTuberEmotionEffectAnchorGuides,
  drawPngTuberEmotionEffectBack,
  drawPngTuberEmotionEffectFront,
  withPngTuberEmotionReactionId,
  type PngTuberEmotionEffectMap,
  type PngTuberEmotionReaction,
  type PngTuberReactionControlMode,
  type PngTuberReactionEmotion,
} from '../lib/pngtuberEmotionEffects';
import {
  DEFAULT_EMOTION_EFFECT_ANCHOR,
  MAX_EMOTION_EFFECT_SCALE,
  MIN_EMOTION_EFFECT_SCALE,
  normalizeEmotionEffectAnchor,
  type EmotionEffectAnchor,
} from '../lib/emotionEffectAnchor';

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

interface AvatarBackgroundProps
  extends Omit<AvatarPanelProps, 'smoothedValue'> {
  avatarReaction?: PngTuberEmotionReaction | null;
  reactionControlMode: PngTuberReactionControlMode;
  emotionEffectMap: PngTuberEmotionEffectMap;
  effectAnchor: EmotionEffectAnchor;
  onEffectAnchorChange: (anchor: EmotionEffectAnchor) => void;
  onEffectAnchorReset: () => void;
}

interface EffectPlayback {
  effect: PngTuberEmotionReaction['effect'] | null;
  weight: number;
}

const MANUAL_EFFECT_DURATION_MS = 2600;
const EFFECT_FADE_IN_MS = 180;
const EFFECT_FADE_OUT_MS = 320;
type EffectAnchorTarget = 'face' | 'leftEye' | 'rightEye';
const EFFECT_ANCHOR_TARGETS = [
  { target: 'face', label: '顔' },
  { target: 'leftEye', label: '左目' },
  { target: 'rightEye', label: '右目' },
] as const satisfies ReadonlyArray<{
  target: EffectAnchorTarget;
  label: string;
}>;
const AVATAR_EXPRESSION_OPTIONS = [
  { emotion: 'happy', label: '喜び' },
  { emotion: 'surprised', label: '驚き' },
  { emotion: 'sad', label: '悲しみ' },
  { emotion: 'angry', label: '怒り' },
  { emotion: 'relaxed', label: '安らぎ' },
  { emotion: 'thinking', label: '考え中' },
] as const satisfies ReadonlyArray<{
  emotion: PngTuberReactionEmotion;
  label: string;
}>;

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
        openTimeout = setTimeout(
          () => {
            setEyesClosed(false);
            scheduleBlink();
          },
          100 + Math.random() * 100,
        );
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
function selectImageKey(
  mouthOpen: boolean,
  eyesClosed: boolean,
): AvatarImageKey {
  if (mouthOpen) {
    return eyesClosed ? 'mouth_open_eyes_close' : 'mouth_open_eyes_open';
  }
  return eyesClosed ? 'mouth_close_eyes_close' : 'mouth_close_eyes_open';
}

/** Fallback SVG when image is unavailable */
function FallbackAvatar({
  mouthOpen,
  eyesClosed,
}: { mouthOpen: boolean; eyesClosed: boolean }) {
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
      <circle
        cx="100"
        cy="100"
        r="80"
        fill="#FFE0B2"
        stroke="#E0A060"
        strokeWidth="2"
      />
      {/* Left eye */}
      {eyesClosed ? (
        <line
          x1="58"
          y1="85"
          x2="82"
          y2="85"
          stroke="#333"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <circle cx="70" cy="85" r="8" fill="#333" />
      )}
      {/* Right eye */}
      {eyesClosed ? (
        <line
          x1="118"
          y1="85"
          x2="142"
          y2="85"
          stroke="#333"
          strokeWidth="2"
          strokeLinecap="round"
        />
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

function useEmotionPlayback(
  reaction: PngTuberEmotionReaction | null,
): MutableRefObject<EffectPlayback> {
  const playbackRef = useRef<EffectPlayback>({ effect: null, weight: 0 });

  useEffect(() => {
    let animationFrame = 0;
    const start = performance.now();
    const startPlayback = playbackRef.current;

    const tick = (now: number) => {
      const elapsed = now - start;
      if (!reaction) {
        const weight = Math.max(
          0,
          startPlayback.weight * (1 - elapsed / EFFECT_FADE_OUT_MS),
        );
        playbackRef.current = {
          effect: weight > 0 ? startPlayback.effect : null,
          weight,
        };
        if (weight > 0) animationFrame = requestAnimationFrame(tick);
        return;
      }

      const fadeIn = Math.min(elapsed / EFFECT_FADE_IN_MS, 1);
      const fadeOut = reaction.durationMs
        ? Math.max(
            0,
            Math.min((reaction.durationMs - elapsed) / EFFECT_FADE_OUT_MS, 1),
          )
        : 1;
      const weight = Math.min(fadeIn, fadeOut);
      playbackRef.current = {
        effect: weight > 0 ? reaction.effect : null,
        weight,
      };
      if (!reaction.durationMs || elapsed < reaction.durationMs) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [reaction]);

  return playbackRef;
}

function EmotionEffectCanvas({
  layer,
  playbackRef,
  anchor,
  anchorEditorOpen,
  onAnchorPoint,
}: {
  layer: 'back' | 'front';
  playbackRef: MutableRefObject<EffectPlayback>;
  anchor: EmotionEffectAnchor;
  anchorEditorOpen: boolean;
  onAnchorPoint: (xRatio: number, yRatio: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    let animationFrame = 0;
    let width = 1;
    let height = 1;
    let devicePixelRatio = 1;

    const resize = () => {
      width = Math.max(container.clientWidth, 1);
      height = Math.max(container.clientHeight, 1);
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const draw = (now: number) => {
      const context = canvas.getContext('2d');
      if (context) {
        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);
        const playback = playbackRef.current;
        const drawEffect =
          layer === 'back'
            ? drawPngTuberEmotionEffectBack
            : drawPngTuberEmotionEffectFront;
        drawEffect(
          context,
          width,
          height,
          playback.effect,
          playback.weight,
          now,
          anchor,
        );
        if (layer === 'front' && anchorEditorOpen) {
          drawPngTuberEmotionEffectAnchorGuides(context, width, height, anchor);
        }
      }
      animationFrame = requestAnimationFrame(draw);
    };
    animationFrame = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [anchor, anchorEditorOpen, layer, playbackRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`avatar-effect-canvas is-${layer}${
        anchorEditorOpen ? ' is-anchor-editing' : ''
      }`}
      aria-hidden={layer === 'back' || !anchorEditorOpen}
      aria-label={
        layer === 'front' && anchorEditorOpen
          ? '感情表現エフェクトアンカー配置エリア'
          : undefined
      }
      onPointerDown={(event) => {
        if (layer !== 'front' || !anchorEditorOpen || event.button !== 0) {
          return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        event.preventDefault();
        event.stopPropagation();
        onAnchorPoint(
          (event.clientX - bounds.left) / bounds.width,
          (event.clientY - bounds.top) / bounds.height,
        );
      }}
    />
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
        {!showImage && (
          <FallbackAvatar mouthOpen={mouthOpen} eyesClosed={eyesClosed} />
        )}
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
  avatarReaction,
  reactionControlMode,
  emotionEffectMap,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
}: AvatarBackgroundProps) {
  const eyesClosed = useBlink();
  const mouthOpen = isSpeaking && mouthLevel >= 1;
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const [manualReaction, setManualReaction] =
    useState<PngTuberEmotionReaction | null>(null);
  const manualReactionIdRef = useRef(0);
  const effectAnchorRef = useRef(effectAnchor);
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);
  const [anchorTarget, setAnchorTarget] = useState<EffectAnchorTarget>('face');
  const showManualControls = reactionControlMode === 'manual';
  const activeReaction =
    reactionControlMode === 'linked'
      ? avatarReaction || null
      : showManualControls
        ? manualReaction
        : null;
  const playbackRef = useEmotionPlayback(activeReaction);

  useEffect(() => {
    effectAnchorRef.current = effectAnchor;
  }, [effectAnchor]);

  const handleAnchorPoint = (xRatio: number, yRatio: number) => {
    const current = effectAnchorRef.current;
    const next = normalizeEmotionEffectAnchor({
      ...current,
      ...(anchorTarget === 'face'
        ? { faceX: xRatio, faceY: yRatio }
        : anchorTarget === 'leftEye'
          ? { leftEyeX: xRatio, leftEyeY: yRatio }
          : { rightEyeX: xRatio, rightEyeY: yRatio }),
    });
    effectAnchorRef.current = next;
    onEffectAnchorChange(next);
  };

  const imageKey = useMemo(
    () => selectImageKey(mouthOpen, eyesClosed),
    [mouthOpen, eyesClosed],
  );
  const imageSrc = avatarImageUrls?.[imageKey] || AVATAR_IMAGES[imageKey];
  const showImage = Boolean(imageSrc) && failedImageSrc !== imageSrc;

  return (
    <div className="avatar-background">
      <div className="avatar-container">
        <EmotionEffectCanvas
          layer="back"
          playbackRef={playbackRef}
          anchor={effectAnchor}
          anchorEditorOpen={false}
          onAnchorPoint={handleAnchorPoint}
        />
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
        {!showImage && (
          <FallbackAvatar mouthOpen={mouthOpen} eyesClosed={eyesClosed} />
        )}
        <EmotionEffectCanvas
          layer="front"
          playbackRef={playbackRef}
          anchor={effectAnchor}
          anchorEditorOpen={showManualControls && anchorEditorOpen}
          onAnchorPoint={handleAnchorPoint}
        />
      </div>
      {showManualControls && (
        <div
          className="avatar-expression-controls"
          role="group"
          aria-label="PNGTuberアバター感情表現エフェクト"
        >
          <span className="avatar-expression-controls-label">
            感情表現エフェクト
          </span>
          {AVATAR_EXPRESSION_OPTIONS.map((option) => {
            const effect = emotionEffectMap[option.emotion];
            return (
              <button
                key={option.emotion}
                type="button"
                className="avatar-expression-button"
                disabled={!effect}
                onClick={() => {
                  if (!effect) return;
                  manualReactionIdRef.current += 1;
                  setManualReaction(
                    withPngTuberEmotionReactionId(
                      { effect, durationMs: MANUAL_EFFECT_DURATION_MS },
                      manualReactionIdRef.current,
                    ),
                  );
                }}
                title={
                  effect ? undefined : 'エフェクトが割り当てられていません'
                }
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            className="avatar-expression-button is-reset"
            onClick={() => setManualReaction(null)}
          >
            解除
          </button>
          <button
            type="button"
            className={`avatar-expression-button is-anchor${
              anchorEditorOpen ? ' is-active' : ''
            }`}
            aria-pressed={anchorEditorOpen}
            onClick={() => setAnchorEditorOpen((current) => !current)}
          >
            アンカー調整
          </button>
        </div>
      )}
      {showManualControls && anchorEditorOpen && (
        <div
          className="avatar-anchor-editor"
          role="group"
          aria-label="感情表現エフェクトアンカー調整"
        >
          <span className="avatar-anchor-editor-label">
            配置先を選び、アバター上をクリック
          </span>
          <div className="avatar-anchor-targets">
            {EFFECT_ANCHOR_TARGETS.map((option) => (
              <button
                key={option.target}
                type="button"
                className={`avatar-expression-button${
                  anchorTarget === option.target ? ' is-active' : ''
                }`}
                aria-pressed={anchorTarget === option.target}
                onClick={() => setAnchorTarget(option.target)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="avatar-anchor-scale">
            <span>エフェクトサイズ</span>
            <input
              type="range"
              min={MIN_EMOTION_EFFECT_SCALE * 100}
              max={MAX_EMOTION_EFFECT_SCALE * 100}
              step="5"
              value={Math.round(effectAnchor.effectScale * 100)}
              onChange={(event) => {
                const next = normalizeEmotionEffectAnchor({
                  ...effectAnchorRef.current,
                  effectScale: Number(event.target.value) / 100,
                });
                effectAnchorRef.current = next;
                onEffectAnchorChange(next);
              }}
            />
            <output>{Math.round(effectAnchor.effectScale * 100)}%</output>
          </label>
          <div className="avatar-anchor-actions">
            <button
              type="button"
              className="avatar-expression-button is-reset"
              onClick={() => {
                effectAnchorRef.current = DEFAULT_EMOTION_EFFECT_ANCHOR;
                onEffectAnchorReset();
                setAnchorTarget('face');
              }}
            >
              初期値に戻す
            </button>
            <button
              type="button"
              className="avatar-expression-button"
              onClick={() => setAnchorEditorOpen(false)}
            >
              完了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
