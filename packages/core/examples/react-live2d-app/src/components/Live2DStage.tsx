import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { Live2DModelSource } from '../lib/live2dModel';
import {
  resolveLive2DExpressionName,
  withLive2DReactionId,
  type Live2DEmotionEffectMap,
  type Live2DReaction,
  type Live2DReactionControlMode,
  type Live2DReactionEmotion,
} from '../lib/live2dReactions';
import type { Live2DModelCtor, Live2DModelInstance } from '../types/live2d';
import type { Live2DAudioBinding } from '../hooks/useAudioLipsync';
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
}

const AVATAR_EXPRESSION_OPTIONS = [
  { emotion: 'happy', label: '喜び' },
  { emotion: 'surprised', label: '驚き' },
  { emotion: 'sad', label: '悲しみ' },
  { emotion: 'angry', label: '怒り' },
  { emotion: 'relaxed', label: '安らぎ' },
  { emotion: 'thinking', label: '考え中' },
] as const satisfies ReadonlyArray<{
  emotion: Live2DReactionEmotion;
  label: string;
}>;

function applyLive2DReaction(
  model: Live2DModelInstance,
  reaction: Live2DReaction | null,
) {
  if (reaction) {
    void model.expression(reaction.expression);
    return;
  }
  model.internalModel?.motionManager?.expressionManager?.resetExpression();
}

export function Live2DStage({
  modelSource,
  modelPickerError,
  audioBinding,
  reaction,
  reactionControlMode,
  emotionEffectMap,
}: Live2DStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<Live2DModelInstance | null>(null);
  const zoomCleanupRef = useRef<(() => void) | null>(null);
  const audioBindingRef = useRef(audioBinding);
  const effectiveReactionRef = useRef<Live2DReaction | null>(null);
  const [stageError, setStageError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [manualReaction, setManualReaction] = useState<Live2DReaction | null>(
    null,
  );
  const manualReactionIdRef = useRef(0);
  const showManualControls = reactionControlMode === 'manual';
  const effectiveReaction =
    reactionControlMode === 'linked'
      ? reaction || null
      : showManualControls
        ? manualReaction
        : null;

  useEffect(() => {
    audioBindingRef.current = audioBinding;
  }, [audioBinding]);

  useEffect(() => {
    effectiveReactionRef.current = effectiveReaction;
    if (modelRef.current) {
      applyLive2DReaction(modelRef.current, effectiveReaction);
    }
  }, [effectiveReaction]);

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
        applyLive2DReaction(model, effectiveReactionRef.current);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '選択した Live2D モデルを表示できませんでした。';
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
    (modelSource ? '' : '設定を開いて Live2D モデルを選択してください。');
  const showLoading = modelSource ? isLoading : false;

  return (
    <div className="avatar-background">
      <div ref={containerRef} className="live2d-stage">
        <canvas ref={canvasRef} className="live2d-canvas" />
        {(showLoading || overlayMessage) && (
          <div className="live2d-status">
            <strong>
              {showLoading ? 'Live2D モデルを読み込み中...' : 'Live2D サンプル'}
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
          aria-label="Live2Dアバター感情表現エフェクト"
        >
          <span className="avatar-expression-controls-label">
            感情表現エフェクト
          </span>
          {AVATAR_EXPRESSION_OPTIONS.map((option) => {
            const configuredExpression = emotionEffectMap[option.emotion];
            const expression = configuredExpression
              ? resolveLive2DExpressionName(
                  configuredExpression,
                  option.emotion,
                  modelSource?.expressionNames || [],
                )
              : null;
            return (
              <button
                key={option.emotion}
                type="button"
                className="avatar-expression-button"
                disabled={!modelSource || isLoading || !expression}
                onClick={() => {
                  if (!expression) return;
                  manualReactionIdRef.current += 1;
                  setManualReaction(
                    withLive2DReactionId(
                      { expression },
                      manualReactionIdRef.current,
                    ),
                  );
                }}
                title={expression ? undefined : '利用可能な表情がありません'}
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
            解除
          </button>
        </div>
      )}
    </div>
  );
}
