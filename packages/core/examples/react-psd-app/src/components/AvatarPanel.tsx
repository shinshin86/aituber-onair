import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useBlink } from '../hooks/useBlink';
import type { PsdAvatarController } from '../hooks/usePsdAvatar';
import {
  MAX_PSD_EFFECT_SCALE,
  MIN_PSD_EFFECT_SCALE,
  drawPsdEmotionEffectAnchorGuides,
  drawPsdEmotionEffectBack,
  drawPsdEmotionEffectFront,
  normalizePsdEmotionEffectAnchor,
  withPsdEmotionReactionId,
  type PsdEmotionEffectAnchor,
  type PsdEmotionEffectControlMode,
  type PsdEmotionEffectMap,
  type PsdEmotionReaction,
} from '../lib/psdEmotionEffects';
import { renderPsdToCanvas } from '../lib/psdRenderer';
import {
  createAnime25RigAvatar,
  type Anime25RigAvatar,
} from '../lib/rig/anime25Renderer';
import {
  AVATAR_VIEW_WHEEL_STEP,
  calculateCenteredZoomTransform,
  clampAvatarViewScale,
  sanitizeAvatarViewTransform,
  type AvatarViewBounds,
} from '../lib/avatarViewTransform';
import type { AvatarViewTransform } from '../types/settings';

interface AvatarPanelProps {
  mouthLevel: number;
  isSpeaking: boolean;
  smoothedValue: number;
  psdAvatar: PsdAvatarController;
  avatarReaction?: PsdEmotionReaction | null;
  avatarViewTransform: AvatarViewTransform;
  motionEnabled: boolean;
  motionIntensity: number;
  onAvatarViewTransformChange: (transform: AvatarViewTransform) => void;
  effectAnchor: PsdEmotionEffectAnchor;
  onEffectAnchorChange: (anchor: PsdEmotionEffectAnchor) => void;
  onEffectAnchorReset: () => void;
  emotionEffectControlMode: PsdEmotionEffectControlMode;
  emotionEffectMap: PsdEmotionEffectMap;
}

interface EffectPlayback {
  effect: PsdEmotionReaction['effect'] | null;
  weight: number;
}

type EffectAnchorTarget = 'face' | 'leftEye' | 'rightEye';

const AVATAR_VIEW_COMMIT_DELAY_MS = 180;
const MANUAL_EFFECT_DURATION_MS = 2600;
const EFFECT_FADE_IN_MS = 180;
const EFFECT_FADE_OUT_MS = 320;
const RMS_CEILING = 0.12;

const AVATAR_EXPRESSION_OPTIONS = [
  { emotion: 'happy', label: '喜び' },
  { emotion: 'surprised', label: '驚き' },
  { emotion: 'sad', label: '悲しみ' },
  { emotion: 'angry', label: '怒り' },
  { emotion: 'relaxed', label: '安らぎ' },
  { emotion: 'thinking', label: '考え中' },
] as const;

const EFFECT_ANCHOR_TARGETS = [
  { target: 'face', label: '顔中心' },
  { target: 'leftEye', label: '左目' },
  { target: 'rightEye', label: '右目' },
] as const satisfies ReadonlyArray<{
  target: EffectAnchorTarget;
  label: string;
}>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getAvatarViewBounds(element: HTMLElement): AvatarViewBounds {
  return {
    width: element.offsetWidth || 1,
    height: element.offsetHeight || 1,
  };
}

function avatarViewTransformKey(transform: AvatarViewTransform): string {
  return `${transform.x}:${transform.y}:${transform.scale}`;
}

