import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_PURUPURU_EFFECT_ANCHOR,
  MAX_EFFECT_SCALE,
  MIN_EFFECT_SCALE,
  normalizePuruPuruEffectAnchor,
} from '../lib/purupuruEffectAnchor';
import type { PuruPuruAvatarPackage } from '../lib/purupuruPackage';
import type {
  PuruPuruEmotionEffectMap,
  PuruPuruReaction,
  PuruPuruReactionControlMode,
  PuruPuruReactionEmotion,
} from '../lib/purupuruReactions';
import type { PuruPuruRendererControls } from '../lib/purupuruRenderer';
import { createPuruPuruRenderer } from '../lib/purupuruRenderer';
import type {
  AvatarViewTransform,
  PuruPuruEffectAnchor,
} from '../types/settings';

const AVATAR_VIEW_MIN_SCALE = 0.2;
const AVATAR_VIEW_MAX_SCALE = 3;
const AVATAR_VIEW_MAX_OFFSET = 100_000;
const WHEEL_ZOOM_STEP = 0.08;
const WHEEL_COMMIT_DELAY_MS = 180;
const DEFAULT_AVATAR_VIEW_TRANSFORM: AvatarViewTransform = {
  x: 0,
  y: 0,
  scale: 1,
};
const AVATAR_EXPRESSION_OPTIONS = [
  { emotion: 'happy', label: '喜び' },
  { emotion: 'surprised', label: '驚き' },
  { emotion: 'sad', label: '悲しみ' },
  { emotion: 'angry', label: '怒り' },
  { emotion: 'relaxed', label: '安らぎ' },
  { emotion: 'thinking', label: '考え中' },
] as const satisfies ReadonlyArray<{
  emotion: PuruPuruReactionEmotion;
  label: string;
}>;

interface DragState {
  pointerId: number;
  lastClientX: number;
  lastClientY: number;
}

type EffectAnchorTarget = 'face' | 'leftEye' | 'rightEye';

const EFFECT_ANCHOR_TARGETS = [
  { target: 'face', label: '顔中心' },
  { target: 'leftEye', label: '左目' },
  { target: 'rightEye', label: '右目' },
] as const satisfies ReadonlyArray<{
  target: EffectAnchorTarget;
  label: string;
}>;

interface AvatarBackgroundProps {
  mouthLevel: number;
  voiceLevel: number;
  isSpeaking: boolean;
  avatarPackage?: PuruPuruAvatarPackage | null;
  avatarReaction?: PuruPuruReaction | null;
  idleMotionEnabled: boolean;
  avatarViewTransform: AvatarViewTransform;
  onAvatarViewTransformChange: (transform: AvatarViewTransform) => void;
  effectAnchor: PuruPuruEffectAnchor;
  onEffectAnchorChange: (anchor: PuruPuruEffectAnchor) => void;
  onEffectAnchorReset: () => void;
  reactionControlMode: PuruPuruReactionControlMode;
  emotionEffectMap: PuruPuruEmotionEffectMap;
}

