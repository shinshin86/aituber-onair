import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useInochi2D } from '../hooks/useInochi2D';
import {
  DEFAULT_EMOTION_EFFECT_ANCHOR,
  MAX_EMOTION_EFFECT_SCALE,
  MIN_EMOTION_EFFECT_SCALE,
  normalizeEmotionEffectAnchor,
  type EmotionEffectAnchor,
} from '../lib/emotionEffectAnchor';
import {
  withInochi2DReactionId,
  type Inochi2DEmotionEffectMap,
  type Inochi2DReaction,
  type Inochi2DReactionControlMode,
  type Inochi2DReactionEmotion,
} from '../lib/inochi2dReactions';
import type {
  InochiCameraTransform,
  ResolvedInochiModelDefinition,
} from '../types/inochi2d';
import {
  INOCHI2D_DEFAULT_CAMERA_SCALE,
  INOCHI2D_DEFAULT_CAMERA_X,
  INOCHI2D_DEFAULT_CAMERA_Y,
} from '../lib/inochi2dConstants';
import {
  EmotionEffectOverlay,
  type EmotionEffectGeometry,
} from './EmotionEffectOverlay';

interface Inochi2DStageProps {
  selectedModelId?: string;
  customModel?: ResolvedInochiModelDefinition | null;
  modelPickerError: string;
  onModelResolved: (modelId: string) => void;
  reaction?: Inochi2DReaction | null;
  reactionControlMode: Inochi2DReactionControlMode;
  emotionEffectMap: Inochi2DEmotionEffectMap;
  effectAnchor: EmotionEffectAnchor;
  onEffectAnchorChange: (anchor: EmotionEffectAnchor) => void;
  onEffectAnchorReset: () => void;
}

const AVATAR_EXPRESSION_OPTIONS = [
  { emotion: 'happy', label: '喜び' },
  { emotion: 'surprised', label: '驚き' },
  { emotion: 'sad', label: '悲しみ' },
  { emotion: 'angry', label: '怒り' },
  { emotion: 'relaxed', label: '安らぎ' },
  { emotion: 'thinking', label: '考え中' },
] as const satisfies ReadonlyArray<{
  emotion: Inochi2DReactionEmotion;
  label: string;
}>;

const MANUAL_EFFECT_DURATION_MS = 2600;
type EffectAnchorTarget = 'face' | 'leftEye' | 'rightEye';
const EFFECT_ANCHOR_TARGETS = [
  { target: 'face', label: '顔' },
  { target: 'leftEye', label: '左目' },
  { target: 'rightEye', label: '右目' },
] as const satisfies ReadonlyArray<{
  target: EffectAnchorTarget;
  label: string;
}>;

