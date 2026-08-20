import {
  DEFAULT_AVATAR_FRAMING,
  DEFAULT_IDLE_ANIMATION,
} from '../src/types.js';
import { installBrowserVirtualClock, VirtualClock } from './virtualClock.js';

type MouthControl =
  | {
      kind: 'vec2';
      parameterId: string;
      idleX: number;
      idleY: number;
      openY: number;
    }
  | { kind: 'scalar'; parameterId: string; idleValue: number };

const MOUTH_PARAMETER_CANDIDATES: readonly MouthControl[] = [
  {
    kind: 'vec2',
    parameterId: 'Mouth:: Shape',
    idleX: 1,
    idleY: 0,
    openY: 1,
  },
  { kind: 'scalar', parameterId: 'Mouth:: Open', idleValue: 0 },
  { kind: 'scalar', parameterId: 'Mouth:: Openness', idleValue: 0 },
  { kind: 'scalar', parameterId: 'Mouth Open', idleValue: 0 },
] as const;
const BLINK_PARAMETER_IDS = [
  'Eye:: Left:: Blink',
  'Eye:: Right:: Blink',
  'Blink',
] as const;

interface Inochi2DDebugState {
  activeAnimation?: { name?: string; kind?: string; loop?: boolean } | null;
  blinkLayer?: { activeParameterIds?: string[] };
  cameraTransform?: { x?: number; y?: number; scale?: number };
  canvasDataset?: Record<string, string>;
}

interface Inochi2DController {
  mount(canvas: HTMLCanvasElement): Promise<void> | void;
  unmount(): Promise<void> | void;
  loadModel(modelUrl: string, motionUrl?: string): Promise<void>;
  setParameter(parameterId: string, value: number): Promise<void> | void;
  setParameterVector?(
    parameterId: string,
    valueX: number,
    valueY: number,
  ): Promise<void> | void;
  setEyeBlinkValue?(
    valueLeft: number,
    valueRight?: number,
    options?: { durationMs?: number },
  ): Promise<void> | void;
  playAnimation?(
    animationName: string,
    options?: {
      loop?: boolean;
      restart?: boolean;
      weight?: number;
      kind?: 'manual' | 'idle' | 'reaction' | 'emotion';
    },
  ): Promise<void> | void;
  setCameraTransform(x: number, y: number, scale: number): Promise<void> | void;
  resize(
    width: number,
    height: number,
    devicePixelRatio: number,
  ): Promise<void> | void;
  getDebugState?(): Inochi2DDebugState;
}

interface Inochi2DBridgeModule {
  createInochi2DController(options: {
    wasmUrl: string;
    debug?: boolean;
  }): Promise<Inochi2DController> | Inochi2DController;
}