/** Avatar composited into the chat background. */
export function AvatarBackground({
  mouthLevel,
  voiceLevel,
  isSpeaking,
  avatarPackage,
  avatarReaction,
  idleMotionEnabled,
  avatarViewTransform,
  onAvatarViewTransformChange,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
  reactionControlMode,
  emotionEffectMap,
}: AvatarBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarPackageRef = useRef<PuruPuruAvatarPackage | null>(null);
  const controlsRef = useRef<PuruPuruRendererControls | null>(null);
  const voiceLevelRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const idleMotionEnabledRef = useRef(true);
  const avatarViewTransformRef = useRef<AvatarViewTransform>(
    sanitizeAvatarViewTransform(avatarViewTransform),
  );
  const onAvatarViewTransformChangeRef = useRef(onAvatarViewTransformChange);
  const effectAnchorRef = useRef(effectAnchor);
  const onEffectAnchorChangeRef = useRef(onEffectAnchorChange);
  const effectAnchorEditorEnabledRef = useRef(false);
  const effectAnchorTargetRef = useRef<EffectAnchorTarget>('face');
  const dragStateRef = useRef<DragState | null>(null);
  const wheelCommitTimerRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEffectAnchorEditorOpen, setIsEffectAnchorEditorOpen] =
    useState(false);
  const [effectAnchorTarget, setEffectAnchorTarget] =
    useState<EffectAnchorTarget>('face');
  const showManualControls = reactionControlMode === 'manual';

  useEffect(() => {
    avatarPackageRef.current = avatarPackage || null;
  }, [avatarPackage]);

  useEffect(() => {
    const normalizedMouthLevel = Math.min(Math.max(mouthLevel / 4, 0), 1);
    voiceLevelRef.current = Math.max(voiceLevel, normalizedMouthLevel * 0.12);
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking, mouthLevel, voiceLevel]);

  useEffect(() => {
    idleMotionEnabledRef.current = idleMotionEnabled;
  }, [idleMotionEnabled]);

  useEffect(() => {
    avatarViewTransformRef.current =
      sanitizeAvatarViewTransform(avatarViewTransform);
  }, [avatarViewTransform]);

  useEffect(() => {
    onAvatarViewTransformChangeRef.current = onAvatarViewTransformChange;
  }, [onAvatarViewTransformChange]);

  useEffect(() => {
    effectAnchorRef.current = effectAnchor;
  }, [effectAnchor]);

  useEffect(() => {
    onEffectAnchorChangeRef.current = onEffectAnchorChange;
  }, [onEffectAnchorChange]);

  useEffect(() => {
    if (reactionControlMode === 'linked' && avatarReaction) {
      controlsRef.current?.applyReaction(avatarReaction);
      return;
    }

    controlsRef.current?.resetReaction();
  }, [avatarReaction, reactionControlMode]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let controls: PuruPuruRendererControls | null = null;
    try {
      controls = createPuruPuruRenderer({
        canvas,
        container,
        getAvatarPackage: () => avatarPackageRef.current,
        getVoiceLevel: () => voiceLevelRef.current,
        getIsSpeaking: () => isSpeakingRef.current,
        getIdleMotionEnabled: () => idleMotionEnabledRef.current,
        getViewTransform: () => avatarViewTransformRef.current,
        getEffectAnchor: () => effectAnchorRef.current,
        getEffectAnchorEditorEnabled: () =>
          effectAnchorEditorEnabledRef.current,
      });
      controlsRef.current = controls;
    } catch (error) {
      console.error('Failed to initialize the PuruPuru renderer:', error);
    }

    return () => {
      controlsRef.current = null;
      controls?.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const commitAvatarViewTransform = () => {
      onAvatarViewTransformChangeRef.current(
        sanitizeAvatarViewTransform(avatarViewTransformRef.current),
      );
    };

    const clearWheelCommitTimer = () => {
      if (wheelCommitTimerRef.current !== null) {
        window.clearTimeout(wheelCommitTimerRef.current);
        wheelCommitTimerRef.current = null;
      }
    };

    const scheduleWheelCommit = () => {
      clearWheelCommitTimer();
      wheelCommitTimerRef.current = window.setTimeout(() => {
        wheelCommitTimerRef.current = null;
        commitAvatarViewTransform();
      }, WHEEL_COMMIT_DELAY_MS);
    };

    const endDrag = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragStateRef.current = null;
      setIsDragging(false);
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      commitAvatarViewTransform();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!avatarPackageRef.current || event.button !== 0) return;
      event.preventDefault();
      clearWheelCommitTimer();
      if (effectAnchorEditorEnabledRef.current) {
        const point = controlsRef.current?.clientPointToAvatar(
          event.clientX,
          event.clientY,
        );
        if (!point) return;
        const current = effectAnchorRef.current;
        const target = effectAnchorTargetRef.current;
        const next = normalizePuruPuruEffectAnchor({
          ...current,
          ...(target === 'face'
            ? { faceX: point.xRatio, faceY: point.yRatio }
            : target === 'leftEye'
              ? { leftEyeX: point.xRatio, leftEyeY: point.yRatio }
              : { rightEyeX: point.xRatio, rightEyeY: point.yRatio }),
        });
        effectAnchorRef.current = next;
        onEffectAnchorChangeRef.current(next);
        return;
      }
      dragStateRef.current = {
        pointerId: event.pointerId,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      };
      canvas.setPointerCapture(event.pointerId);
      setIsDragging(true);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      event.preventDefault();
      const deltaX = event.clientX - dragState.lastClientX;
      const deltaY = event.clientY - dragState.lastClientY;
      dragState.lastClientX = event.clientX;
      dragState.lastClientY = event.clientY;
      avatarViewTransformRef.current = sanitizeAvatarViewTransform({
        ...avatarViewTransformRef.current,
        x: avatarViewTransformRef.current.x + deltaX,
        y: avatarViewTransformRef.current.y + deltaY,
      });
    };

    const handleWheel = (event: WheelEvent) => {
      const avatarPackage = avatarPackageRef.current;
      if (!avatarPackage) return;
      event.preventDefault();
      if (effectAnchorEditorEnabledRef.current) return;
      const current = sanitizeAvatarViewTransform(
        avatarViewTransformRef.current,
      );
      const nextScale = clamp(
        current.scale - Math.sign(event.deltaY) * WHEEL_ZOOM_STEP,
        AVATAR_VIEW_MIN_SCALE,
        AVATAR_VIEW_MAX_SCALE,
      );
      if (nextScale === current.scale) return;

      avatarViewTransformRef.current = calculateCursorZoomTransform(
        canvas,
        avatarPackage,
        current,
        nextScale,
        event.clientX,
        event.clientY,
      );
      scheduleWheelCommit();
    };

    const handleDoubleClick = (event: MouseEvent) => {
      if (!avatarPackageRef.current) return;
      event.preventDefault();
      if (effectAnchorEditorEnabledRef.current) return;
      clearWheelCommitTimer();
      avatarViewTransformRef.current = DEFAULT_AVATAR_VIEW_TRANSFORM;
      commitAvatarViewTransform();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);

    return () => {
      clearWheelCommitTimer();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, []);

  return (
    <div className="avatar-background" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className={`avatar-canvas${avatarPackage ? ' is-interactive' : ''}${
          isDragging ? ' is-dragging' : ''
        }${
          isEffectAnchorEditorOpen && showManualControls
            ? ' is-anchor-editing'
            : ''
        }`}
        aria-label={
          avatarPackage
            ? `${avatarPackage.name} PuruPuru avatar`
            : 'No avatar loaded'
        }
      />
      {showManualControls && (
        <div
          className="avatar-expression-controls"
          role="group"
          aria-label="アバター感情表現エフェクトとアンカー設定"
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
                disabled={!avatarPackage || !effect}
                onClick={() => {
                  if (effect) controlsRef.current?.previewEmotion(effect);
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
            disabled={!avatarPackage}
            onClick={() => controlsRef.current?.resetReaction()}
            aria-label="感情表現エフェクトを解除"
          >
            解除
          </button>
          <button
            type="button"
            className={`avatar-expression-button is-anchor${
              isEffectAnchorEditorOpen ? ' is-active' : ''
            }`}
            disabled={!avatarPackage}
            aria-pressed={isEffectAnchorEditorOpen}
            onClick={() => {
              const next = !isEffectAnchorEditorOpen;
              effectAnchorEditorEnabledRef.current = next;
              setIsEffectAnchorEditorOpen(next);
            }}
          >
            アンカー調整
          </button>
        </div>
      )}
      {showManualControls && isEffectAnchorEditorOpen && avatarPackage && (
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
                  effectAnchorTarget === option.target ? ' is-active' : ''
                }`}
                aria-pressed={effectAnchorTarget === option.target}
                onClick={() => {
                  effectAnchorTargetRef.current = option.target;
                  setEffectAnchorTarget(option.target);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="avatar-anchor-scale">
            <span>エフェクトサイズ</span>
            <input
              type="range"
              min={MIN_EFFECT_SCALE * 100}
              max={MAX_EFFECT_SCALE * 100}
              step="5"
              value={Math.round(effectAnchor.effectScale * 100)}
              onChange={(event) => {
                const next = normalizePuruPuruEffectAnchor({
                  ...effectAnchorRef.current,
                  effectScale: Number(event.target.value) / 100,
                });
                effectAnchorRef.current = next;
                onEffectAnchorChangeRef.current(next);
              }}
            />
            <output>{Math.round(effectAnchor.effectScale * 100)}%</output>
          </label>
          <div className="avatar-anchor-actions">
            <button
              type="button"
              className="avatar-expression-button is-reset"
              onClick={() => {
                effectAnchorRef.current = DEFAULT_PURUPURU_EFFECT_ANCHOR;
                onEffectAnchorReset();
              }}
            >
              初期値に戻す
            </button>
            <button
              type="button"
              className="avatar-expression-button"
              onClick={() => {
                effectAnchorEditorEnabledRef.current = false;
                setIsEffectAnchorEditorOpen(false);
              }}
            >
              完了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateCursorZoomTransform(
  canvas: HTMLCanvasElement,
  avatarPackage: PuruPuruAvatarPackage,
  current: AvatarViewTransform,
  nextScale: number,
  clientX: number,
  clientY: number,
): AvatarViewTransform {
  const rect = canvas.getBoundingClientRect();
  const ratioX = canvas.width / Math.max(1, rect.width);
  const ratioY = canvas.height / Math.max(1, rect.height);
  const baseX = rect.width / 2 + avatarPackage.settings.avatarX / ratioX;
  const baseY = rect.height / 2 + avatarPackage.settings.avatarY / ratioY;
  const cursorX = clientX - rect.left;
  const cursorY = clientY - rect.top;
  const anchorX = baseX + current.x;
  const anchorY = baseY + current.y;
  const scaleRatio = nextScale / current.scale;
  const nextAnchorX = cursorX - (cursorX - anchorX) * scaleRatio;
  const nextAnchorY = cursorY - (cursorY - anchorY) * scaleRatio;

  return sanitizeAvatarViewTransform({
    x: nextAnchorX - baseX,
    y: nextAnchorY - baseY,
    scale: nextScale,
  });
}

function sanitizeAvatarViewTransform(
  transform: AvatarViewTransform,
): AvatarViewTransform {
  return {
    x: clampFinite(
      transform.x,
      -AVATAR_VIEW_MAX_OFFSET,
      AVATAR_VIEW_MAX_OFFSET,
    ),
    y: clampFinite(
      transform.y,
      -AVATAR_VIEW_MAX_OFFSET,
      AVATAR_VIEW_MAX_OFFSET,
    ),
    scale: clampFinite(
      transform.scale,
      AVATAR_VIEW_MIN_SCALE,
      AVATAR_VIEW_MAX_SCALE,
      1,
    ),
  };
}

function clampFinite(
  value: number,
  min: number,
  max: number,
  fallback = 0,
): number {
  return clamp(Number.isFinite(value) ? value : fallback, min, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
