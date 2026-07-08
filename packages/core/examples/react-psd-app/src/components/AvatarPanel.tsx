import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useBlink } from '../hooks/useBlink';
import type { PsdAvatarController } from '../hooks/usePsdAvatar';
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
  avatarViewTransform: AvatarViewTransform;
  motionEnabled: boolean;
  motionIntensity: number;
  onAvatarViewTransformChange: (transform: AvatarViewTransform) => void;
}

const AVATAR_VIEW_COMMIT_DELAY_MS = 180;
const RMS_CEILING = 0.12;

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
  onTransformChange,
  children,
}: {
  transform: AvatarViewTransform;
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
      if (commit) {
        commitTransform(sanitized);
      }
    },
    [commitTransform],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
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
    [applyTransform],
  );

  useEffect(() => {
    const element = layerRef.current;
    if (!element) return;
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        window.clearTimeout(commitTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={layerRef}
      className="avatar-view-layer"
      style={{
        transform: `translate(${localTransform.x}px, ${localTransform.y}px) scale(${localTransform.scale})`,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
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
        if (!drag || drag.pointerId !== event.pointerId) return;
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
        applyTransform({ x: 0, y: 0, scale: 1 });
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
      className="avatar-image avatar-canvas"
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

  if (!rig) return null;

  return (
    <canvas
      ref={canvasRef}
      className="avatar-image avatar-canvas"
      aria-label="Motion PSD avatar"
    />
  );
}

export function AvatarPanel({
  mouthLevel,
  isSpeaking,
  smoothedValue,
  psdAvatar,
  avatarViewTransform,
  motionEnabled,
  motionIntensity,
  onAvatarViewTransformChange,
}: AvatarPanelProps) {
  const eyesClosed = useBlink();
  const mouthOpen = isSpeaking && mouthLevel >= 1;
  const mouthOpenValue = isSpeaking
    ? clamp(Math.max(smoothedValue / RMS_CEILING, mouthLevel / 4), 0, 1)
    : 0;

  // Debug bar width (0-100%)
  const barWidth = Math.min((smoothedValue / 0.12) * 100, 100);

  return (
    <div className="avatar-panel">
      <div className="avatar-container">
        <AvatarViewLayer
          key={avatarViewTransformKey(avatarViewTransform)}
          transform={avatarViewTransform}
          onTransformChange={onAvatarViewTransformChange}
        >
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
        </AvatarViewLayer>
        {psdAvatar.loading && (
          <div className="avatar-loading" role="status">
            Loading PSD...
          </div>
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
  smoothedValue,
  psdAvatar,
  avatarViewTransform,
  motionEnabled,
  motionIntensity,
  onAvatarViewTransformChange,
}: AvatarPanelProps) {
  const eyesClosed = useBlink();
  const mouthOpen = isSpeaking && mouthLevel >= 1;
  const mouthOpenValue = isSpeaking
    ? clamp(Math.max(smoothedValue / RMS_CEILING, mouthLevel / 4), 0, 1)
    : 0;

  return (
    <div className="avatar-background">
      <div className="avatar-container">
        <AvatarViewLayer
          key={avatarViewTransformKey(avatarViewTransform)}
          transform={avatarViewTransform}
          onTransformChange={onAvatarViewTransformChange}
        >
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
        </AvatarViewLayer>
      </div>
    </div>
  );
}
