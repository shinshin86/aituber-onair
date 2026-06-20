import { useCallback, useEffect, useRef, useState } from 'react';

interface ScreenVisionPanelProps {
  disabled?: boolean;
  onCapture: (imageDataUrl: string, prompt: string) => Promise<void> | void;
}

const DEFAULT_PROMPT =
  'OBS仮想カメラの画面を見て、配信者として短く自然にコメントしてください。';
const AUTO_CAPTURE_INTERVAL_OPTIONS = [
  { value: 0, label: '手動のみ' },
  { value: 30_000, label: '30秒ごと' },
  { value: 60_000, label: '1分ごと' },
  { value: 120_000, label: '2分ごと' },
  { value: 300_000, label: '5分ごと' },
] as const;

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

export function ScreenVisionPanel({
  disabled = false,
  onCapture,
}: ScreenVisionPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureRunningRef = useRef(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [autoIntervalMs, setAutoIntervalMs] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPreviewing(false);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setStatusMessage('このブラウザではカメラ入力を利用できません。');
      return;
    }

    const nextDevices = (
      await navigator.mediaDevices.enumerateDevices()
    ).filter((device) => device.kind === 'videoinput');
    setDevices(nextDevices);
    setDeviceId((current) => current || nextDevices[0]?.deviceId || '');
  }, []);

  const startPreview = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMessage('このブラウザではカメラ入力を利用できません。');
      return;
    }

    try {
      stopPreview();
      setStatusMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsPreviewing(true);
      await refreshDevices();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'カメラを開始できませんでした。';
      setStatusMessage(message);
    }
  }, [deviceId, refreshDevices, stopPreview]);

  const captureAndSend = useCallback(async () => {
    if (captureRunningRef.current) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setStatusMessage('プレビューを開始してください。');
      return;
    }

    const imageDataUrl = captureVideoFrame(video);
    if (!imageDataUrl) {
      setStatusMessage('映像フレームを取得できませんでした。');
      return;
    }

    setStatusMessage('画面を送信しています...');
    captureRunningRef.current = true;
    try {
      await onCapture(imageDataUrl, prompt);
      setStatusMessage('画面を送信しました。');
    } finally {
      captureRunningRef.current = false;
    }
  }, [onCapture, prompt]);

  const handleCapture = useCallback(async () => {
    await captureAndSend();
  }, [captureAndSend]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshDevices();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      stopPreview();
    };
  }, [refreshDevices, stopPreview]);

  useEffect(() => {
    if (!isPreviewing || autoIntervalMs <= 0 || disabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void captureAndSend();
    }, autoIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoIntervalMs, captureAndSend, disabled, isPreviewing]);

  return (
    <div className="screen-vision-panel">
      <div className="settings-field">
        <label htmlFor="screen-vision-device">カメラ入力</label>
        <select
          id="screen-vision-device"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          disabled={disabled || isPreviewing}
        >
          {devices.length === 0 && <option value="">カメラを検出中...</option>}
          {devices.map((device, index) => (
            <option key={device.deviceId || index} value={device.deviceId}>
              {device.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>
        <p className="settings-field-hint">
          OBS Virtual Cameraを選択してプレビューを開始してください。
        </p>
      </div>

      <video
        ref={videoRef}
        className="screen-vision-preview"
        muted
        playsInline
      />

      <div className="settings-field">
        <label htmlFor="screen-vision-prompt">画面を見る時の指示</label>
        <input
          id="screen-vision-prompt"
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="settings-field">
        <label htmlFor="screen-vision-interval">自動で見る間隔</label>
        <select
          id="screen-vision-interval"
          value={autoIntervalMs}
          onChange={(event) => setAutoIntervalMs(Number(event.target.value))}
          disabled={disabled}
        >
          {AUTO_CAPTURE_INTERVAL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="settings-field-hint">
          プレビュー中だけ、選択した間隔で現在のフレームを送信します。
        </p>
      </div>

      <div className="screen-vision-actions">
        <button
          type="button"
          className="settings-action-button"
          onClick={isPreviewing ? stopPreview : startPreview}
          disabled={disabled}
        >
          {isPreviewing ? 'プレビュー停止' : 'プレビュー開始'}
        </button>
        <button
          type="button"
          className="settings-action-button"
          onClick={handleCapture}
          disabled={disabled || !isPreviewing}
        >
          画面を見る
        </button>
      </div>

      {statusMessage && <p className="settings-field-hint">{statusMessage}</p>}
    </div>
  );
}
