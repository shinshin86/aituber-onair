import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useInochi2D } from '../hooks/useInochi2D';
import type {
  InochiCameraTransform,
  ResolvedInochiModelDefinition,
} from '../types/inochi2d';

interface Inochi2DStageProps {
  selectedModelId?: string;
  customModel?: ResolvedInochiModelDefinition | null;
  modelPickerError: string;
  onModelResolved: (modelId: string) => void;
}

export function Inochi2DStage({
  selectedModelId,
  customModel,
  modelPickerError,
  onModelResolved,
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
    </div>
  );
}
