import { Application, type Container, Ticker } from 'pixi.js';
import { DEFAULT_AVATAR_FRAMING } from '../src/types.js';

const MOUTH_PARAMETER_IDS = [
  'ParamMouthOpenY',
  'PARAM_MOUTH_OPEN_Y',
  'MouthOpenY',
  'ParamMouthOpen',
  'PARAM_MOUTH_OPEN',
  'MouthOpen',
] as const;
const EYE_PARAMETER_IDS = ['ParamEyeLOpen', 'ParamEyeROpen'] as const;

interface HarnessLoadOptions {
  modelUrl: string;
  cubismCoreUrl: string;
  width: number;
  height: number;
  avatarFraming?: {
    scale?: number;
    x?: number;
    y?: number;
  };
  idleMotionGroup?: string;
}

interface HarnessFrameOptions {
  time: number;
  deltaSeconds: number;
  mouth: number;
  eyesClosed: boolean;
}

export interface HarnessDiagnostics {
  coreVersion: string;
  modelSize: { width: number; height: number };
  mouthParameterId: string | null;
  eyeParameterIds: string[];
  idleMotionGroup: string | null;
  idleMotionActive: boolean;
  avatarFraming: {
    scale: number;
    x: number;
    y: number;
    renderedScale: number;
  };
}

interface CubismCoreModel {
  getParameterCount(): number;
  getParameterIndex(id: string): number;
  setParameterValueById(id: string, value: number): void;
  update(): void;
}

interface MotionManager {
  definitions: Record<string, unknown[]>;
  groups: { idle: string };
  startMotion(
    group: string,
    index: number,
    priority?: number,
    options?: Record<string, unknown>,
  ): Promise<boolean>;
  startRandomMotion(
    group: string,
    priority?: number,
    options?: Record<string, unknown>,
  ): Promise<boolean>;
}

interface InternalModel {
  width: number;
  height: number;
  coreModel: CubismCoreModel;
  motionManager: MotionManager;
  eyeBlink?: unknown;
  lipSync: boolean;
  update(deltaMilliseconds: number, elapsedMilliseconds: number): void;
}

type Live2DModelInstance = Container & {
  anchor: { set(x: number, y?: number): void };
  internalModel: InternalModel;
  deltaTime: number;
  elapsedTime: number;
  update(deltaMilliseconds: number): void;
  destroy(options?: unknown): void;
};

interface Live2DModelConstructor {
  registerTicker(ticker: typeof Ticker): void;
  from(
    source: string,
    options: Record<string, unknown>,
  ): Promise<Live2DModelInstance>;
}

interface CubismCoreWindow extends Window {
  Live2DCubismCore?: {
    Version: { csmGetVersion(): number };
  };
}

interface HarnessState {
  app: Application;
  model: Live2DModelInstance;
  coreModel: CubismCoreModel;
  mouthParameterId: string | null;
  eyeParameterIds: string[];
}

declare global {
  interface Window {
    load(options: HarnessLoadOptions): Promise<HarnessDiagnostics>;
    renderFrame(options: HarnessFrameOptions): void;
  }
}

let state: HarnessState | null = null;

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error(`Unable to load Cubism Core from ${url}.`)),
      { once: true },
    );
    document.head.append(script);
  });
}

function formatCoreVersion(version: number): string {
  const major = (version & 0xff000000) >>> 24;
  const minor = (version & 0x00ff0000) >>> 16;
  const patch = version & 0x0000ffff;
  return `${major}.${minor}.${patch}`;
}

function hasParameter(coreModel: CubismCoreModel, id: string): boolean {
  return coreModel.getParameterIndex(id) < coreModel.getParameterCount();
}

function resolveMouthParameter(coreModel: CubismCoreModel): string | null {
  return MOUTH_PARAMETER_IDS.find((id) => hasParameter(coreModel, id)) ?? null;
}

function resolveEyeParameters(coreModel: CubismCoreModel): string[] {
  return EYE_PARAMETER_IDS.filter((id) => hasParameter(coreModel, id));
}

async function pinIdleMotion(
  motionManager: MotionManager,
  requestedGroup: string | undefined,
): Promise<{ group: string | null; active: boolean }> {
  const definitions = motionManager.definitions;
  const group =
    requestedGroup ??
    (Array.isArray(definitions.Idle) && definitions.Idle.length > 0
      ? 'Idle'
      : null);
  if (!group || !Array.isArray(definitions[group]) || !definitions[group][0]) {
    return { group: null, active: false };
  }

  motionManager.groups.idle = group;
  const startPinnedMotion = (
    nextGroup: string,
    priority?: number,
    options?: Record<string, unknown>,
  ) => motionManager.startMotion(nextGroup, 0, priority, options);
  // The library normally chooses a random idle index whenever one finishes.
  // Pinning index zero makes both the initial motion and every restart stable.
  motionManager.startRandomMotion = startPinnedMotion;
  return {
    group,
    active: await startPinnedMotion(group, 1),
  };
}

