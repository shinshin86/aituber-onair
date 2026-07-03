import {
  INOCHI2D_LOG_PREFIX,
  INOCHI2D_MANIFEST_URL,
  INOCHI2D_MANIFEST_VERSION,
} from './inochi2dConstants';
import type {
  InochiIdleAnimationProfile,
  InochiManifest,
  InochiModelAttribution,
  InochiParameterValueMap,
  ResolvedInochiManifest,
  ResolvedInochiModelDefinition,
  ResolvedInochiParameterDefinition,
} from '../types/inochi2d';

const DEFAULT_PARAMETER_MIN = 0;
const DEFAULT_PARAMETER_MAX = 1;
const DEFAULT_PARAMETER_STEP = 0.01;
const DEFAULT_CUSTOM_MODEL_NAME = 'Custom Inochi2D Model';

export const INOCHI2D_CUSTOM_MODEL_ID = 'custom';

const manifestCache = new Map<string, Promise<ResolvedInochiManifest>>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDocumentBaseUrl = () => {
  if (typeof document !== 'undefined' && document.baseURI) {
    return document.baseURI;
  }
  if (typeof window !== 'undefined') {
    return window.location.href;
  }
  return 'http://localhost/';
};

export const resolveInochiAssetUrl = (value: string, baseUrl?: string) =>
  new URL(value, baseUrl ?? getDocumentBaseUrl()).toString();

const getInochiFileName = (value: string) => {
  try {
    const resolvedUrl = resolveInochiAssetUrl(value);
    const path = new URL(resolvedUrl).pathname;
    const fileName = path.split('/').pop() ?? '';
    return decodeURIComponent(fileName);
  } catch {
    return '';
  }
};

const getCustomInochiModelName = (name: string, modelUrl: string) => {
  const trimmedName = name.trim();
  if (trimmedName.length > 0) {
    return trimmedName;
  }

  const fileName = getInochiFileName(modelUrl);
  if (fileName.length > 0) {
    return fileName.replace(/\.[^/.]+$/, '') || DEFAULT_CUSTOM_MODEL_NAME;
  }

  return DEFAULT_CUSTOM_MODEL_NAME;
};

export const clampInochiParameterValue = (
  value: number,
  parameter?: Pick<
    ResolvedInochiParameterDefinition,
    'min' | 'max' | 'defaultValue'
  >,
) => {
  if (!Number.isFinite(value)) {
    return parameter?.defaultValue ?? DEFAULT_PARAMETER_MIN;
  }
  const min = parameter?.min ?? DEFAULT_PARAMETER_MIN;
  const max = parameter?.max ?? DEFAULT_PARAMETER_MAX;
  return Math.min(max, Math.max(min, value));
};

const normalizeParameter = (
  value: unknown,
): ResolvedInochiParameterDefinition | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0
  ) {
    return null;
  }

  const min =
    typeof value.min === 'number' && Number.isFinite(value.min)
      ? value.min
      : DEFAULT_PARAMETER_MIN;
  const max =
    typeof value.max === 'number' && Number.isFinite(value.max)
      ? value.max
      : DEFAULT_PARAMETER_MAX;
  const rangeMin = Math.min(min, max);
  const rangeMax = Math.max(min, max);

  const defaultValue =
    typeof value.defaultValue === 'number' &&
    Number.isFinite(value.defaultValue)
      ? clampInochiParameterValue(value.defaultValue, {
          min: rangeMin,
          max: rangeMax,
        })
      : undefined;

  return {
    id: value.id,
    label:
      typeof value.label === 'string' && value.label.trim().length > 0
        ? value.label
        : value.id,
    min: rangeMin,
    max: rangeMax,
    step:
      typeof value.step === 'number' &&
      Number.isFinite(value.step) &&
      value.step > 0
        ? value.step
        : DEFAULT_PARAMETER_STEP,
    defaultValue,
  };
};

const normalizeAnimationNames = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const names = value
    .filter((name): name is string => typeof name === 'string')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  return names.length > 0 ? [...new Set(names)] : undefined;
};

