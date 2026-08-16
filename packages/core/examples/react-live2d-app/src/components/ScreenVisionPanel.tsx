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
  { value: 0, label: 'Solo manual' },
  { value: 30_000, label: 'Cada 30 segundos' },
  { value: 60_000, label: 'Cada 1 minuto' },
  { value: 120_000, label: 'Cada 2 minutos' },
  { value: 300_000, label: 'Cada 5 minutos' },
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
        <label htmlFor="screen-vision-device">Entrada de cámara</label>
        <select
          id="screen-vision-device"
          value={settings.deviceId}
          onChange={(event) => onDeviceIdChange(event.target.value)}
          disabled={disabled}
        >
          {controller.devices.length === 0 && (
            <option value="">Detectando cámaras...</option>
          )}
          {controller.devices.map((device, index) => (
            <option key={device.deviceId || index} value={device.deviceId}>
              {device.label || `Cámara ${index + 1}`}
            </option>
          ))}
        </select>
        <p className="settings-field-hint">
          Selecciona OBS Virtual Camera para iniciar la vista previa.
        </p>
      </div>

      <video
        ref={previewRef}
        className="screen-vision-preview"
        muted
        playsInline
      />

      <div className="settings-field">
        <label htmlFor="screen-vision-prompt">Instrucciones adicionales al reconocer pantalla</label>
        <textarea
          id="screen-vision-prompt"
          rows={4}
          value={settings.prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          disabled={disabled}
        />
        <p className="settings-field-hint">
          Además del System Prompt común de configuración LLM, se enviará junto con la imagen.
        </p>
      </div>

      <div className="settings-field">
        <label htmlFor="screen-vision-interval">Intervalo automático</label>
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
          Solo durante la vista previa, enviará el fotograma actual al intervalo seleccionado. Funciona incluso con la pantalla de configuración cerrada.
        </p>
      </div>

      <div className="screen-vision-actions">
        <button
          type="button"
          className="settings-action-button"
          onClick={controller.isPreviewing ? controller.stop : controller.start}
          disabled={disabled}
        >
          {controller.isPreviewing ? 'Detener vista previa' : 'Iniciar vista previa'}
        </button>
        <button
          type="button"
          className="settings-action-button"
          onClick={() => void controller.captureAndSend()}
          disabled={disabled || !controller.isPreviewing}
        >
          Ver pantalla
        </button>
      </div>

      {controller.statusMessage && (
        <p className="settings-field-hint">{controller.statusMessage}</p>
      )}
    </div>
  );
}
