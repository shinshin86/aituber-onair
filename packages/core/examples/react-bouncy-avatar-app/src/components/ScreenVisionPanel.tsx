import { useEffect, useRef } from 'react';
import type { useScreenVisionController } from '../hooks/useScreenVisionController';
import type { ScreenVisionSettings } from '../types/settings';

type ScreenVisionController = ReturnType<typeof useScreenVisionController>;

interface ScreenVisionPanelProps {
  disabled?: boolean;
  settings: ScreenVisionSettings;
  controller: ScreenVisionController;
  onDeviceIdChange: (deviceId: string) => void;
  onPromptChange: (prompt: string) => void;
  onAutoIntervalMsChange: (autoIntervalMs: number) => void;
}

const AUTO_CAPTURE_INTERVAL_OPTIONS = [
  { value: 0, label: '手動のみ' },
  { value: 30_000, label: '30秒ごと' },
  { value: 60_000, label: '1分ごと' },
  { value: 120_000, label: '2分ごと' },
  { value: 300_000, label: '5分ごと' },
] as const;

export function ScreenVisionPanel({
  disabled = false,
  settings,
  controller,
  onDeviceIdChange,
  onPromptChange,
  onAutoIntervalMsChange,
}: ScreenVisionPanelProps) {
  const previewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = previewRef.current;
    if (!video) {
      return;
    }

    video.srcObject = controller.stream;
    if (controller.stream) {
      void video.play();
    }

    return () => {
      video.srcObject = null;
    };
  }, [controller.stream]);

  return (
    <div className="screen-vision-panel">
      <div className="settings-field">
        <label htmlFor="screen-vision-device">カメラ入力</label>
        <select
          id="screen-vision-device"
          value={settings.deviceId}
          onChange={(event) => onDeviceIdChange(event.target.value)}
          disabled={disabled}
        >
          {controller.devices.length === 0 && (
            <option value="">カメラを検出中...</option>
          )}
          {controller.devices.map((device, index) => (
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
        ref={previewRef}
        className="screen-vision-preview"
        muted
        playsInline
      />

      <div className="settings-field">
        <label htmlFor="screen-vision-prompt">画面認識時の追加指示</label>
        <textarea
          id="screen-vision-prompt"
          rows={4}
          value={settings.prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          disabled={disabled}
        />
        <p className="settings-field-hint">
          LLM設定の共通System Promptに加えて、画像と一緒に送信されます。
        </p>
      </div>

      <div className="settings-field">
        <label htmlFor="screen-vision-interval">自動で見る間隔</label>
        <select
          id="screen-vision-interval"
          value={settings.autoIntervalMs}
          onChange={(event) =>
            onAutoIntervalMsChange(Number(event.target.value))
          }
          disabled={disabled}
        >
          {AUTO_CAPTURE_INTERVAL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="settings-field-hint">
          プレビュー中だけ、選択した間隔で現在のフレームを送信します。設定画面を閉じても動作します。
        </p>
      </div>

      <div className="screen-vision-actions">
        <button
          type="button"
          className="settings-action-button"
          onClick={controller.isPreviewing ? controller.stop : controller.start}
          disabled={disabled}
        >
          {controller.isPreviewing ? 'プレビュー停止' : 'プレビュー開始'}
        </button>
        <button
          type="button"
          className="settings-action-button"
          onClick={() => void controller.captureAndSend()}
          disabled={disabled || !controller.isPreviewing}
        >
          画面を見る
        </button>
      </div>

      {controller.statusMessage && (
        <p className="settings-field-hint">{controller.statusMessage}</p>
      )}
    </div>
  );
}