const normalizeAnimationGroups = (
  value: unknown,
): Record<string, string[]> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .map(
      ([reactionName, animations]) =>
        [reactionName.trim(), normalizeAnimationNames(animations)] as const,
    )
    .filter(
      (entry): entry is readonly [string, string[]] =>
        entry[0].length > 0 && entry[1] !== undefined,
    );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const normalizeIdleAnimationProfile = (
  value: unknown,
): InochiIdleAnimationProfile | null => {
  if (!isRecord(value)) {
    return null;
  }

  const rawType = value.type;
  const type =
    rawType === 'base' ||
    rawType === 'attention' ||
    rawType === 'emotion' ||
    rawType === 'rareGesture'
      ? rawType
      : undefined;
  const cooldownMs =
    typeof value.cooldownMs === 'number' &&
    Number.isFinite(value.cooldownMs) &&
    value.cooldownMs >= 0
      ? value.cooldownMs
      : undefined;
  const weight =
    typeof value.weight === 'number' &&
    Number.isFinite(value.weight) &&
    value.weight > 0
      ? value.weight
      : undefined;

  const profile = {
    type,
    cooldownMs,
    weight,
  } satisfies InochiIdleAnimationProfile;

  return Object.values(profile).some((field) => field !== undefined)
    ? profile
    : null;
};

const normalizeIdleAnimationProfiles = (
  value: unknown,
): Record<string, InochiIdleAnimationProfile> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .map(
      ([animationName, profile]) =>
        [animationName.trim(), normalizeIdleAnimationProfile(profile)] as const,
    )
    .filter(
      (entry): entry is readonly [string, InochiIdleAnimationProfile] =>
        entry[0].length > 0 && entry[1] !== null,
    );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const normalizeAttributionText = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;

const normalizeAttributionUrl = (value: unknown, manifestUrl: string) => {
  const text = normalizeAttributionText(value);
  return text ? resolveInochiAssetUrl(text, manifestUrl) : undefined;
};

const normalizeModelAttribution = (
  value: unknown,
  manifestUrl: string,
): InochiModelAttribution | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const attribution = {
    title: normalizeAttributionText(value.title),
    author: normalizeAttributionText(value.author),
    license: normalizeAttributionText(value.license),
    licenseUrl: normalizeAttributionUrl(value.licenseUrl, manifestUrl),
    sourceUrl: normalizeAttributionUrl(value.sourceUrl, manifestUrl),
    changes: normalizeAttributionText(value.changes),
  } satisfies InochiModelAttribution;

  return Object.values(attribution).some((field) => field !== undefined)
    ? attribution
    : undefined;
};

const normalizeModel = (
  value: unknown,
  manifestUrl: string,
): ResolvedInochiModelDefinition | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.name !== 'string' ||
    value.name.length === 0 ||
    typeof value.model !== 'string' ||
    value.model.length === 0
  ) {
    return null;
  }

  const parameters = Array.isArray(value.parameters)
    ? value.parameters
        .map((parameter) => normalizeParameter(parameter))
        .filter(
          (parameter): parameter is ResolvedInochiParameterDefinition =>
            parameter !== null,
        )
    : [];

  return {
    id: value.id,
    name: value.name,
    modelUrl: resolveInochiAssetUrl(value.model, manifestUrl),
    motionUrl:
      typeof value.motion === 'string' && value.motion.length > 0
        ? resolveInochiAssetUrl(value.motion, manifestUrl)
        : undefined,
    autoAnimation:
      typeof value.autoAnimation === 'string' &&
      value.autoAnimation.trim().length > 0
        ? value.autoAnimation.trim()
        : undefined,
    idleAnimations: normalizeAnimationNames(value.idleAnimations),
    idleAnimationProfiles: normalizeIdleAnimationProfiles(
      value.idleAnimationProfiles,
    ),
    reactionAnimations: normalizeAnimationGroups(value.reactionAnimations),
    emotionAnimations: normalizeAnimationGroups(value.emotionAnimations),
    attribution: normalizeModelAttribution(value.attribution, manifestUrl),
    thumbnailUrl:
      typeof value.thumbnail === 'string' && value.thumbnail.length > 0
        ? resolveInochiAssetUrl(value.thumbnail, manifestUrl)
        : undefined,
    parameters,
  };
};