function AvatarViewLayer({
  transform,
  interactionEnabled,
  onTransformChange,
  children,
}: {
  transform: AvatarViewTransform;
  interactionEnabled: boolean;
  onTransformChange: (transform: AvatarViewTransform) => void;
  children: ReactNode;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [localTransform, setLocalTransform] = useState(() =>
    sanitizeAvatarViewTransform(transform),
  );
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: AvatarViewTransform;
  } | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const localTransformRef = useRef(localTransform);

  const commitTransform = useCallback(
    (nextTransform: AvatarViewTransform) => {
      if (commitTimerRef.current) {
        window.clearTimeout(commitTimerRef.current);
      }
      commitTimerRef.current = window.setTimeout(() => {
        onTransformChange(nextTransform);
      }, AVATAR_VIEW_COMMIT_DELAY_MS);
    },
    [onTransformChange],
  );

  const applyTransform = useCallback(
    (
      nextTransform: AvatarViewTransform,
      commit = true,
      bounds?: AvatarViewBounds,
    ) => {
      const sanitized = sanitizeAvatarViewTransform(nextTransform, bounds);
      localTransformRef.current = sanitized;
      setLocalTransform(sanitized);
      if (commit) commitTransform(sanitized);
    },
    [commitTransform],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!interactionEnabled) return;
      event.preventDefault();
      const delta = -Math.sign(event.deltaY) * AVATAR_VIEW_WHEEL_STEP;
      const nextScale = clampAvatarViewScale(
        localTransformRef.current.scale + delta,
      );
      const element = layerRef.current;
      if (!element) return;
      applyTransform(
        calculateCenteredZoomTransform(
          localTransformRef.current,
          nextScale,
          getAvatarViewBounds(element),
        ),
      );
    },
    [applyTransform, interactionEnabled],
  );

  useEffect(() => {
    const element = layerRef.current;
    if (!element) return;
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(
    () => () => {
      if (commitTimerRef.current) {
        window.clearTimeout(commitTimerRef.current);
      }
    },
    [],
  );

  return (
    <div
      ref={layerRef}
      className={`avatar-view-layer${
        interactionEnabled ? '' : ' is-interaction-disabled'
      }`}
      style={{
        transform: `translate(${localTransform.x}px, ${localTransform.y}px) scale(${localTransform.scale})`,
      }}
      onPointerDown={(event) => {
        if (!interactionEnabled || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          origin: localTransformRef.current,
        };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (
          !interactionEnabled ||
          !drag ||
          drag.pointerId !== event.pointerId
        ) {
          return;
        }
        applyTransform(
          {
            ...drag.origin,
            x: drag.origin.x + event.clientX - drag.startX,
            y: drag.origin.y + event.clientY - drag.startY,
          },
          false,
          getAvatarViewBounds(event.currentTarget),
        );
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        onTransformChange(localTransformRef.current);
      }}
      onPointerCancel={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        onTransformChange(localTransformRef.current);
      }}
      onDoubleClick={() => {
        if (interactionEnabled) applyTransform({ x: 0, y: 0, scale: 1 });
      }}
    >
      {children}
    </div>
  );
}

