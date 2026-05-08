import type * as PIXI from 'pixi.js';
import { Ticker } from 'pixi.js';
import type {
  Live2DModelCtor,
  Live2DModelInstance,
  Live2DMotionManagerLike,
} from '../types/live2d';
import type { Live2DAudioBinding } from '../hooks/useAudioLipsync';

const MOUTH_PARAMETER_IDS = [
  'ParamMouthOpenY',
  'PARAM_MOUTH_OPEN_Y',
  'MouthOpenY',
  'ParamMouthOpen',
  'PARAM_MOUTH_OPEN',
  'MouthOpen',
] as const;

let tickerRegistered = false;
let cubism4ModulePromise: Promise<{ Live2DModel: Live2DModelCtor }> | null =
  null;
let cubismCoreLoadingPromise: Promise<void> | null = null;
let blobUrlFixInstalled = false;

type Live2DModelJson = {
  FileReferences?: {
    Moc?: string;
    Physics?: string;
    Pose?: string;
    DisplayInfo?: string;
    UserData?: string;
    Textures?: string[];
    Expressions?: Array<{ Name?: string; File?: string }>;
    Motions?: Record<string, Array<{ File?: string; Sound?: string }>>;
  };
};

export interface Live2DModelSource {
  folderName: string;
  modelFilePath: string;
  modelJsonUrl: string;
  revoke: () => void;
}

export interface BundledLive2DModelEntry {
  id: string;
  folderName: string;
  label: string;
  modelFilePath: string;
}

function normalizeBlobUrl(url: string): string {
  if (!url.startsWith('blob:')) {
    return url;
  }

  let fixedUrl = url.replace('blob:http//', 'blob:http://');
  fixedUrl = fixedUrl.replace('blob:https//', 'blob:https://');

  if (/^blob:http\/[^/]/.test(fixedUrl)) {
    fixedUrl = fixedUrl.replace(/^blob:http\//, 'blob:http://');
  }
  if (/^blob:https\/[^/]/.test(fixedUrl)) {
    fixedUrl = fixedUrl.replace(/^blob:https\//, 'blob:https://');
  }

  return fixedUrl;
}

function toAbsoluteAssetUrl(url: string): string {
  if (/^(?:blob:|data:|https?:)/.test(url)) {
    return url;
  }

  if (typeof window === 'undefined') {
    return url;
  }

  return new URL(url, window.location.href).toString();
}

export function installLive2DBlobUrlFix(): void {
  if (blobUrlFixInstalled || typeof window === 'undefined') {
    return;
  }

  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    const urlString =
      typeof url === 'string'
        ? normalizeBlobUrl(url)
        : normalizeBlobUrl(url.toString());

    return originalXHROpen.call(
      this,
      method,
      urlString,
      async ?? true,
      username,
      password,
    );
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string') {
      return originalFetch(normalizeBlobUrl(input), init);
    }
    if (input instanceof URL) {
      return originalFetch(new URL(normalizeBlobUrl(input.toString())), init);
    }
    if (input instanceof Request) {
      return originalFetch(
        new Request(normalizeBlobUrl(input.url), input),
        init,
      );
    }
    return originalFetch(input, init);
  };

  blobUrlFixInstalled = true;
}

function normalizePath(path: string): string {
  return path
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '');
}

