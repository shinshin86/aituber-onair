import { useEffect, useRef, useState } from 'react';
import type { PuruPuruAvatarPackage } from '../lib/purupuruPackage';
import type { PuruPuruReaction } from '../lib/purupuruReactions';
import type { PuruPuruRendererControls } from '../lib/purupuruRenderer';
import { createPuruPuruRenderer } from '../lib/purupuruRenderer';
import type { AvatarViewTransform } from '../types/settings';

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

interface DragState {
  pointerId: number;
  lastClientX: number;
  lastClientY: number;
}

interface AvatarBackgroundProps {
  mouthLevel: number;
  voiceLevel: number;
  isSpeaking: boolean;
  avatarPackage?: PuruPuruAvatarPackage | null;
  avatarReaction?: PuruPuruReaction | null;
  idleMotionEnabled: boolean;
  avatarViewTransform: AvatarViewTransform;
  onAvatarViewTransformChange: (transform: AvatarViewTransform) => void;
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
  const dragStateRef = useRef<DragState | null>(null);
  const wheelCommitTimerRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    if (avatarReaction) {
      controlsRef.current?.applyReaction(avatarReaction);
      return;
    }

    controlsRef.current?.resetReaction();
  }, [avatarReaction]);

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
        }`}
        aria-label={
          avatarPackage
            ? `${avatarPackage.name} PuruPuru avatar`
            : 'No avatar loaded'
        }
      />
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
    x: clampFinite(transform.x, -AVATAR_VIEW_MAX_OFFSET, AVATAR_VIEW_MAX_OFFSET),
    y: clampFinite(transform.y, -AVATAR_VIEW_MAX_OFFSET, AVATAR_VIEW_MAX_OFFSET),
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
