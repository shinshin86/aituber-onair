import { useEffect, useRef } from 'react';
import type { PuruPuruAvatarPackage } from '../lib/purupuruPackage';
import { createPuruPuruRenderer } from '../lib/purupuruRenderer';

interface AvatarBackgroundProps {
  mouthLevel: number;
  voiceLevel: number;
  isSpeaking: boolean;
  avatarPackage?: PuruPuruAvatarPackage | null;
}

/** Avatar composited into the chat background. */
export function AvatarBackground({
  mouthLevel,
  voiceLevel,
  isSpeaking,
  avatarPackage,
}: AvatarBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarPackageRef = useRef<PuruPuruAvatarPackage | null>(null);
  const voiceLevelRef = useRef(0);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    avatarPackageRef.current = avatarPackage || null;
  }, [avatarPackage]);

  useEffect(() => {
    const normalizedMouthLevel = Math.min(Math.max(mouthLevel / 4, 0), 1);
    voiceLevelRef.current = Math.max(voiceLevel, normalizedMouthLevel * 0.12);
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking, mouthLevel, voiceLevel]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let dispose: (() => void) | null = null;
    try {
      dispose = createPuruPuruRenderer({
        canvas,
        container,
        getAvatarPackage: () => avatarPackageRef.current,
        getVoiceLevel: () => voiceLevelRef.current,
        getIsSpeaking: () => isSpeakingRef.current,
      });
    } catch (error) {
      console.error('Failed to initialize the PuruPuru renderer:', error);
    }

    return () => {
      dispose?.();
    };
  }, []);

  return (
    <div className="avatar-background" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="avatar-canvas"
        aria-label={
          avatarPackage
            ? `${avatarPackage.name} PuruPuru avatar`
            : 'PuruPuru placeholder avatar'
        }
      />
    </div>
  );
}