export function Inochi2DStage({
  selectedModelId,
  customModel,
  modelPickerError,
  onModelResolved,
  reaction,
  reactionControlMode,
  emotionEffectMap,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
}: Inochi2DStageProps) {
  const {
    canvasRef,
    status,
    error,
    activeModel,
    isWebGLSupported,
    cameraTransform,
    setCameraTransform,
    resetCameraTransform,
    applyInteractionImpulse,
    playReactionAnimation,
  } = useInochi2D({
    selectedModelId,
    customModel,
    onModelResolved,
  });
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const [manualReaction, setManualReaction] = useState<Inochi2DReaction | null>(
    null,
  );
  const manualReactionIdRef = useRef(0);
  const effectAnchorRef = useRef(effectAnchor);
  const effectGeometryRef = useRef<EmotionEffectGeometry | null>(null);
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);
  const [anchorTarget, setAnchorTarget] = useState<EffectAnchorTarget>('face');
  const showManualControls = reactionControlMode === 'manual';
  const effectiveReaction =
    reactionControlMode === 'linked'
      ? reaction || null
      : showManualControls
        ? manualReaction
        : null;
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    originClientX: number;
    originClientY: number;
    lastClientX: number;
    lastClientY: number;
    lastStepDeltaX: number;
    lastStepDeltaY: number;
    originTransform: InochiCameraTransform;
  } | null>(null);

  useEffect(() => {
    effectAnchorRef.current = effectAnchor;
  }, [effectAnchor]);

  const getCameraTransforms = useCallback(() => {
    const canvas = canvasElementRef.current;
    const base = {
      x: activeModel?.camera?.x ?? INOCHI2D_DEFAULT_CAMERA_X,
      y: activeModel?.camera?.y ?? INOCHI2D_DEFAULT_CAMERA_Y,
      scale: activeModel?.camera?.scale ?? INOCHI2D_DEFAULT_CAMERA_SCALE,
    };
    const numberFromDataset = (value: string | undefined, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    return {
      base,
      actual: {
        x: numberFromDataset(
          canvas?.dataset.inochi2dCameraX,
          cameraTransform.x,
        ),
        y: numberFromDataset(
          canvas?.dataset.inochi2dCameraY,
          cameraTransform.y,
        ),
        scale: numberFromDataset(
          canvas?.dataset.inochi2dCameraScale,
          cameraTransform.scale,
        ),
      },
    };
  }, [activeModel, cameraTransform]);

  const referenceRatioToScreen = useCallback(
    (xRatio: number, yRatio: number, width: number, height: number) => {
      const { base, actual } = getCameraTransforms();
      const modelX = (width * xRatio - width / 2) / base.scale - base.x;
      const modelY = (height * yRatio - height / 2) / base.scale - base.y;
      return {
        x: width / 2 + (modelX + actual.x) * actual.scale,
        y: height / 2 + (modelY + actual.y) * actual.scale,
      };
    },
    [getCameraTransforms],
  );

  const updateEffectGeometry = useCallback(() => {
    const canvas = canvasElementRef.current;
    if (!canvas || !activeModel) {
      effectGeometryRef.current = null;
      return;
    }
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    const current = effectAnchorRef.current;
    const face = referenceRatioToScreen(
      current.faceX,
      current.faceY,
      width,
      height,
    );
    const leftEye = referenceRatioToScreen(
      current.leftEyeX,
      current.leftEyeY,
      width,
      height,
    );
    const rightEye = referenceRatioToScreen(
      current.rightEyeX,
      current.rightEyeY,
      width,
      height,
    );
    const { base, actual } = getCameraTransforms();
    effectGeometryRef.current = {
      faceX: face.x,
      faceY: face.y,
      leftEyeX: leftEye.x,
      leftEyeY: leftEye.y,
      rightEyeX: rightEye.x,
      rightEyeY: rightEye.y,
      unit:
        Math.min(width, height) *
        (actual.scale / base.scale) *
        current.effectScale,
    };
  }, [activeModel, getCameraTransforms, referenceRatioToScreen]);

  const handleAnchorPoint = useCallback(
    (x: number, y: number) => {
      const canvas = canvasElementRef.current;
      if (!canvas || !activeModel) return;
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      const { base, actual } = getCameraTransforms();
      const modelX = (x - width / 2) / actual.scale - actual.x;
      const modelY = (y - height / 2) / actual.scale - actual.y;
      const xRatio = (width / 2 + (modelX + base.x) * base.scale) / width;
      const yRatio = (height / 2 + (modelY + base.y) * base.scale) / height;
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
      updateEffectGeometry();
    },
    [
      activeModel,
      anchorTarget,
      getCameraTransforms,
      onEffectAnchorChange,
      updateEffectGeometry,
    ],
  );

  useEffect(() => {
    let animationFrame = 0;
    const update = () => {
      updateEffectGeometry();
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [updateEffectGeometry]);

  const setCombinedCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasElementRef.current = node;
      canvasRef(node);
    },
    [canvasRef],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (status !== 'ready' || event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      originClientX: event.clientX,
      originClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      lastStepDeltaX: 0,
      lastStepDeltaY: 0,
      originTransform: cameraTransform,
    };
    setIsDraggingCamera(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.originClientX;
    const deltaY = event.clientY - dragState.originClientY;
    const stepDeltaX = event.clientX - dragState.lastClientX;
    const stepDeltaY = event.clientY - dragState.lastClientY;
    dragState.lastClientX = event.clientX;
    dragState.lastClientY = event.clientY;
    dragState.lastStepDeltaX = stepDeltaX;
    dragState.lastStepDeltaY = stepDeltaY;

    void applyInteractionImpulse(stepDeltaX * 0.45, stepDeltaY * 0.28);

    void setCameraTransform({
      x: dragState.originTransform.x + deltaX / dragState.originTransform.scale,
      y: dragState.originTransform.y + deltaY / dragState.originTransform.scale,
      scale: dragState.originTransform.scale,
    });
  };

  const endDrag = (event?: React.PointerEvent<HTMLCanvasElement>) => {
    const dragState = dragStateRef.current;
    if (dragState) {
      const totalDeltaX = dragState.lastClientX - dragState.originClientX;
      const totalDeltaY = dragState.lastClientY - dragState.originClientY;
      const totalDistance = Math.hypot(totalDeltaX, totalDeltaY);
      void applyInteractionImpulse(
        dragState.lastStepDeltaX * 1.4 + totalDeltaX * 0.16,
        dragState.lastStepDeltaY * 1.1 + totalDeltaY * 0.1,
      );
      if (totalDistance < 8) {
        void playReactionAnimation('tap');
      } else if (Math.abs(totalDeltaY) > Math.abs(totalDeltaX) * 1.15) {
        void playReactionAnimation(totalDeltaY < 0 ? 'flickUp' : 'flickDown');
      } else {
        void playReactionAnimation('flick');
      }
    }
    if (
      event &&
      dragState &&
      event.currentTarget.hasPointerCapture?.(dragState.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(dragState.pointerId);
    }
    dragStateRef.current = null;
    setIsDraggingCamera(false);
  };

  useEffect(() => {
    const canvasElement = canvasElementRef.current;
    if (!canvasElement) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (status !== 'ready') {
        return;
      }

      event.preventDefault();
      const zoomFactor = Math.exp(-event.deltaY * 0.0015);
      void setCameraTransform({
        ...cameraTransform,
        scale: cameraTransform.scale * zoomFactor,
      });
    };

    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [cameraTransform, setCameraTransform, status]);

  const overlayMessage =
    status === 'loading'
      ? 'Inochi2D モデルを読み込み中...'
      : modelPickerError || error
        ? modelPickerError || error
        : !isWebGLSupported
          ? 'Inochi2D には WebGL 対応ブラウザが必要です。'
          : !activeModel
            ? '設定を開いて Inochi2D モデルを選択してください。'
            : '';
  const showOverlay = status === 'loading' || Boolean(overlayMessage);
  const hasError = Boolean(modelPickerError || error || !isWebGLSupported);

  return (
    <div className="avatar-background">
      <div className="inochi2d-stage" data-avatar-renderer="inochi2d">
        <canvas
          ref={setCombinedCanvasRef}
          className={`inochi2d-canvas${isDraggingCamera ? ' is-dragging' : ''}`}
          aria-label="Inochi2D canvas"
          data-inochi2d-camera-scale={cameraTransform.scale.toFixed(4)}
          data-inochi2d-camera-x={cameraTransform.x.toFixed(2)}
          data-inochi2d-camera-y={cameraTransform.y.toFixed(2)}
          onDoubleClick={() => {
            void resetCameraTransform();
          }}
          onPointerCancel={endDrag}
          onPointerDown={handlePointerDown}
          onLostPointerCapture={endDrag}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
        />
        <EmotionEffectOverlay
          reaction={effectiveReaction}
          anchor={effectAnchor}
          geometryRef={effectGeometryRef}
          anchorEditorOpen={showManualControls && anchorEditorOpen}
          onAnchorPoint={handleAnchorPoint}
        />
        {showOverlay && (
          <div className={`inochi2d-status${hasError ? ' is-error' : ''}`}>
            <strong>
              {status === 'loading' ? '読み込み中' : 'Inochi2D サンプル'}
            </strong>
            {overlayMessage && <span>{overlayMessage}</span>}
          </div>
        )}
        {status === 'ready' && activeModel && (
          <>
            <div className="inochi2d-active-model">{activeModel.name}</div>
            <button
              type="button"
              className="inochi2d-reset-view"
              onClick={() => {
                void resetCameraTransform();
              }}
            >
              表示をリセット
            </button>
          </>
        )}
      </div>
      {showManualControls && (
        <div
          className="avatar-expression-controls"
          role="group"
          aria-label="Inochi2Dアバター感情表現エフェクト"
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
                disabled={status !== 'ready' || !activeModel || !effect}
                onClick={() => {
                  if (!effect) return;
                  manualReactionIdRef.current += 1;
                  setManualReaction(
                    withInochi2DReactionId(
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
            disabled={status !== 'ready' || !activeModel}
            onClick={() => setManualReaction(null)}
          >
            解除
          </button>
          <button
            type="button"
            className={`avatar-expression-button is-anchor${
              anchorEditorOpen ? ' is-active' : ''
            }`}
            disabled={status !== 'ready' || !activeModel}
            aria-pressed={anchorEditorOpen}
            onClick={() => setAnchorEditorOpen((current) => !current)}
          >
            アンカー調整
          </button>
        </div>
      )}
      {showManualControls &&
        anchorEditorOpen &&
        status === 'ready' &&
        activeModel && (
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
                  updateEffectGeometry();
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
                  updateEffectGeometry();
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
