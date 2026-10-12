import { useEffect, useRef, useState } from 'react';
import {
  type AvatarSource,
  type MeshAvatar,
  loadMeshAvatar,
} from 'mesh-avatar';

/** Avatar returned by `loadMeshAvatar`, including its opened package */
export type LoadedMeshAvatar = Awaited<ReturnType<typeof loadMeshAvatar>>;

/** Bundled avatar served from the app's own origin */
export const DEFAULT_MESH_AVATAR_SOURCE = '/avatar/miko-qipao.mavatar';

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
  /** URL of a `.mavatar` archive or avatar folder, or a loaded file (`Blob`) */
  source?: AvatarSource;
  className?: string;
  onReady?: (avatar: LoadedMeshAvatar) => void;
  onError?: (message: string) => void;
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
  source = DEFAULT_MESH_AVATAR_SOURCE,
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
    loadMeshAvatar(canvas, source)
      .then((created) => {
        if (disposed) {
          created.destroy();
          return;
        }
        instance = created;
        setError(null);
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
  }, [source]);

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
