import { installBrowserVirtualClock, VirtualClock } from './virtualClock.js';

interface MotionRuntimeDetection {
  usable: boolean;
  reason: string;
  summary: {
    canvasWidth: number;
    canvasHeight: number;
    layerCount: number;
    anchorCount: number;
    strandCount: number;
    partsFound: string[];
    missingRequiredParts: string[];
    warnings: string[];
    preprocessed: { noisy: number; layers: number };
  } | null;
}

interface MotionRuntimeAvatar {
  setMouthOpen(value: number): void;
  setIntensity(value: number): void;
  setMotionEnabled(value: boolean): void;
  dispose(): void;
}

interface MotionRuntimeModule {
  loadMotionRuntime(
    canvas: HTMLCanvasElement,
    psdBuffer: ArrayBuffer,
  ): Promise<{
    detection: MotionRuntimeDetection;
    avatar: MotionRuntimeAvatar | null;
  }>;
}

interface HarnessLoadOptions {
  runtimeUrl: string;
  avatarUrl: string;
  blinkSeed: number;
  motionIntensity: number;
}

interface HarnessFrameOptions {
  time: number;
  deltaSeconds: number;
  mouth: number;
  eyesClosed: boolean;
}

interface VirtualFrameDiagnostics {
  timeMs: number;
  callbacksPerFrame: number;
  pendingCallbacks: number;
}

export interface HarnessLoadResult {
  detection: MotionRuntimeDetection;
  canvasSize: { width: number; height: number } | null;
  virtualClock: {
    seed: number;
    timeMs: number;
    callbacksPerFrame: number;
    pendingCallbacks: number;
  };
  eyeInput: 'internal-seeded-automation';
}

interface HarnessState {
  avatar: MotionRuntimeAvatar;
  seed: number;
  lastCallbacksPerFrame: number;
}

declare global {
  interface Window {
    load(options: HarnessLoadOptions): Promise<HarnessLoadResult>;
    renderFrame(options: HarnessFrameOptions): VirtualFrameDiagnostics;
  }
}

const virtualClock = new VirtualClock();
virtualClock.reset(0);
installBrowserVirtualClock(virtualClock);

let state: HarnessState | null = null;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

async function load(options: HarnessLoadOptions): Promise<HarnessLoadResult> {
  state?.avatar.dispose();
  state = null;
  virtualClock.reset(options.blinkSeed);

  const response = await fetch(options.avatarUrl);
  if (!response.ok) {
    throw new Error(`Could not load PSD avatar: HTTP ${response.status}.`);
  }
  const canvas = document.querySelector<HTMLCanvasElement>('#avatar');
  if (!canvas) throw new Error('Harness canvas was not found.');
  const runtime = (await import(
    /* @vite-ignore */ options.runtimeUrl
  )) as MotionRuntimeModule;
  const loaded = await runtime.loadMotionRuntime(
    canvas,
    await response.arrayBuffer(),
  );
  const detection: MotionRuntimeDetection = {
    usable: loaded.detection.usable,
    reason: loaded.detection.reason,
    summary: loaded.detection.summary,
  };
  if (!loaded.avatar || !loaded.detection.usable) {
    return {
      detection,
      canvasSize: null,
      virtualClock: {
        seed: options.blinkSeed,
        timeMs: virtualClock.now(),
        callbacksPerFrame: 0,
        pendingCallbacks: virtualClock.pendingAnimationFrames(),
      },
      eyeInput: 'internal-seeded-automation',
    };
  }

  loaded.avatar.setMotionEnabled(true);
  loaded.avatar.setIntensity(options.motionIntensity);
  state = {
    avatar: loaded.avatar,
    seed: options.blinkSeed,
    lastCallbacksPerFrame: 0,
  };
  renderFrame({ time: 0, deltaSeconds: 0, mouth: 0, eyesClosed: false });
  return {
    detection,
    canvasSize: { width: canvas.width, height: canvas.height },
    virtualClock: {
      seed: options.blinkSeed,
      timeMs: virtualClock.now(),
      callbacksPerFrame: state.lastCallbacksPerFrame,
      pendingCallbacks: virtualClock.pendingAnimationFrames(),
    },
    eyeInput: 'internal-seeded-automation',
  };
}

function renderFrame(options: HarnessFrameOptions): VirtualFrameDiagnostics {
  if (!state) throw new Error('Call window.load before window.renderFrame.');
  state.avatar.setMouthOpen(clamp01(options.mouth));
  // The sibling renderer exposes no direct eye-open setter. Its blink
  // automation remains enabled and is deterministic under the patched clock.
  void options.eyesClosed;
  virtualClock.advance(options.deltaSeconds);
  const expectedTimeMs = options.time * 1000;
  if (Math.abs(virtualClock.now() - expectedTimeMs) > 0.001) {
    throw new Error(
      `Virtual time mismatch: expected ${expectedTimeMs}, got ${virtualClock.now()}.`,
    );
  }
  const callbacks = virtualClock.flushAnimationFrame();
  const pending = virtualClock.pendingAnimationFrames();
  if (callbacks !== 1 || pending !== 1) {
    throw new Error(
      `Anime2.5DRig renderer must render exactly once per virtual frame (flushed ${callbacks}, pending ${pending}).`,
    );
  }
  state.lastCallbacksPerFrame = callbacks;
  return {
    timeMs: virtualClock.now(),
    callbacksPerFrame: callbacks,
    pendingCallbacks: pending,
  };
}

window.load = load;
window.renderFrame = renderFrame;
