import { useEffect, useRef, useState } from 'react';
import { DEFAULT_PURUPURU_EFFECT_ANCHOR } from '../lib/purupuruEffectAnchor';
import {
  type PuruPuruAvatarPackage,
  loadPuruPuruPackage,
} from '../lib/purupuruPackage';
import type { PuruPuruReaction } from '../lib/purupuruReactions';
import {
  type PuruPuruRendererControls,
  createPuruPuruRenderer,
} from '../lib/purupuruRenderer';
import type { AvatarViewTransform } from '../types/settings';

// Frame the bundled full-height artwork as a face-forward portrait in the
// compact operations card.
const DEFAULT_VIEW_TRANSFORM: AvatarViewTransform = {
  x: 0,
  y: 44,
  scale: 2,
};

interface AvatarCanvasProps {
  reaction: PuruPuruReaction | null;
  stateLabel: string;
  isSpeaking: boolean;
}

export default function AvatarCanvas({
  reaction,
  stateLabel,
  isSpeaking,
}: AvatarCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const packageRef = useRef<PuruPuruAvatarPackage | null>(null);
  const controlsRef = useRef<PuruPuruRendererControls | null>(null);
  const motionEnabledRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const [avatarPackage, setAvatarPackage] =
    useState<PuruPuruAvatarPackage | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      setReducedMotion(mediaQuery.matches);
      motionEnabledRef.current = !mediaQuery.matches;
    };
    syncPreference();
    mediaQuery.addEventListener('change', syncPreference);
    return () => mediaQuery.removeEventListener('change', syncPreference);
  }, []);

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
      getVoiceLevel: () => {
        if (!isSpeakingRef.current) return 0;
        if (!motionEnabledRef.current) return 0.055;
        return 0.07 + Math.sin(performance.now() * 0.018) * 0.035;
      },
      getIsSpeaking: () => isSpeakingRef.current,
      getIdleMotionEnabled: () => motionEnabledRef.current,
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
    if (!avatarPackage) return;
    if (reaction) {
      controlsRef.current?.applyReaction(reaction);
    } else {
      controlsRef.current?.resetReaction();
    }
  }, [avatarPackage, reaction]);

  return (
    <div
      className={`avatar-stage${reducedMotion ? ' is-reduced-motion' : ''}`}
      ref={containerRef}
    >
      <div className="avatar-glow" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="avatar-canvas"
        aria-label={`Miko PuruPuruアバター。表情: ${stateLabel}`}
      />
      {!avatarPackage && !loadError && (
        <span className="avatar-status">Mikoを読み込み中…</span>
      )}
      {loadError && (
        <span className="avatar-status avatar-status--error">
          アバターを表示できません
        </span>
      )}
      <span className="avatar-expression-label" aria-hidden="true">
        表情 · {stateLabel}
      </span>
    </div>
  );
}