interface HarnessLoadOptions {
  bridgeUrl: string;
  wasmUrl: string;
  modelUrl: string;
  motionUrl?: string;
  width: number;
  height: number;
  blinkSeed: number;
  avatarFraming?: { scale?: number; x?: number; y?: number };
  idleAnimation?: string;
  motionIntensity?: number;
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

export interface HarnessDiagnostics {
  runtime: string;
  canvasSize: { width: number; height: number };
  mouthParameterId: string;
  mouthParameterKind: MouthControl['kind'];
  eyeParameterIds: string[];
  idleAnimation: string;
  idleAnimationActive: boolean;
  avatarFraming: { scale: number; x: number; y: number };
  virtualClock: {
    seed: number;
    timeMs: number;
    callbacksPerFrame: number;
    pendingCallbacks: number;
  };
}

interface HarnessState {
  canvas: HTMLCanvasElement;
  controller: Inochi2DController;
  mouthControl: MouthControl;
  seed: number;
  lastCallbacksPerFrame: number;
}

declare global {
  interface Window {
    load(options: HarnessLoadOptions): Promise<HarnessDiagnostics>;
    renderFrame(options: HarnessFrameOptions): Promise<VirtualFrameDiagnostics>;
  }
}

const virtualClock = new VirtualClock();
virtualClock.reset(0);
installBrowserVirtualClock(virtualClock);

let state: HarnessState | null = null;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resolveMouthControl(controller: Inochi2DController): MouthControl {
  if (typeof controller.setParameterVector === 'function') {
    return MOUTH_PARAMETER_CANDIDATES[0];
  }
  return MOUTH_PARAMETER_CANDIDATES.find(
    (candidate) => candidate.kind === 'scalar',
  ) as MouthControl;
}

async function setMouth(
  controller: Inochi2DController,
  control: MouthControl,
  value: number,
): Promise<void> {
  const open = clamp01(value);
  if (control.kind === 'vec2' && controller.setParameterVector) {
    const y = control.idleY + (control.openY - control.idleY) * open;
    await Promise.resolve(
      controller.setParameterVector(control.parameterId, control.idleX, y),
    );
    return;
  }
  await Promise.resolve(controller.setParameter(control.parameterId, open));
}

async function setBlink(
  controller: Inochi2DController,
  eyesClosed: boolean,
  deltaSeconds: number,
): Promise<void> {
  const value = eyesClosed ? 1 : 0;
  if (controller.setEyeBlinkValue) {
    await Promise.resolve(
      controller.setEyeBlinkValue(value, value, {
        durationMs: deltaSeconds * 1000 + 1,
      }),
    );
    return;
  }
  await Promise.all(
    BLINK_PARAMETER_IDS.map((parameterId) =>
      Promise.resolve(controller.setParameter(parameterId, value)),
    ),
  );
}

function readDiagnostics(
  current: HarnessState,
  options: HarnessLoadOptions,
): HarnessDiagnostics {
  const debug = current.controller.getDebugState?.();
  const framing = { ...DEFAULT_AVATAR_FRAMING, ...options.avatarFraming };
  return {
    runtime: debug?.canvasDataset?.inochi2dRuntime ?? 'inox2d-wasm-webgl2',
    canvasSize: { width: current.canvas.width, height: current.canvas.height },
    mouthParameterId: current.mouthControl.parameterId,
    mouthParameterKind: current.mouthControl.kind,
    eyeParameterIds: debug?.blinkLayer?.activeParameterIds ?? [
      ...BLINK_PARAMETER_IDS,
    ],
    idleAnimation: options.idleAnimation ?? DEFAULT_IDLE_ANIMATION,
    idleAnimationActive: Boolean(debug?.activeAnimation),
    avatarFraming: framing,
    virtualClock: {
      seed: current.seed,
      timeMs: virtualClock.now(),
      callbacksPerFrame: current.lastCallbacksPerFrame,
      pendingCallbacks: virtualClock.pendingAnimationFrames(),
    },
  };
}

async function load(options: HarnessLoadOptions): Promise<HarnessDiagnostics> {
  if (state) await Promise.resolve(state.controller.unmount());
  virtualClock.reset(options.blinkSeed);

  const bridge = (await import(
    /* @vite-ignore */ options.bridgeUrl
  )) as Inochi2DBridgeModule;
  if (typeof bridge.createInochi2DController !== 'function') {
    throw new Error('Inochi2D bridge must export createInochi2DController().');
  }

  const canvas = document.querySelector<HTMLCanvasElement>('#avatar');
  if (!canvas) throw new Error('Harness canvas was not found.');
  canvas.width = options.width;
  canvas.height = options.height;

  const controller = await bridge.createInochi2DController({
    wasmUrl: options.wasmUrl,
    debug: true,
  });
  await Promise.resolve(controller.mount(canvas));
  await Promise.resolve(controller.resize(options.width, options.height, 1));
  await controller.loadModel(options.modelUrl, options.motionUrl);

  const framing = { ...DEFAULT_AVATAR_FRAMING, ...options.avatarFraming };
  await Promise.resolve(
    controller.setCameraTransform(framing.x, framing.y, framing.scale),
  );
  const idleAnimation = options.idleAnimation ?? DEFAULT_IDLE_ANIMATION;
  if (controller.playAnimation) {
    await Promise.resolve(
      controller.playAnimation(idleAnimation, {
        loop: true,
        restart: true,
        weight: Math.max(0, Math.min(3, options.motionIntensity ?? 1)),
        kind: 'idle',
      }),
    );
  }

  state = {
    canvas,
    controller,
    mouthControl: resolveMouthControl(controller),
    seed: options.blinkSeed,
    lastCallbacksPerFrame: 0,
  };
  await renderFrame({
    time: 0,
    deltaSeconds: 0,
    mouth: 0,
    eyesClosed: false,
  });
  return readDiagnostics(state, options);
}

async function renderFrame(
  options: HarnessFrameOptions,
): Promise<VirtualFrameDiagnostics> {
  if (!state) throw new Error('Call window.load before window.renderFrame.');
  await setMouth(state.controller, state.mouthControl, options.mouth);
  await setBlink(state.controller, options.eyesClosed, options.deltaSeconds);
  virtualClock.advance(options.deltaSeconds);
  const expectedTimeMs = options.time * 1000;
  if (Math.abs(virtualClock.now() - expectedTimeMs) > 0.001) {
    throw new Error(
      `Virtual time mismatch: expected ${expectedTimeMs}, got ${virtualClock.now()}.`,
    );
  }
  const callbacks = virtualClock.flushAnimationFrame();
  if (callbacks !== 1 || virtualClock.pendingAnimationFrames() !== 1) {
    throw new Error(
      `Inochi2D bridge must render exactly once per virtual frame (flushed ${callbacks}, pending ${virtualClock.pendingAnimationFrames()}).`,
    );
  }
  state.lastCallbacksPerFrame = callbacks;
  return {
    timeMs: virtualClock.now(),
    callbacksPerFrame: callbacks,
    pendingCallbacks: virtualClock.pendingAnimationFrames(),
  };
}

window.load = load;
window.renderFrame = renderFrame;
