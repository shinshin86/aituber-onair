import { useEffect, useRef } from 'react';
import { useBlink } from '../hooks/useBlink';
import type { PsdAvatarController } from '../hooks/usePsdAvatar';
import { renderPsdToCanvas } from '../lib/psdRenderer';
import {
  createAnime25RigAvatar,
  type Anime25RigAvatar,
} from '../lib/rig/anime25Renderer';

interface AvatarPanelProps {
  mouthLevel: number;
  isSpeaking: boolean;
  smoothedValue: number;
  psdAvatar: PsdAvatarController;
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
  mouthOpen,
}: {
  psdAvatar: PsdAvatarController;
  mouthOpen: boolean;
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
    avatarRef.current?.setMouthOpen(mouthOpen ? 0.8 : 0);
  }, [mouthOpen]);

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
}: AvatarPanelProps) {
  const eyesClosed = useBlink();
  const mouthOpen = isSpeaking && mouthLevel >= 1;

  // Debug bar width (0-100%)
  const barWidth = Math.min((smoothedValue / 0.12) * 100, 100);

  return (
    <div className="avatar-panel">
      <div className="avatar-container">
        {psdAvatar.mode === 'motion' && psdAvatar.rig?.rig ? (
          <MotionRigCanvasAvatar psdAvatar={psdAvatar} mouthOpen={mouthOpen} />
        ) : psdAvatar.model ? (
          <PsdCanvasAvatar
            psdAvatar={psdAvatar}
            mouthOpen={mouthOpen}
            eyesClosed={eyesClosed}
          />
        ) : (
          <FallbackAvatar mouthOpen={mouthOpen} eyesClosed={eyesClosed} />
        )}
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
  psdAvatar,
}: Omit<AvatarPanelProps, 'smoothedValue'>) {
  const eyesClosed = useBlink();
  const mouthOpen = isSpeaking && mouthLevel >= 1;

  return (
    <div className="avatar-background">
      <div className="avatar-container">
        {psdAvatar.mode === 'motion' && psdAvatar.rig?.rig ? (
          <MotionRigCanvasAvatar psdAvatar={psdAvatar} mouthOpen={mouthOpen} />
        ) : psdAvatar.model ? (
          <PsdCanvasAvatar
            psdAvatar={psdAvatar}
            mouthOpen={mouthOpen}
            eyesClosed={eyesClosed}
          />
        ) : (
          <FallbackAvatar mouthOpen={mouthOpen} eyesClosed={eyesClosed} />
        )}
      </div>
    </div>
  );
}
