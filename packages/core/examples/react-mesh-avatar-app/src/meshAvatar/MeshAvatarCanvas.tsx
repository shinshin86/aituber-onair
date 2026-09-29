import { useEffect, useRef, useState } from 'react';
import {
  type MeshAvatar,
  type MeshAvatarOptions,
  createMeshAvatar,
} from './createMeshAvatar.js';

export interface MeshAvatarCanvasProps {
  voiceLevel: number;
  isSpeaking: boolean;
  /** Latest emotion tag and a counter so the same emotion twice still re-triggers */
  emotion?: { tag: string; seq: number } | null;
  autoIdle?: boolean;
  autoMotion?: boolean;
  swayGain?: number;
  /** Bump `seq` to play `id` */
  motionRequest?: { id: string; seq: number } | null;
  /** Bump `seq` to move the mouth through the vowels of `text` */
  kanaRequest?: { text: string; seq: number } | null;
  assetsBase?: MeshAvatarOptions['assetsBase'];
  className?: string;
  onReady?: (avatar: MeshAvatar) => void;
}

/** WebGL canvas that runs the mesh avatar and forwards voice / emotion to it. */
export function MeshAvatarCanvas({
  voiceLevel,
  isSpeaking,
  emotion,
  autoIdle = true,
  autoMotion = true,
  swayGain = 1,
  motionRequest,
  kanaRequest,
  assetsBase,
  className,
  onReady,
}: MeshAvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [avatar, setAvatar] = useState<MeshAvatar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let instance: MeshAvatar | null = null;
    createMeshAvatar(canvas, { assetsBase })
      .then((created) => {
        if (disposed) {
          created.destroy();
          return;
        }
        instance = created;
        setAvatar(created);
        // dev only: poke the avatar from devtools, e.g. __meshAvatar.advance(0.5)
        if (import.meta.env.DEV) {
          (window as unknown as { __meshAvatar?: MeshAvatar }).__meshAvatar =
            created;
        }
        onReadyRef.current?.(created);
      })
      .catch((err: unknown) => {
        console.error('Failed to start the mesh avatar:', err);
        if (!disposed)
          setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      disposed = true;
      instance?.destroy();
      setAvatar(null);
    };
  }, [assetsBase]);

  useEffect(() => {
    avatar?.setVoiceLevel(voiceLevel);
  }, [avatar, voiceLevel]);

  useEffect(() => {
    avatar?.setSpeaking(isSpeaking);
  }, [avatar, isSpeaking]);

  useEffect(() => {
    if (emotion) avatar?.setEmotion(emotion.tag);
  }, [avatar, emotion]);

  useEffect(() => {
    avatar?.setAutoIdle(autoIdle);
    avatar?.setAutoMotion(autoMotion);
  }, [avatar, autoIdle, autoMotion]);

  useEffect(() => {
    avatar?.setSwayGain(swayGain);
  }, [avatar, swayGain]);

  useEffect(() => {
    if (motionRequest) avatar?.play(motionRequest.id);
  }, [avatar, motionRequest]);

  useEffect(() => {
    if (kanaRequest) avatar?.speakKana(kanaRequest.text);
  }, [avatar, kanaRequest]);

  return (
    <>
      <canvas ref={canvasRef} className={className ?? 'mesh-avatar-canvas'} />
      {error && <div className="mesh-avatar-error">{error}</div>}
    </>
  );
}