function stripBundledModelsPrefix(path: string): string {
  return normalizePath(path).replace(/^(\.\.\/)+models\//, '');
}

function resolveRelativePath(baseFilePath: string, targetPath: string): string {
  const normalizedTarget = normalizePath(targetPath);
  if (!normalizedTarget) {
    return '';
  }
  if (!baseFilePath) {
    return normalizedTarget;
  }

  const baseSegments = normalizePath(baseFilePath).split('/');
  baseSegments.pop();
  const combinedUrl = new URL(
    normalizedTarget,
    `https://live2d.local/${baseSegments.join('/')}${baseSegments.length > 0 ? '/' : ''}`,
  );
  return decodeURIComponent(combinedUrl.pathname.replace(/^\/+/, ''));
}

async function rewriteModelJsonReferences(
  modelJson: Live2DModelJson,
  rewrite: (
    targetPath: string | undefined,
    mode: 'blob' | 'data',
  ) => Promise<string | undefined>,
) {
  const references = modelJson.FileReferences;

  if (!references) {
    throw new Error(
      '選択したモデル JSON に FileReferences が含まれていません。',
    );
  }

  references.Moc = await rewrite(references.Moc, 'blob');
  references.Physics = await rewrite(references.Physics, 'blob');
  references.Pose = await rewrite(references.Pose, 'blob');
  references.DisplayInfo = await rewrite(references.DisplayInfo, 'blob');
  references.UserData = await rewrite(references.UserData, 'blob');

  if (Array.isArray(references.Textures)) {
    references.Textures = await Promise.all(
      references.Textures.map((path) =>
        rewrite(path, 'data').then((value) => value || path),
      ),
    );
  }

  if (Array.isArray(references.Expressions)) {
    references.Expressions = await Promise.all(
      references.Expressions.map(async (expression) => ({
        ...expression,
        File: await rewrite(expression.File, 'blob'),
      })),
    );
  }

  if (references.Motions) {
    const motionEntries = Object.entries(references.Motions);
    for (const [group, motions] of motionEntries) {
      references.Motions[group] = await Promise.all(
        motions.map(async (motion) => ({
          ...motion,
          File: await rewrite(motion.File, 'blob'),
          Sound: await rewrite(motion.Sound, 'blob'),
        })),
      );
    }
  }
}

function createModelJsonBlobUrl(
  modelJson: Live2DModelJson,
  revokers: string[],
) {
  const modelJsonBlobUrl = URL.createObjectURL(
    new Blob([JSON.stringify(modelJson)], { type: 'application/json' }),
  );
  revokers.push(modelJsonBlobUrl);
  return modelJsonBlobUrl;
}

const bundledModelAssetUrls = import.meta.glob('../../models/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

type BundledLive2DModelRegistryEntry = BundledLive2DModelEntry & {
  assetUrls: Map<string, string>;
};

const bundledLive2DModelRegistry: BundledLive2DModelRegistryEntry[] = (() => {
  const assetUrls = new Map<string, string>();
  for (const [path, url] of Object.entries(bundledModelAssetUrls)) {
    assetUrls.set(stripBundledModelsPrefix(path), url);
  }

  return [...assetUrls.keys()]
    .filter((path) => path.endsWith('.model3.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((modelFilePath) => {
      const folderName = modelFilePath.split('/')[0] || 'Live2D';
      const fileName = modelFilePath.split('/').pop() || modelFilePath;
      return {
        id: modelFilePath,
        folderName,
        label:
          folderName === fileName.replace(/\.model3\.json$/, '')
            ? folderName
            : `${folderName} / ${fileName}`,
        modelFilePath,
        assetUrls,
      };
    });
})();

export function getBundledLive2DModels(): BundledLive2DModelEntry[] {
  return bundledLive2DModelRegistry.map(
    ({ id, folderName, label, modelFilePath }) => ({
      id,
      folderName,
      label,
      modelFilePath,
    }),
  );
}

export async function createBundledLive2DModelSource(
  modelId: string,
): Promise<Live2DModelSource> {
  const registryEntry = bundledLive2DModelRegistry.find(
    (entry) => entry.id === modelId,
  );

  if (!registryEntry) {
    throw new Error(`指定した Live2D モデルが見つかりません: ${modelId}`);
  }

  const modelJsonUrl = registryEntry.assetUrls.get(registryEntry.modelFilePath);
  if (!modelJsonUrl) {
    throw new Error(
      `モデル JSON が見つかりません: ${registryEntry.modelFilePath}`,
    );
  }

  const modelJson = (await fetch(modelJsonUrl).then((response) => {
    if (!response.ok) {
      throw new Error(
        `モデル JSON を読み込めませんでした: ${registryEntry.modelFilePath}`,
      );
    }
    return response.json();
  })) as Live2DModelJson;
  const revokers: string[] = [];

  await rewriteModelJsonReferences(modelJson, async (targetPath) => {
    if (!targetPath) {
      return undefined;
    }

    const resolvedPath = resolveRelativePath(
      registryEntry.modelFilePath,
      targetPath,
    );
    const assetUrl = registryEntry.assetUrls.get(resolvedPath);
    if (!assetUrl) {
      throw new Error(`Live2D アセットが見つかりません: ${targetPath}`);
    }
    return toAbsoluteAssetUrl(assetUrl);
  });

  return {
    folderName: registryEntry.folderName,
    modelFilePath: registryEntry.modelFilePath,
    modelJsonUrl: createModelJsonBlobUrl(modelJson, revokers),
    revoke: () => {
      for (const url of revokers) {
        URL.revokeObjectURL(url);
      }
    },
  };
}

export async function importCubism4Module(): Promise<{
  Live2DModel: Live2DModelCtor;
}> {
  if (!cubism4ModulePromise) {
    cubism4ModulePromise = import(
      'pixi-live2d-display-lipsyncpatch/cubism4'
    ).then((module) => {
      if (!tickerRegistered) {
        module.Live2DModel.registerTicker(Ticker);
        tickerRegistered = true;
      }
      return module;
    });
  }

  return cubism4ModulePromise;
}

function getCubismCoreScriptUrl() {
  return `${import.meta.env.BASE_URL}scripts/live2dcubismcore.min.js`;
}

export async function ensureCubismCoreLoaded() {
  const windowWithCubism = window as typeof window & {
    Live2DCubismCore?: unknown;
  };

  if (windowWithCubism.Live2DCubismCore) {
    return;
  }

  if (!cubismCoreLoadingPromise) {
    cubismCoreLoadingPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[data-live2d-cubism-core="true"]`,
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          'error',
          () =>
            reject(
              new Error(
                'public/scripts/live2dcubismcore.min.js から Cubism Core ランタイムを読み込めませんでした。',
              ),
            ),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = getCubismCoreScriptUrl();
      script.async = true;
      script.dataset.live2dCubismCore = 'true';
      script.onload = () => resolve();
      script.onerror = () =>
        reject(
          new Error(
            [
              'Cubism Core ランタイムを読み込めませんでした。',
              'public/scripts/live2dcubismcore.min.js に live2dcubismcore.min.js を配置してください。',
            ].join(' '),
          ),
        );
      document.head.appendChild(script);
    }).finally(() => {
      if (!windowWithCubism.Live2DCubismCore) {
        cubismCoreLoadingPromise = null;
      }
    });
  }

  await cubismCoreLoadingPromise;

  if (!windowWithCubism.Live2DCubismCore) {
    cubismCoreLoadingPromise = null;
    throw new Error(
      [
        'Cubism Core ランタイムが利用できません。',
        'public/scripts/live2dcubismcore.min.js に live2dcubismcore.min.js を配置してください。',
      ].join(' '),
    );
  }
}

export function setLive2DModelPosition(
  app: PIXI.Application,
  model: Live2DModelInstance,
) {
  const stageWidth = app.screen.width;
  const stageHeight = app.screen.height;
  const sourceWidth = Math.max(
    model.internalModel?.width || model.width || 1,
    1,
  );
  const sourceHeight = Math.max(
    model.internalModel?.height || model.height || 1,
    1,
  );
  const scaleW = (stageWidth * 0.6) / sourceWidth;
  const scaleH = (stageHeight * 0.7) / sourceHeight;
  const scale = Math.max(0.5, Math.min(Math.min(scaleW, scaleH), 2));

  model.scale.set(scale);
  model.anchor.set(0.5, 0.2);
  model.position.set(stageWidth / 2, stageHeight / 2);
}

export function setLive2DMouthOpen(model: Live2DModelInstance, value: number) {
  const clampedValue = Math.min(Math.max(value, 0), 1);
  const coreModel = model.internalModel?.coreModel;
  if (!coreModel) {
    return;
  }

  for (const parameterId of MOUTH_PARAMETER_IDS) {
    try {
      coreModel.setParameterValueById(parameterId, clampedValue);
    } catch {
      continue;
    }
  }
}

export function setLive2DAudioForLipSync(
  model: Live2DModelInstance,
  audioBinding: Live2DAudioBinding,
) {
  const motionManager = model.internalModel?.motionManager as
    | Live2DMotionManagerLike
    | undefined;
  if (!motionManager) {
    return;
  }

  if (model.internalModel) {
    model.internalModel.lipSync = true;
  }

  motionManager.currentAudio = audioBinding.audioElement || undefined;
  motionManager.currentAnalyzer = audioBinding.analyserNode || undefined;
  motionManager.currentContext = audioBinding.audioContext || undefined;
}

export function makeDraggable(model: Live2DModelInstance) {
  model.buttonMode = true;

  model.on('pointerdown', (event: unknown) => {
    const pointerEvent = event as {
      data: { global: { x: number; y: number } };
    };
    model.dragging = true;
    model._pointerX = pointerEvent.data.global.x - model.x;
    model._pointerY = pointerEvent.data.global.y - model.y;
  });

  model.on('pointermove', (event: unknown) => {
    if (!model.dragging) {
      return;
    }
    const pointerEvent = event as {
      data: { global: { x: number; y: number } };
    };
    model.position.x = pointerEvent.data.global.x - (model._pointerX || 0);
    model.position.y = pointerEvent.data.global.y - (model._pointerY || 0);
  });

  model.on('pointerup', () => {
    model.dragging = false;
  });
  model.on('pointerupoutside', () => {
    model.dragging = false;
  });
}

export function makeZoomable(
  model: Live2DModelInstance,
  canvas: HTMLCanvasElement,
  minScale = 0.1,
  maxScale = 3,
) {
  let currentScale = model.scale.x;
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = -Math.sign(event.deltaY) * 0.08;
    currentScale = Math.max(minScale, Math.min(maxScale, currentScale + delta));
    model.scale.set(currentScale);
  };

  canvas.addEventListener('wheel', handleWheel, { passive: false });
  return () => {
    canvas.removeEventListener('wheel', handleWheel);
  };
}

export function disableAutoFocus(model: Live2DModelInstance) {
  if (model.focusController) {
    model.focusController.enabled = false;
  }

  const modelLike = model as Live2DModelInstance & {
    _autoFocus?: boolean;
    focusing?: boolean;
  };

  modelLike._autoFocus = false;
  modelLike.focusing = false;
  const interactiveModel = model as Live2DModelInstance & {
    off(event: string, fn?: (...args: unknown[]) => void): void;
  };
  interactiveModel.off('pointermove');
  interactiveModel.off('mousemove');
  interactiveModel.off('touchmove');

  const internalModel = model.internalModel;
  if (internalModel?.eyeTracking) {
    internalModel.eyeTracking.enabled = false;
  }
  if (internalModel?.focus) {
    internalModel.focus.enabled = false;
  }
}

export function destroyLive2DModel(model: Live2DModelInstance) {
  try {
    model.destroy({
      children: true,
      texture: true,
      baseTexture: true,
    });
  } catch {
    model.destroy();
  }
}