const normalizeManifest = (
  value: unknown,
  manifestUrl: string,
): ResolvedInochiManifest => {
  if (!isRecord(value)) {
    throw new Error('Inochi2D manifest must be an object.');
  }

  const version = value.version;
  if (version !== INOCHI2D_MANIFEST_VERSION) {
    throw new Error(
      `Unsupported Inochi2D manifest version: ${String(version)}.`,
    );
  }

  const runtime = value.runtime;
  if (
    !isRecord(runtime) ||
    typeof runtime.bridge !== 'string' ||
    runtime.bridge.length === 0 ||
    typeof runtime.wasm !== 'string' ||
    runtime.wasm.length === 0
  ) {
    throw new Error(
      'Inochi2D manifest runtime.bridge/runtime.wasm are required.',
    );
  }

  const models = Array.isArray(value.models)
    ? value.models
        .map((model) => normalizeModel(model, manifestUrl))
        .filter(
          (model): model is ResolvedInochiModelDefinition => model !== null,
        )
    : [];
  const runtimeMaxDevicePixelRatio = runtime.maxDevicePixelRatio;
  const maxDevicePixelRatio =
    typeof runtimeMaxDevicePixelRatio === 'number' &&
    Number.isFinite(runtimeMaxDevicePixelRatio) &&
    runtimeMaxDevicePixelRatio > 0
      ? runtimeMaxDevicePixelRatio
      : undefined;

  return {
    version,
    manifestUrl,
    runtime: {
      bridgeUrl: resolveInochiAssetUrl(runtime.bridge, manifestUrl),
      wasmUrl: resolveInochiAssetUrl(runtime.wasm, manifestUrl),
      maxDevicePixelRatio,
    },
    defaultModelId:
      typeof value.defaultModelId === 'string' &&
      value.defaultModelId.length > 0
        ? value.defaultModelId
        : undefined,
    models,
  };
};

export const loadInochiManifest = (
  manifestUrl = INOCHI2D_MANIFEST_URL,
): Promise<ResolvedInochiManifest> => {
  const resolvedManifestUrl = resolveInochiAssetUrl(manifestUrl);

  const cached = manifestCache.get(resolvedManifestUrl);
  if (cached) {
    return cached;
  }

  const manifestPromise = fetch(resolvedManifestUrl).then(async (response) => {
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Inochi2D manifest (${response.status} ${response.statusText}).`,
      );
    }

    const manifest = (await response.json()) as InochiManifest;
    return normalizeManifest(manifest, resolvedManifestUrl);
  });

  manifestCache.set(resolvedManifestUrl, manifestPromise);

  return manifestPromise.catch((error) => {
    manifestCache.delete(resolvedManifestUrl);
    console.error(`${INOCHI2D_LOG_PREFIX} manifest load failed`, error);
    throw error;
  });
};

export const resolveInochiModel = (
  manifest: ResolvedInochiManifest,
  requestedModelId?: string | null,
): ResolvedInochiModelDefinition | null => {
  if (requestedModelId) {
    const requestedModel = manifest.models.find(
      (model) => model.id === requestedModelId,
    );
    if (requestedModel) {
      return requestedModel;
    }
  }

  if (manifest.defaultModelId) {
    const defaultModel = manifest.models.find(
      (model) => model.id === manifest.defaultModelId,
    );
    if (defaultModel) {
      return defaultModel;
    }
  }

  return manifest.models[0] ?? null;
};

export const buildCustomInochiModel = ({
  name,
  modelUrl,
}: {
  name: string;
  modelUrl: string;
}): ResolvedInochiModelDefinition | null => {
  const trimmedModelUrl = modelUrl.trim();
  if (trimmedModelUrl.length === 0) {
    return null;
  }

  return {
    id: INOCHI2D_CUSTOM_MODEL_ID,
    name: getCustomInochiModelName(name, trimmedModelUrl),
    modelUrl: resolveInochiAssetUrl(trimmedModelUrl),
    parameters: [],
  };
};

export const mergeCustomInochiModel = (
  manifest: ResolvedInochiManifest,
  customModel?: ResolvedInochiModelDefinition | null,
): ResolvedInochiManifest => {
  if (!customModel) {
    return manifest;
  }

  return {
    ...manifest,
    models: [
      customModel,
      ...manifest.models.filter((model) => model.id !== customModel.id),
    ],
  };
};

export const buildInochiParameterValueMap = (
  model: ResolvedInochiModelDefinition,
  overrides: InochiParameterValueMap = {},
) => {
  const values: InochiParameterValueMap = {};
  const knownParameterIds = new Set<string>();

  for (const parameter of model.parameters) {
    knownParameterIds.add(parameter.id);
    const rawValue =
      overrides[parameter.id] !== undefined
        ? overrides[parameter.id]
        : parameter.defaultValue;
    if (rawValue === undefined) {
      continue;
    }
    values[parameter.id] = clampInochiParameterValue(rawValue, parameter);
  }

  for (const [parameterId, value] of Object.entries(overrides)) {
    if (knownParameterIds.has(parameterId) || !Number.isFinite(value)) {
      continue;
    }
    values[parameterId] = value;
  }

  return values;
};
