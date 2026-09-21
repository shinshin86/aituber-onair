import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import { useSingleImageAvatarMotion } from '../hooks/useSingleImageAvatarMotion';
import {
  DEFAULT_EMOTION_EFFECT_ANCHOR,
  type EmotionEffectAnchor,
  MAX_EMOTION_EFFECT_SCALE,
  MIN_EMOTION_EFFECT_SCALE,
  normalizeEmotionEffectAnchor,
} from '../lib/emotionEffectAnchor';
import {
  type PngTuberEmotionEffectMap,
  type PngTuberEmotionReaction,
  type PngTuberReactionControlMode,
  type PngTuberReactionEmotion,
  drawPngTuberEmotionEffectAnchorGuides,
  drawPngTuberEmotionEffectBack,
  drawPngTuberEmotionEffectFront,
  withPngTuberEmotionReactionId,
} from '../lib/pngtuberEmotionEffects';
import type { AvatarMotionStyle, BundledAvatarId } from '../types/settings';

interface AvatarPanelProps {
  voiceLevel: number;
  isSpeaking: boolean;
  avatarImageUrl?: string | null;
  motionPreviewToken?: number;
  motionStyle?: AvatarMotionStyle;
  bundledAvatar?: BundledAvatarId;
}

const BUNDLED_AVATAR_IMAGES: Record<BundledAvatarId, string> = {
  miko: '/avatar/miko-avatar.png',
  'miko-puppet': '/avatar/miko-puppet-avatar.png',
};

interface AvatarBackgroundProps extends AvatarPanelProps {
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

function AvatarFallback() {
  return (
    <div className="avatar-fallback" role="img" aria-label="Avatar">
      ●
    </div>
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
  voiceLevel,
  isSpeaking,
  avatarImageUrl,
  motionPreviewToken,
  motionStyle = 'bounce',
  bundledAvatar = 'miko',
}: AvatarPanelProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const motionRef = useSingleImageAvatarMotion(
    voiceLevel,
    isSpeaking,
    motionStyle,
    motionPreviewToken,
  );
  const imageSrc = avatarImageUrl || BUNDLED_AVATAR_IMAGES[bundledAvatar];
  const showImage = Boolean(imageSrc) && failedImageSrc !== imageSrc;
  const barWidth = Math.min(voiceLevel * 100, 100);

  return (
    <div className="avatar-panel">
      <div className="avatar-container">
        <div className="avatar-motion-layer" ref={motionRef}>
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
          {!showImage && <AvatarFallback />}
        </div>
      </div>

      {/* Debug display */}
      <div className="debug-panel">
        <div className="debug-bar-container">
          <div className="debug-bar" style={{ width: `${barWidth}%` }} />
        </div>
        <div className="debug-info">
          <span>Voice: {(voiceLevel * 100).toFixed(0)}%</span>
          <span>{isSpeaking ? '🔊 Speaking' : '🔇 Idle'}</span>
        </div>
      </div>
    </div>
  );
}

/** Avatar composited into the chat background */
export function AvatarBackground({
  voiceLevel,
  isSpeaking,
  avatarImageUrl,
  motionPreviewToken,
  avatarReaction,
  motionStyle = 'bounce',
  bundledAvatar = 'miko',
  reactionControlMode,
  emotionEffectMap,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
}: AvatarBackgroundProps) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const motionRef = useSingleImageAvatarMotion(
    voiceLevel,
    isSpeaking,
    motionStyle,
    motionPreviewToken,
  );
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

  const imageSrc = avatarImageUrl || BUNDLED_AVATAR_IMAGES[bundledAvatar];
  const showImage = Boolean(imageSrc) && failedImageSrc !== imageSrc;

  return (
    <div className="avatar-background">
      <div className="avatar-container">
        <div className="avatar-motion-layer" ref={motionRef}>
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
          {!showImage && <AvatarFallback />}
          <EmotionEffectCanvas
            layer="front"
            playbackRef={playbackRef}
            anchor={effectAnchor}
            anchorEditorOpen={showManualControls && anchorEditorOpen}
            onAnchorPoint={handleAnchorPoint}
          />
        </div>
      </div>
      {showManualControls && (
        <div
          className="avatar-expression-controls"
          role="group"
          aria-label="1枚画像アバター感情表現エフェクト"
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
