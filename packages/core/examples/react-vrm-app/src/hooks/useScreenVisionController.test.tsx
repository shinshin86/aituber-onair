// @vitest-environment jsdom
import { act, useLayoutEffect } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useScreenVisionController } from './useScreenVisionController';

let root: Root;
let container: HTMLDivElement;
let controller: ReturnType<typeof useScreenVisionController>;
const onCapture = vi.fn();
const onEnabledChange = vi.fn();
const onDeviceIdChange = vi.fn();
function Harness() {
  const result = useScreenVisionController({
    settings: {
      enabled: true,
      deviceId: '',
      prompt: 'Describe the screen',
      autoIntervalMs: 0,
    },
    onCapture,
    onEnabledChange,
    onDeviceIdChange,
  });
  useLayoutEffect(() => {
    controller = result;
  });
  return <output>{result.statusMessage}</output>;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  onCapture.mockReset();
  onEnabledChange.mockReset();
  onDeviceIdChange.mockReset();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      enumerateDevices: vi.fn(async () => []),
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn() }],
      })),
    },
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(
    640,
  );
  vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(
    360,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/jpeg;base64,mock',
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Harness />));
  await act(async () => vi.advanceTimersByTimeAsync(0));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'mediaDevices');
});

it('shows rejected capture status, avoids false success, and allows a later retry', async () => {
  onCapture.mockRejectedValueOnce(
    new Error('Screen vision requires catalog and SDK support.'),
  );
  await act(async () => controller.captureAndSend());
  expect(onCapture).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Screen vision requires');
  expect(container.textContent).not.toContain('画面を送信しました。');
  onCapture.mockResolvedValueOnce(undefined);
  await act(async () => controller.captureAndSend());
  expect(onCapture).toHaveBeenCalledTimes(2);
  expect(container.textContent).toBe('画面を送信しました。');
});
