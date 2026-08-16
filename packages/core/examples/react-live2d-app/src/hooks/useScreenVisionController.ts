import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScreenVisionSettings } from '../types/settings';

interface ScreenVisionControllerOptions {
  settings: ScreenVisionSettings;
  onCapture: (imageDataUrl: string, prompt: string) => Promise<void> | void;
  onEnabledChange: (enabled: boolean) => void;
  onDeviceIdChange: (deviceId: string) => void;
}

function captureVideoFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export function useScreenVisionController({
  settings,
  onCapture,
  onEnabledChange,
  onDeviceIdChange,
}: ScreenVisionControllerOptions) {
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const captureRunningRef = useRef(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const ensureCaptureVideo = useCallback(() => {
    if (captureVideoRef.current) {
      return captureVideoRef.current;
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    captureVideoRef.current = video;
    return video;
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setStatusMessage('Este navegador no soporta entrada de cámara.');
      return;
    }

    const nextDevices = (
      await navigator.mediaDevices.enumerateDevices()
    ).filter((device) => device.kind === 'videoinput');
    setDevices(nextDevices);

    if (!settings.deviceId && nextDevices[0]?.deviceId) {
      onDeviceIdChange(nextDevices[0].deviceId);
    }
  }, [onDeviceIdChange, settings.deviceId]);

  const stopStream = useCallback(() => {
    setStream((currentStream) => {
      currentStream?.getTracks().forEach((track) => track.stop());
      return null;
    });

    if (captureVideoRef.current) {
      captureVideoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMessage('Este navegador no soporta entrada de cámara.');
      onEnabledChange(false);
      return;
    }

    try {
      stopStream();
      setStatusMessage('');
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: settings.deviceId
          ? { deviceId: { exact: settings.deviceId } }
          : true,
        audio: false,
      });
      const video = ensureCaptureVideo();
      video.srcObject = nextStream;
      await video.play();
      setStream(nextStream);
      setStatusMessage('Vista previa iniciada.');
      await refreshDevices();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar la cámara.';
      setStatusMessage(message);
      onEnabledChange(false);
    }
  }, [
    ensureCaptureVideo,
    onEnabledChange,
    refreshDevices,
    settings.deviceId,
    stopStream,
  ]);

  const captureAndSend = useCallback(async () => {
    if (captureRunningRef.current) {
      return;
    }

    const video = captureVideoRef.current;
    if (!video || !stream) {
      setStatusMessage('Inicia la vista previa primero.');
      return;
    }

    const imageDataUrl = captureVideoFrame(video);
    if (!imageDataUrl) {
      setStatusMessage('No se pudo capturar el frame de video.');
      return;
    }

    setStatusMessage('Enviando pantalla...');
    captureRunningRef.current = true;
    try {
      await onCapture(imageDataUrl, settings.prompt);
      setStatusMessage('Pantalla enviada.');
    } finally {
      captureRunningRef.current = false;
    }
  }, [onCapture, settings.prompt, stream]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshDevices();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshDevices]);

  useEffect(() => {
    if (!settings.enabled) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void startStream();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      stopStream();
    };
  }, [settings.enabled, settings.deviceId, startStream, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  useEffect(() => {
    if (!settings.enabled || settings.autoIntervalMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void captureAndSend();
    }, settings.autoIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [captureAndSend, settings.autoIntervalMs, settings.enabled]);

  return {
    devices,
    stream,
    isPreviewing: Boolean(stream),
    statusMessage,
    refreshDevices,
    start: () => {
      if (settings.enabled) {
        void startStream();
        return;
      }
      onEnabledChange(true);
    },
    stop: () => {
      stopStream();
      onEnabledChange(false);
    },
    captureAndSend,
  } as const;
}
