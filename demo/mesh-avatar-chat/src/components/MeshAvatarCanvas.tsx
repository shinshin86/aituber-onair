import { type MeshAvatar, loadMeshAvatar } from 'mesh-avatar';
import { useEffect, useRef, useState } from 'react';

/** Bundled Miko avatar served from the app's own origin */
export const DEFAULT_MESH_AVATAR_SOURCE = `${import.meta.env.BASE_URL}avatar/miko-qipao.mavatar`;

export interface MeshAvatarCanvasProps {
  voiceLevel: number;
  isSpeaking: boolean;
  /** Latest emotion tag and a counter so the same emotion twice still re-triggers */
  emotion?: { tag: string; seq: number } | null;
  className?: string;
  onReady?: () => void;
  onError?: (message: string) => void;
}

/** WebGL canvas that runs the mesh avatar and forwards voice level and emotion to it. */
export function MeshAvatarCanvas({
  voiceLevel,
  isSpeaking,
  emotion,
  className,
  onReady,
  onError,
}: MeshAvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [avatar, setAvatar] = useState<MeshAvatar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let instance: MeshAvatar | null = null;
    // 'contain' keeps the whole illustration visible on wide canvases
    loadMeshAvatar(canvas, DEFAULT_MESH_AVATAR_SOURCE, {
      fit: 'contain',
      padTop: 0.04,
    })
      .then((created) => {
        if (disposed) {
          created.destroy();
          return;
        }
        instance = created;
        setError(null);
        setAvatar(created);
        onReadyRef.current?.();
      })
      .catch((err: unknown) => {
        console.error('Failed to start the mesh avatar:', err);
        if (disposed) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        onErrorRef.current?.(message);
      });
    return () => {
      disposed = true;
      instance?.destroy();
      setAvatar(null);
    };
  }, []);

  useEffect(() => {
    avatar?.setVoiceLevel(voiceLevel);
  }, [avatar, voiceLevel]);

  useEffect(() => {
    avatar?.setSpeaking(isSpeaking);
  }, [avatar, isSpeaking]);

  useEffect(() => {
    if (emotion) avatar?.setEmotion(emotion.tag);
  }, [avatar, emotion]);

  return (
    <>
      <canvas ref={canvasRef} className={className ?? 'avatar-canvas'} />
      {error && <div className="avatar-error">{error}</div>}
    </>
  );
}