function PsdCanvasAvatar({
  psdAvatar,
  mouthOpen,
  eyesClosed,
}: {
  psdAvatar: PsdAvatarController;
  mouthOpen: boolean;
  eyesClosed: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { model, visibility, roles } = psdAvatar;

  useEffect(() => {
    if (!model || !canvasRef.current) return;
    renderPsdToCanvas(model, canvasRef.current, visibility, roles, {
      mouthOpen,
      eyesClosed,
    });
  }, [eyesClosed, model, mouthOpen, roles, visibility]);

  if (!model) return null;
  return (
    <canvas
      ref={canvasRef}
      className="avatar-image avatar-canvas avatar-model-canvas"
      aria-label="PSD avatar"
    />
  );
}

function MotionRigCanvasAvatar({
  psdAvatar,
  mouthOpenValue,
  motionEnabled,
  motionIntensity,
}: {
  psdAvatar: PsdAvatarController;
  mouthOpenValue: number;
  motionEnabled: boolean;
  motionIntensity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarRef = useRef<Anime25RigAvatar | null>(null);
  const rig = psdAvatar.rig?.rig;

  useEffect(() => {
    if (!rig || !canvasRef.current) return;
    avatarRef.current?.dispose();
    avatarRef.current = createAnime25RigAvatar(canvasRef.current, rig);
    return () => {
      avatarRef.current?.dispose();
      avatarRef.current = null;
    };
  }, [rig]);

  useEffect(() => {
    avatarRef.current?.setMouthOpen(motionEnabled ? mouthOpenValue : 0);
  }, [motionEnabled, mouthOpenValue]);

  useEffect(() => {
    avatarRef.current?.setMotionEnabled(motionEnabled);
    avatarRef.current?.setIntensity(motionIntensity);
  }, [motionEnabled, motionIntensity]);

  useEffect(() => {
    avatarRef.current?.setMotionProfile(psdAvatar.motionProfile);
  }, [psdAvatar.motionProfile]);

  if (!rig) return null;
  return (
    <canvas
      ref={canvasRef}
      className="avatar-image avatar-canvas avatar-model-canvas"
      aria-label="Motion PSD avatar"
    />
  );
}

function usePsdEmotionPlayback(
  reaction: PsdEmotionReaction | null,
): MutableRefObject<EffectPlayback> {
  const playbackRef = useRef<EffectPlayback>({
    effect: null,
    weight: 0,
  });

  useEffect(() => {
    let animationFrame = 0;
    const start = performance.now();

    if (!reaction) {
      const startPlayback = playbackRef.current;
      if (!startPlayback.effect || startPlayback.weight <= 0) return;
      const tick = (now: number) => {
        const weight = Math.max(
          0,
          startPlayback.weight * (1 - (now - start) / EFFECT_FADE_OUT_MS),
        );
        const next = {
          effect: weight > 0 ? startPlayback.effect : null,
          weight,
        };
        playbackRef.current = next;
        if (weight > 0) animationFrame = requestAnimationFrame(tick);
      };
      animationFrame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animationFrame);
    }

    const tick = (now: number) => {
      const elapsed = now - start;
      const fadeIn = Math.min(elapsed / EFFECT_FADE_IN_MS, 1);
      const fadeOut = reaction.durationMs
        ? clamp((reaction.durationMs - elapsed) / EFFECT_FADE_OUT_MS, 0, 1)
        : 1;
      const weight = Math.min(fadeIn, fadeOut);
      const next = {
        effect: weight > 0 ? reaction.effect : null,
        weight,
      };
      playbackRef.current = next;
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
  width,
  height,
  anchor,
  playbackRef,
  anchorEditorOpen,
  onAnchorPoint,
}: {
  layer: 'back' | 'front';
  width: number;
  height: number;
  anchor: PsdEmotionEffectAnchor;
  playbackRef: MutableRefObject<EffectPlayback>;
  anchorEditorOpen: boolean;
  onAnchorPoint: (xRatio: number, yRatio: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrame = 0;
    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      const geometry = { width, height, anchor };
      const playback = playbackRef.current;
      if (layer === 'back') {
        drawPsdEmotionEffectBack(
          context,
          geometry,
          playback.effect,
          playback.weight,
          now,
        );
      } else {
        drawPsdEmotionEffectFront(
          context,
          geometry,
          playback.effect,
          playback.weight,
          now,
        );
        if (anchorEditorOpen) {
          drawPsdEmotionEffectAnchorGuides(context, geometry);
        }
      }
      animationFrame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(animationFrame);
  }, [anchor, anchorEditorOpen, height, layer, playbackRef, width]);

  return (
    <canvas
      ref={canvasRef}
      className={`avatar-image avatar-effect-canvas is-${layer}${
        anchorEditorOpen && layer === 'front' ? ' is-anchor-editing' : ''
      }`}
      aria-hidden={!anchorEditorOpen || layer !== 'front'}
      aria-label={
        anchorEditorOpen && layer === 'front'
          ? '感情表現エフェクトアンカー配置エリア'
          : undefined
      }
      onPointerDown={(event) => {
        if (!anchorEditorOpen || layer !== 'front' || event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const point = clientPointToCanvasRatio(
          event.currentTarget,
          width,
          height,
          event.clientX,
          event.clientY,
        );
        if (point) onAnchorPoint(point.xRatio, point.yRatio);
      }}
    />
  );
}

function clientPointToCanvasRatio(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  clientX: number,
  clientY: number,
): { xRatio: number; yRatio: number } | null {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const scale = Math.min(bounds.width / width, bounds.height / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const offsetX = bounds.left + (bounds.width - drawWidth) / 2;
  const offsetY = bounds.top + (bounds.height - drawHeight) / 2;
  if (
    clientX < offsetX ||
    clientX > offsetX + drawWidth ||
    clientY < offsetY ||
    clientY > offsetY + drawHeight
  ) {
    return null;
  }
  return {
    xRatio: clamp((clientX - offsetX) / drawWidth, 0, 1),
    yRatio: clamp((clientY - offsetY) / drawHeight, 0, 1),
  };
}

function AvatarCanvasContent({
  mouthLevel,
  isSpeaking,
  smoothedValue,
  psdAvatar,
  avatarReaction,
  avatarViewTransform,
  motionEnabled,
  motionIntensity,
  onAvatarViewTransformChange,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
  emotionEffectControlMode,
  emotionEffectMap,
}: AvatarPanelProps) {
  const eyesClosed = useBlink();
  const mouthOpen = isSpeaking && mouthLevel >= 1;
  const mouthOpenValue = isSpeaking
    ? clamp(Math.max(smoothedValue / RMS_CEILING, mouthLevel / 4), 0, 1)
    : 0;
  const width =
    psdAvatar.mode === 'motion'
      ? psdAvatar.rig?.rig?.canvas.w
      : psdAvatar.model?.width;
  const height =
    psdAvatar.mode === 'motion'
      ? psdAvatar.rig?.rig?.canvas.h
      : psdAvatar.model?.height;
  const hasAvatar = Boolean(width && height && psdAvatar.source);
  const showManualControls = emotionEffectControlMode === 'manual';
  const [manualReaction, setManualReaction] =
    useState<PsdEmotionReaction | null>(null);
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);
  const [anchorTarget, setAnchorTarget] = useState<EffectAnchorTarget>('face');
  const manualReactionIdRef = useRef(0);
  const activeReaction =
    emotionEffectControlMode === 'linked'
      ? avatarReaction || null
      : showManualControls
        ? manualReaction
        : null;
  const playbackRef = usePsdEmotionPlayback(activeReaction);

  const handleAnchorPoint = useCallback(
    (xRatio: number, yRatio: number) => {
      const next = normalizePsdEmotionEffectAnchor({
        ...effectAnchor,
        ...(anchorTarget === 'face'
          ? { faceX: xRatio, faceY: yRatio }
          : anchorTarget === 'leftEye'
            ? { leftEyeX: xRatio, leftEyeY: yRatio }
            : { rightEyeX: xRatio, rightEyeY: yRatio }),
      });
      onEffectAnchorChange(next);
    },
    [anchorTarget, effectAnchor, onEffectAnchorChange],
  );

  return (
    <>
      <AvatarViewLayer
        key={avatarViewTransformKey(avatarViewTransform)}
        transform={avatarViewTransform}
        interactionEnabled={!anchorEditorOpen}
        onTransformChange={onAvatarViewTransformChange}
      >
        {hasAvatar && width && height ? (
          <div className="avatar-effect-stack">
            <EmotionEffectCanvas
              layer="back"
              width={width}
              height={height}
              anchor={effectAnchor}
              playbackRef={playbackRef}
              anchorEditorOpen={false}
              onAnchorPoint={handleAnchorPoint}
            />
            {psdAvatar.mode === 'motion' && psdAvatar.rig?.rig ? (
              <MotionRigCanvasAvatar
                psdAvatar={psdAvatar}
                mouthOpenValue={mouthOpenValue}
                motionEnabled={motionEnabled}
                motionIntensity={motionIntensity}
              />
            ) : psdAvatar.model ? (
              <PsdCanvasAvatar
                psdAvatar={psdAvatar}
                mouthOpen={mouthOpen}
                eyesClosed={eyesClosed}
              />
            ) : null}
            <EmotionEffectCanvas
              layer="front"
              width={width}
              height={height}
              anchor={effectAnchor}
              playbackRef={playbackRef}
              anchorEditorOpen={anchorEditorOpen}
              onAnchorPoint={handleAnchorPoint}
            />
          </div>
        ) : null}
      </AvatarViewLayer>

      {showManualControls && (
        <div
          className="avatar-expression-controls"
          role="group"
          aria-label="PSDアバター感情表現エフェクトとアンカー設定"
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
                disabled={!hasAvatar || !effect}
                onClick={() => {
                  if (!effect) return;
                  manualReactionIdRef.current += 1;
                  setManualReaction(
                    withPsdEmotionReactionId(
                      { effect, durationMs: MANUAL_EFFECT_DURATION_MS },
                      manualReactionIdRef.current,
                    ),
                  );
                }}
                aria-label={`${option.label}の感情表現エフェクトをプレビュー`}
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
            disabled={!hasAvatar}
            onClick={() => setManualReaction(null)}
            aria-label="感情表現エフェクトを解除"
          >
            解除
          </button>
          <button
            type="button"
            className={`avatar-expression-button is-anchor${
              anchorEditorOpen ? ' is-active' : ''
            }`}
            disabled={!hasAvatar}
            aria-pressed={anchorEditorOpen}
            onClick={() => setAnchorEditorOpen((current) => !current)}
          >
            アンカー調整
          </button>
        </div>
      )}

      {showManualControls && anchorEditorOpen && hasAvatar && (
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
              min={MIN_PSD_EFFECT_SCALE * 100}
              max={MAX_PSD_EFFECT_SCALE * 100}
              step="5"
              value={Math.round(effectAnchor.effectScale * 100)}
              onChange={(event) =>
                onEffectAnchorChange(
                  normalizePsdEmotionEffectAnchor({
                    ...effectAnchor,
                    effectScale: Number(event.target.value) / 100,
                  }),
                )
              }
            />
            <output>{Math.round(effectAnchor.effectScale * 100)}%</output>
          </label>
          <div className="avatar-anchor-actions">
            <button
              type="button"
              className="avatar-expression-button is-reset"
              onClick={() => {
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
    </>
  );
}

export function AvatarPanel(props: AvatarPanelProps) {
  const barWidth = Math.min((props.smoothedValue / RMS_CEILING) * 100, 100);
  return (
    <div className="avatar-panel">
      <div className="avatar-container">
        <AvatarCanvasContent {...props} />
        {props.psdAvatar.loading && (
          <div className="avatar-loading" role="status">
            Loading PSD...
          </div>
        )}
      </div>
      <div className="debug-panel">
        <div className="debug-bar-container">
          <div className="debug-bar" style={{ width: `${barWidth}%` }} />
        </div>
        <div className="debug-info">
          <span>Mouth: {props.mouthLevel}/4</span>
          <span>RMS: {props.smoothedValue.toFixed(4)}</span>
          <span>{props.isSpeaking ? '🔊 Speaking' : '🔇 Idle'}</span>
        </div>
      </div>
    </div>
  );
}

/** Avatar composited into the chat background. */
export function AvatarBackground(props: AvatarPanelProps) {
  return (
    <div className="avatar-background">
      <div className="avatar-container">
        <AvatarCanvasContent {...props} />
      </div>
    </div>
  );
}
