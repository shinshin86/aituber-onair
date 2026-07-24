import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PURUPURU_EFFECT_ANCHOR } from '../lib/purupuruEffectAnchor';
import {
  loadPuruPuruPackage,
  type PuruPuruAvatarPackage,
} from '../lib/purupuruPackage';
import type { PuruPuruReaction } from '../lib/purupuruReactions';
import {
  createPuruPuruRenderer,
  type PuruPuruRendererControls,
} from '../lib/purupuruRenderer';
import type { AvatarViewTransform } from '../types/settings';

const DEFAULT_VIEW_TRANSFORM: AvatarViewTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

interface AvatarCanvasProps {
  voiceLevel: number;
  isSpeaking: boolean;
  reaction: PuruPuruReaction | null;
}

export default function AvatarCanvas({
  voiceLevel,
  isSpeaking,
  reaction,
}: AvatarCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const packageRef = useRef<PuruPuruAvatarPackage | null>(null);
  const controlsRef = useRef<PuruPuruRendererControls | null>(null);
  const voiceLevelRef = useRef(voiceLevel);
  const isSpeakingRef = useRef(isSpeaking);
  const [avatarPackage, setAvatarPackage] =
    useState<PuruPuruAvatarPackage | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    voiceLevelRef.current = voiceLevel;
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking, voiceLevel]);

  useEffect(() => {
    let cancelled = false;
    let loadedPackage: PuruPuruAvatarPackage | null = null;

    void fetch('/avatar/miko.purupuru')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Avatar request failed: ${response.status}`);
        }
        const blob = await response.blob();
        const file = new File([blob], 'miko.purupuru', {
          type: 'application/zip',
        });
        return loadPuruPuruPackage(file);
      })
      .then((nextPackage) => {
        loadedPackage = nextPackage;
        if (cancelled) {
          nextPackage.dispose();
          return;
        }
        packageRef.current = nextPackage;
        setAvatarPackage(nextPackage);
      })
      .catch((error) => {
        console.error('Failed to load the bundled Miko avatar:', error);
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      packageRef.current = null;
      loadedPackage?.dispose();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const controls = createPuruPuruRenderer({
      canvas,
      container,
      getAvatarPackage: () => packageRef.current,
      getVoiceLevel: () => voiceLevelRef.current,
      getIsSpeaking: () => isSpeakingRef.current,
      getIdleMotionEnabled: () => true,
      getViewTransform: () => DEFAULT_VIEW_TRANSFORM,
      getEffectAnchor: () => DEFAULT_PURUPURU_EFFECT_ANCHOR,
      getEffectAnchorEditorEnabled: () => false,
    });
    controlsRef.current = controls;

    return () => {
      controlsRef.current = null;
      controls.dispose();
    };
  }, []);

  useEffect(() => {
    if (reaction) {
      controlsRef.current?.applyReaction(reaction);
    } else {
      controlsRef.current?.resetReaction();
    }
  }, [reaction]);

  return (
    <div className="avatar-stage" ref={containerRef}>
      <div className="avatar-glow" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="avatar-canvas"
        aria-label="Miko animated PuruPuru avatar"
      />
      {!avatarPackage && !loadError && (
        <span className="avatar-status">Loading Miko…</span>
      )}
      {loadError && (
        <span className="avatar-status avatar-status--error">
          Avatar unavailable
        </span>
      )}
      <span
        className={`speaking-indicator${isSpeaking ? ' is-active' : ''}`}
        aria-label={isSpeaking ? 'Miko is speaking' : 'Miko is ready'}
      >
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
