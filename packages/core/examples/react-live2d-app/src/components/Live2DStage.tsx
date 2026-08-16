import { useCallback, useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { Live2DModelSource } from '../lib/live2dModel';
import {
  withLive2DReactionId,
  type Live2DEmotionEffectMap,
  type Live2DReaction,
  type Live2DReactionControlMode,
  type Live2DReactionEmotion,
} from '../lib/live2dReactions';
import type { Live2DModelCtor, Live2DModelInstance } from '../types/live2d';
import type { Live2DAudioBinding } from '../hooks/useAudioLipsync';
import {
  DEFAULT_EMOTION_EFFECT_ANCHOR,
  MAX_EMOTION_EFFECT_SCALE,
  MIN_EMOTION_EFFECT_SCALE,
  normalizeEmotionEffectAnchor,
  type EmotionEffectAnchor,
} from '../lib/emotionEffectAnchor';
import {
  EmotionEffectOverlay,
  type EmotionEffectGeometry,
} from './EmotionEffectOverlay';
import {
  ensureCubismCoreLoaded,
  destroyLive2DModel,
  disableAutoFocus,
  importCubism4Module,
  installLive2DBlobUrlFix,
  makeDraggable,
  makeZoomable,
  setLive2DAudioForLipSync,
  setLive2DModelPosition,
} from '../lib/live2dModel';

interface Live2DStageProps {
  modelSource: Live2DModelSource | null;
  modelPickerError: string;
  audioBinding: Live2DAudioBinding;
  reaction?: Live2DReaction | null;
  reactionControlMode: Live2DReactionControlMode;
  emotionEffectMap: Live2DEmotionEffectMap;
  effectAnchor: EmotionEffectAnchor;
  onEffectAnchorChange: (anchor: EmotionEffectAnchor) => void;
  onEffectAnchorReset: () => void;
}

const AVATAR_EXPRESSION_OPTIONS = [
  { emotion: 'happy', label: 'Alegría' },
  { emotion: 'surprised', label: 'Sorpresa' },
  { emotion: 'sad', label: 'Tristeza' },
  { emotion: 'angry', label: 'Enojo' },
  { emotion: 'relaxed', label: 'Relajación' },
  { emotion: 'thinking', label: 'Pensando' },
] as const satisfies ReadonlyArray<{
  emotion: Live2DReactionEmotion;
  label: string;
}>;

const MANUAL_EFFECT_DURATION_MS = 2600;
type EffectAnchorTarget = 'face' | 'leftEye' | 'rightEye';
const EFFECT_ANCHOR_TARGETS = [
  { target: 'face', label: 'Cara' },
  { target: 'leftEye', label: 'Ojo izq.' },
  { target: 'rightEye', label: 'Ojo der.' },
] as const satisfies ReadonlyArray<{
  target: EffectAnchorTarget;
  label: string;
}>;

export function Live2DStage({
  modelSource,
  modelPickerError,
  audioBinding,
  reaction,
  reactionControlMode,
  emotionEffectMap,
  effectAnchor,
  onEffectAnchorChange,
  onEffectAnchorReset,
}: Live2DStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<Live2DModelInstance | null>(null);
  const zoomCleanupRef = useRef<(() => void) | null>(null);
  const audioBindingRef = useRef(audioBinding);
  const effectAnchorRef = useRef(effectAnchor);
  const effectGeometryRef = useRef<EmotionEffectGeometry | null>(null);
  const [stageError, setStageError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [manualReaction, setManualReaction] = useState<Live2DReaction | null>(
    null,
  );
  const manualReactionIdRef = useRef(0);
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);
  const [anchorTarget, setAnchorTarget] = useState<EffectAnchorTarget>('face');
  const showManualControls = reactionControlMode === 'manual';
  const effectiveReaction =
    reactionControlMode === 'linked'
      ? reaction || null
      : showManualControls
        ? manualReaction
        : null;

  useEffect(() => {
    effectAnchorRef.current = effectAnchor;
  }, [effectAnchor]);

  const updateEffectGeometry = useCallback(() => {
    const app = appRef.current;
    const model = modelRef.current;
    if (!app || !model) {
      effectGeometryRef.current = null;
      return;
    }
    const sourceWidth = Math.max(
      model.internalModel?.width || model.width || 1,
      1,
    );
    const sourceHeight = Math.max(
      model.internalModel?.height || model.height || 1,
      1,
    );
    const current = effectAnchorRef.current;
    const toGlobal = (xRatio: number, yRatio: number) =>
      model.toGlobal(
        new PIXI.Point(sourceWidth * xRatio, sourceHeight * yRatio),
      );
    const face = toGlobal(current.faceX, current.faceY);
    const leftEye = toGlobal(current.leftEyeX, current.leftEyeY);
    const rightEye = toGlobal(current.rightEyeX, current.rightEyeY);
    const top = toGlobal(0.5, 0);
    const bottom = toGlobal(0.5, 1);
    effectGeometryRef.current = {
      faceX: face.x,
      faceY: face.y,
      leftEyeX: leftEye.x,
      leftEyeY: leftEye.y,
      rightEyeX: rightEye.x,
      rightEyeY: rightEye.y,
      unit:
        Math.min(
          Math.min(app.screen.width, app.screen.height),
          Math.max(Math.hypot(bottom.x - top.x, bottom.y - top.y), 80),
        ) * current.effectScale,
    };
  }, []);

  const handleAnchorPoint = useCallback(
    (x: number, y: number) => {
      const model = modelRef.current;
      if (!model) return;
      const sourceWidth = Math.max(
        model.internalModel?.width || model.width || 1,
        1,
      );
      const sourceHeight = Math.max(
        model.internalModel?.height || model.height || 1,
        1,
      );
      const local = model.toLocal(new PIXI.Point(x, y));
      const current = effectAnchorRef.current;
      const next = normalizeEmotionEffectAnchor({
        ...current,
        ...(anchorTarget === 'face'
          ? { faceX: local.x / sourceWidth, faceY: local.y / sourceHeight }
          : anchorTarget === 'leftEye'
            ? {
                leftEyeX: local.x / sourceWidth,
                leftEyeY: local.y / sourceHeight,
              }
            : {
                rightEyeX: local.x / sourceWidth,
                rightEyeY: local.y / sourceHeight,
              }),
      });
      effectAnchorRef.current = next;
      onEffectAnchorChange(next);
      updateEffectGeometry();
    },
    [anchorTarget, onEffectAnchorChange, updateEffectGeometry],
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

  useEffect(() => {
    audioBindingRef.current = audioBinding;
  }, [audioBinding]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const resizeStage = (app: PIXI.Application) => {
      const nextWidth = Math.max(container.clientWidth, 1);
      const nextHeight = Math.max(container.clientHeight, 1);
      app.renderer.resize(nextWidth, nextHeight);

      if (modelRef.current) {
        setLive2DModelPosition(app, modelRef.current);
      }
    };

    const app = new PIXI.Application({
      view: canvas,
      width: Math.max(container.clientWidth, 1),
      height: Math.max(container.clientHeight, 1),
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    appRef.current = app;
    canvas.style.touchAction = 'none';
    resizeStage(app);

    const observer = new ResizeObserver(() => {
      if (appRef.current) {
        resizeStage(appRef.current);
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      zoomCleanupRef.current?.();
      zoomCleanupRef.current = null;
      if (modelRef.current && appRef.current) {
        appRef.current.stage.removeChild(modelRef.current);
        destroyLive2DModel(modelRef.current);
        modelRef.current = null;
      }
      app.destroy(false, {
        children: true,
        texture: true,
        baseTexture: true,
      });
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const canvas = canvasRef.current;
    if (!app || !canvas) {
      return;
    }

    let cancelled = false;

    const clearCurrentModel = () => {
      zoomCleanupRef.current?.();
      zoomCleanupRef.current = null;
      if (modelRef.current) {
        app.stage.removeChild(modelRef.current);
        destroyLive2DModel(modelRef.current);
        modelRef.current = null;
      }
    };

    if (!modelSource) {
      clearCurrentModel();
      return;
    }

    const loadModel = async () => {
      setStageError('');
      setIsLoading(true);
      try {
        installLive2DBlobUrlFix();
        await ensureCubismCoreLoaded();
        const { Live2DModel } = (await importCubism4Module()) as {
          Live2DModel: Live2DModelCtor;
        };
        const model = await Live2DModel.from(modelSource.modelJsonUrl, {
          ticker: PIXI.Ticker.shared,
          autoUpdate: true,
          autoFocus: false,
          autoHitTest: true,
        });

        if (cancelled) {
          destroyLive2DModel(model);
          return;
        }

        clearCurrentModel();
        disableAutoFocus(model);
        model.interactive = true;
        setLive2DAudioForLipSync(model, audioBindingRef.current);
        app.stage.addChild(model);
        setLive2DModelPosition(app, model);
        requestAnimationFrame(() => {
          if (!cancelled && modelRef.current === model) {
            setLive2DModelPosition(app, model);
          }
        });
        makeDraggable(model);
        zoomCleanupRef.current = makeZoomable(model, canvas);
        modelRef.current = model;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo mostrar el modelo Live2D seleccionado.';
        setStageError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadModel();

    return () => {
      cancelled = true;
    };
  }, [modelSource]);

  useEffect(() => {
    if (!modelRef.current) {
      return;
    }
    setLive2DAudioForLipSync(modelRef.current, audioBinding);
  }, [audioBinding]);

  const effectiveStageError = modelSource ? stageError : '';
  const overlayMessage =
    modelPickerError ||
    effectiveStageError ||
    (modelSource ? '' : 'Abre Configuración para seleccionar un modelo Live2D.');
  const showLoading = modelSource ? isLoading : false;

  return (
    <div className="avatar-background">
      <div ref={containerRef} className="live2d-stage">
        <canvas ref={canvasRef} className="live2d-canvas" />
        <EmotionEffectOverlay
          reaction={effectiveReaction}
          anchor={effectAnchor}
          geometryRef={effectGeometryRef}
          anchorEditorOpen={showManualControls && anchorEditorOpen}
          onAnchorPoint={handleAnchorPoint}
        />
        {(showLoading || overlayMessage) && (
          <div className="live2d-status">
            <strong>
              {showLoading ? 'Cargando modelo Live2D...' : 'Live2D'}
            </strong>
            {!showLoading && <span>{overlayMessage}</span>}
            {modelSource && !showLoading && !overlayMessage && (
              <span>{modelSource.modelFilePath}</span>
            )}
          </div>
        )}
      </div>
      {showManualControls && (
        <div
          className="avatar-expression-controls"
          role="group"
          aria-label="Efectos emoción avatar Live2D"
        >
          <span className="avatar-expression-controls-label">
            Efectos emoción
          </span>
          {AVATAR_EXPRESSION_OPTIONS.map((option) => {
            const effect = emotionEffectMap[option.emotion];
            return (
              <button
                key={option.emotion}
                type="button"
                className="avatar-expression-button"
                disabled={!modelSource || isLoading || !effect}
                onClick={() => {
                  if (!effect) return;
                  manualReactionIdRef.current += 1;
                  setManualReaction(
                    withLive2DReactionId(
                      { effect, durationMs: MANUAL_EFFECT_DURATION_MS },
                      manualReactionIdRef.current,
                    ),
                  );
                }}
                title={
                  effect ? undefined : 'No se asignó efecto a esta emoción'
                }
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            className="avatar-expression-button is-reset"
            disabled={!modelSource || isLoading}
            onClick={() => setManualReaction(null)}
            >
            Cancelar
          </button>
          <button
            type="button"
            className={`avatar-expression-button is-anchor${
              anchorEditorOpen ? ' is-active' : ''
            }`}
            disabled={!modelSource || isLoading}
            aria-pressed={anchorEditorOpen}
            onClick={() => setAnchorEditorOpen((current) => !current)}
          >
            Ajustar anclaje
          </button>
        </div>
      )}
      {showManualControls && anchorEditorOpen && modelSource && !isLoading && (
        <div
          className="avatar-anchor-editor"
          role="group"
          aria-label="Ajustar anclaje efectos emoción"
        >
          <span className="avatar-anchor-editor-label">
            Selecciona posición y haz clic en el avatar
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
            <span>Tamaño efecto</span>
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
              Restaurar valores iniciales
            </button>
            <button
              type="button"
              className="avatar-expression-button"
              onClick={() => setAnchorEditorOpen(false)}
            >
              Finalizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