function advanceModel(model: Live2DModelInstance, deltaMilliseconds: number) {
  model.update(deltaMilliseconds);
  if (model.deltaTime > 0) {
    model.internalModel.update(model.deltaTime, model.elapsedTime);
    model.deltaTime = 0;
  }
}

async function load(options: HarnessLoadOptions): Promise<HarnessDiagnostics> {
  const canvas = document.querySelector<HTMLCanvasElement>('#avatar');
  if (!canvas) throw new Error('Harness canvas was not found.');

  await loadScript(options.cubismCoreUrl);
  const cubismWindow = window as CubismCoreWindow;
  const coreVersionNumber =
    cubismWindow.Live2DCubismCore?.Version.csmGetVersion();
  if (coreVersionNumber === undefined) {
    throw new Error('Cubism Core loaded without exposing Live2DCubismCore.');
  }

  const cubismModule = (await import(
    'pixi-live2d-display-lipsyncpatch/cubism4'
  )) as { Live2DModel: Live2DModelConstructor };
  cubismModule.Live2DModel.registerTicker(Ticker);

  const app = new Application({
    view: canvas,
    width: options.width,
    height: options.height,
    backgroundAlpha: 0,
    antialias: true,
    autoStart: false,
    sharedTicker: false,
    resolution: 1,
    preserveDrawingBuffer: true,
  });
  app.stop();

  const model = await cubismModule.Live2DModel.from(options.modelUrl, {
    autoUpdate: false,
    autoFocus: false,
    autoHitTest: false,
    motionPreload: 'ALL',
    idleMotionGroup: options.idleMotionGroup,
  });
  const internalModel = model.internalModel;
  internalModel.eyeBlink = undefined;
  internalModel.lipSync = false;
  app.stage.addChild(model);

  const modelWidth = Math.max(internalModel.width || model.width || 1, 1);
  const modelHeight = Math.max(internalModel.height || model.height || 1, 1);
  const framing = {
    ...DEFAULT_AVATAR_FRAMING,
    ...options.avatarFraming,
  };
  const widthScale = (options.width * 0.94) / modelWidth;
  const heightScale = (options.height * 1.15) / modelHeight;
  const renderedScale =
    Math.max(0.1, Math.min(widthScale, heightScale, 4)) * framing.scale;
  model.scale.set(renderedScale);
  model.anchor.set(0.5, 0.2);
  model.position.set(options.width * framing.x, options.height * framing.y);

  const coreModel = internalModel.coreModel;
  const mouthParameterId = resolveMouthParameter(coreModel);
  const eyeParameterIds = resolveEyeParameters(coreModel);
  const idle = await pinIdleMotion(
    internalModel.motionManager,
    options.idleMotionGroup,
  );
  state = {
    app,
    model,
    coreModel,
    mouthParameterId,
    eyeParameterIds,
  };

  renderFrame({ time: 0, deltaSeconds: 0, mouth: 0, eyesClosed: false });
  return {
    coreVersion: formatCoreVersion(coreVersionNumber),
    modelSize: { width: modelWidth, height: modelHeight },
    mouthParameterId,
    eyeParameterIds,
    idleMotionGroup: idle.group,
    idleMotionActive: idle.active,
    avatarFraming: {
      ...framing,
      renderedScale,
    },
  };
}

function renderFrame(options: HarnessFrameOptions): void {
  if (!state) throw new Error('Call window.load before window.renderFrame.');
  const { app, model, coreModel, mouthParameterId, eyeParameterIds } = state;
  advanceModel(model, options.deltaSeconds * 1000);

  if (mouthParameterId) {
    coreModel.setParameterValueById(
      mouthParameterId,
      Math.max(0, Math.min(1, options.mouth)),
    );
  }
  for (const parameterId of eyeParameterIds) {
    coreModel.setParameterValueById(parameterId, options.eyesClosed ? 0 : 1);
  }
  // The plugin updates Cubism immediately before drawing. We advance it above,
  // then apply deterministic mouth/eye values and refresh drawable geometry.
  coreModel.update();
  app.renderer.render(app.stage);
}

window.load = load;
window.renderFrame = renderFrame;
