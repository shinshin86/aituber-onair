import type { Anime25RigResult } from './rig/anime25Rig';

export const PSD_MOTION_PROFILE_FORMAT =
  'aituber-onair-psd-motion-profile' as const;
export const PSD_MOTION_PROFILE_VERSION = 1 as const;
export const PSD_MOTION_PROFILE_STORAGE_KEY =
  'react-psd-app-psd-motion-profiles-v1';
export const PSD_MOTION_PROFILE_MAX_JSON_BYTES = 64 * 1024;

const PSD_MOTION_PROFILE_STORE_FORMAT =
  'aituber-onair-psd-motion-profile-store' as const;
const PSD_MOTION_PROFILE_STORE_VERSION = 1 as const;

export interface PsdMotionParameters {
  angleX: number;
  angleY: number;
  angleZ: number;
  body: number;
  armY: number;
  armPos: number;
  eyeOpenL: number;
  eyeOpenR: number;
  eyeX: number;
  eyeY: number;
  irisScale: number;
  eyeEase: number;
  eyeCY: number;
  eyeCAng: number;
  eyeScaleL: number;
  eyeScaleR: number;
  brow: number;
  browAngL: number;
  browAngR: number;
  browAngSym: number;
  mouthOpen: number;
  mouthForm: number;
  mouthCY: number;
  mouthEase: number;
  mouthCAng: number;
  mouthScale: number;
  physAmp: number;
  soft: number;
  fhAmp: number;
  fhSoft: number;
  bangL: number;
  bangC: number;
  bangR: number;
  bust: number;
  bustY: number;
}

export type PsdMotionParameterName = keyof PsdMotionParameters;
export type PsdMotionParameterGroup = 'face' | 'eyes' | 'mouth' | 'physics';

export interface PsdMotionParameterDefinition {
  key: PsdMotionParameterName;
  label: string;
  group: PsdMotionParameterGroup;
  min: number;
  max: number;
  step: number;
}

export const PSD_MOTION_PARAMETER_DEFINITIONS: readonly PsdMotionParameterDefinition[] =
  [
    {
      key: 'angleX',
      label: 'Angle X',
      group: 'face',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'angleY',
      label: 'Angle Y',
      group: 'face',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'angleZ',
      label: 'Angle Z',
      group: 'face',
      min: -1,
      max: 1,
      step: 0.01,
    },
    { key: 'body', label: 'Body', group: 'face', min: -1, max: 1, step: 0.01 },
    { key: 'armY', label: 'Arm Y', group: 'face', min: -1, max: 1, step: 0.01 },
    {
      key: 'armPos',
      label: 'Arm position',
      group: 'face',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'eyeOpenL',
      label: 'Left eye open',
      group: 'eyes',
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      key: 'eyeOpenR',
      label: 'Right eye open',
      group: 'eyes',
      min: 0,
      max: 1,
      step: 0.01,
    },
    { key: 'eyeX', label: 'Eye X', group: 'eyes', min: -1, max: 1, step: 0.01 },
    { key: 'eyeY', label: 'Eye Y', group: 'eyes', min: -1, max: 1, step: 0.01 },
    {
      key: 'irisScale',
      label: 'Iris scale',
      group: 'eyes',
      min: 0.5,
      max: 1.3,
      step: 0.01,
    },
    {
      key: 'eyeEase',
      label: 'Eye easing',
      group: 'eyes',
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      key: 'eyeCY',
      label: 'Eye center Y',
      group: 'eyes',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'eyeCAng',
      label: 'Eye angle',
      group: 'eyes',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'eyeScaleL',
      label: 'Left eye scale',
      group: 'eyes',
      min: 0.5,
      max: 1.5,
      step: 0.01,
    },
    {
      key: 'eyeScaleR',
      label: 'Right eye scale',
      group: 'eyes',
      min: 0.5,
      max: 1.5,
      step: 0.01,
    },
    {
      key: 'brow',
      label: 'Brow height',
      group: 'eyes',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'browAngL',
      label: 'Left brow angle',
      group: 'eyes',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'browAngR',
      label: 'Right brow angle',
      group: 'eyes',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'browAngSym',
      label: 'Brow symmetric angle',
      group: 'eyes',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'mouthOpen',
      label: 'Mouth open baseline',
      group: 'mouth',
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      key: 'mouthForm',
      label: 'Mouth form',
      group: 'mouth',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'mouthCY',
      label: 'Mouth center Y',
      group: 'mouth',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'mouthEase',
      label: 'Mouth easing',
      group: 'mouth',
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      key: 'mouthCAng',
      label: 'Mouth angle',
      group: 'mouth',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'mouthScale',
      label: 'Mouth scale',
      group: 'mouth',
      min: 0.5,
      max: 1.5,
      step: 0.01,
    },
    {
      key: 'physAmp',
      label: 'Hair physics amplitude',
      group: 'physics',
      min: 0,
      max: 3,
      step: 0.05,
    },
    {
      key: 'soft',
      label: 'Hair softness',
      group: 'physics',
      min: 0,
      max: 3,
      step: 0.05,
    },
    {
      key: 'fhAmp',
      label: 'Front hair amplitude',
      group: 'physics',
      min: 0,
      max: 3,
      step: 0.05,
    },
    {
      key: 'fhSoft',
      label: 'Front hair softness',
      group: 'physics',
      min: 0,
      max: 2,
      step: 0.05,
    },
    {
      key: 'bangL',
      label: 'Left bang',
      group: 'physics',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'bangC',
      label: 'Center bang',
      group: 'physics',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'bangR',
      label: 'Right bang',
      group: 'physics',
      min: -1,
      max: 1,
      step: 0.01,
    },
    {
      key: 'bust',
      label: 'Bust physics',
      group: 'physics',
      min: 0,
      max: 4,
      step: 0.05,
    },
    {
      key: 'bustY',
      label: 'Bust center Y',
      group: 'physics',
      min: -3,
      max: 3,
      step: 0.05,
    },
  ];

export const DEFAULT_PSD_MOTION_PARAMETERS: Readonly<PsdMotionParameters> = {
  angleX: 0,
  angleY: 0,
  angleZ: 0,
  body: 0,
  armY: 0,
  armPos: 0,
  eyeOpenL: 1,
  eyeOpenR: 1,
  eyeX: 0,
  eyeY: 0,
  irisScale: 1,
  eyeEase: 0.3,
  eyeCY: 0,
  eyeCAng: 0,
  eyeScaleL: 1,
  eyeScaleR: 1,
  brow: 0,
  browAngL: 0,
  browAngR: 0,
  browAngSym: 0,
  mouthOpen: 0,
  mouthForm: 0,
  mouthCY: 0,
  mouthEase: 0.45,
  mouthCAng: 0,
  mouthScale: 1,
  physAmp: 2,
  soft: 2,
  fhAmp: 2,
  fhSoft: 0.4,
  bangL: 0,
  bangC: 0,
  bangR: 0,
  bust: 2.5,
  bustY: 1,
};

export interface PsdMotionAutomation {
  idle: boolean;
  randomMotion: boolean;
  blink: boolean;
  physics: boolean;
}

export const DEFAULT_PSD_MOTION_AUTOMATION: Readonly<PsdMotionAutomation> = {
  idle: true,
  randomMotion: true,
  blink: true,
  physics: true,
};

export interface PsdMotionProfile {
  parameters: PsdMotionParameters;
  automation: PsdMotionAutomation;
}

export interface PsdMotionModelIdentity {
  sha256: string;
  width: number;
  height: number;
  layerSignature: string;
  fileNameHint?: string;
}

export interface PsdMotionProfileFile {
  format: typeof PSD_MOTION_PROFILE_FORMAT;
  version: typeof PSD_MOTION_PROFILE_VERSION;
  exportedAt: string;
  model: PsdMotionModelIdentity;
  parameters: PsdMotionParameters;
  automation: PsdMotionAutomation;
}

interface PsdMotionProfileStoreFile {
  format: typeof PSD_MOTION_PROFILE_STORE_FORMAT;
  version: typeof PSD_MOTION_PROFILE_STORE_VERSION;
  profiles: Record<string, PsdMotionProfile>;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface PsdMotionProfileStorageResult {
  ok: boolean;
  found: boolean;
  profile: PsdMotionProfile;
  error?: string;
}

export type PsdMotionProfileCompatibility =
  | { status: 'exact'; message: string }
  | { status: 'matching-layout'; message: string }
  | { status: 'incompatible'; message: string };

export type PsdMotionProfileParseResult =
  | { ok: true; file: PsdMotionProfileFile }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback;
}

export function normalizePsdMotionParameters(
  value: unknown,
): PsdMotionParameters {
  const source = isRecord(value) ? value : {};
  const parameters = { ...DEFAULT_PSD_MOTION_PARAMETERS };
  for (const definition of PSD_MOTION_PARAMETER_DEFINITIONS) {
    parameters[definition.key] = normalizedNumber(
      source[definition.key],
      DEFAULT_PSD_MOTION_PARAMETERS[definition.key],
      definition.min,
      definition.max,
    );
  }
  return parameters;
}

export function normalizePsdMotionAutomation(
  value: unknown,
): PsdMotionAutomation {
  const source = isRecord(value) ? value : {};
  return {
    idle:
      typeof source.idle === 'boolean'
        ? source.idle
        : DEFAULT_PSD_MOTION_AUTOMATION.idle,
    randomMotion:
      typeof source.randomMotion === 'boolean'
        ? source.randomMotion
        : DEFAULT_PSD_MOTION_AUTOMATION.randomMotion,
    blink:
      typeof source.blink === 'boolean'
        ? source.blink
        : DEFAULT_PSD_MOTION_AUTOMATION.blink,
    physics:
      typeof source.physics === 'boolean'
        ? source.physics
        : DEFAULT_PSD_MOTION_AUTOMATION.physics,
  };
}

export function normalizePsdMotionProfile(value: unknown): PsdMotionProfile {
  const source = isRecord(value) ? value : {};
  return {
    parameters: normalizePsdMotionParameters(source.parameters),
    automation: normalizePsdMotionAutomation(source.automation),
  };
}

export function createDefaultPsdMotionProfile(): PsdMotionProfile {
  return normalizePsdMotionProfile({});
}

export function createPsdMotionProfileRuntime(initial?: unknown) {
  let profile = normalizePsdMotionProfile(initial);
  return {
    getProfile(): PsdMotionProfile {
      return profile;
    },
    setMotionProfile(value: unknown): void {
      profile = normalizePsdMotionProfile(value);
    },
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export async function sha256Hex(
  value: ArrayBuffer | Uint8Array,
  subtle: SubtleCrypto = globalThis.crypto.subtle,
): Promise<string> {
  const input = value instanceof Uint8Array ? value.slice().buffer : value;
  return bytesToHex(new Uint8Array(await subtle.digest('SHA-256', input)));
}

export function normalizePsdLayerNameForSignature(name: string): string {
  return name
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
}

function approximateBound(value: number | undefined): number {
  return Number.isFinite(value) ? Math.round(value || 0) : 0;
}

export function buildPsdLayerSignaturePayload(rig: Anime25RigResult): string {
  const layers = rig.layers.map((layer, index) =>
    [
      index,
      normalizePsdLayerNameForSignature(layer.name),
      approximateBound(layer.x),
      approximateBound(layer.y),
      approximateBound(layer.w),
      approximateBound(layer.h),
    ].join(':'),
  );
  return [`canvas:${rig.canvas.w}x${rig.canvas.h}`, ...layers].join('\n');
}

export async function createPsdLayerSignature(
  rig: Anime25RigResult,
  subtle?: SubtleCrypto,
): Promise<string> {
  const payload = new TextEncoder().encode(buildPsdLayerSignaturePayload(rig));
  return sha256Hex(payload, subtle);
}

export function sanitizePsdFileNameHint(value: string): string {
  return value.split(/[\\/]/).at(-1)?.trim() || 'avatar.psd';
}

export function createPsdMotionProfileFile(
  identity: PsdMotionModelIdentity,
  profile: PsdMotionProfile,
  exportedAt = new Date(),
): PsdMotionProfileFile {
  const normalized = normalizePsdMotionProfile(profile);
  const fileNameHint = identity.fileNameHint
    ? sanitizePsdFileNameHint(identity.fileNameHint)
    : undefined;
  return {
    format: PSD_MOTION_PROFILE_FORMAT,
    version: PSD_MOTION_PROFILE_VERSION,
    exportedAt: exportedAt.toISOString(),
    model: {
      sha256: identity.sha256.toLowerCase(),
      width: identity.width,
      height: identity.height,
      layerSignature: identity.layerSignature,
      ...(fileNameHint ? { fileNameHint } : {}),
    },
    parameters: normalized.parameters,
    automation: normalized.automation,
  };
}

export function serializePsdMotionProfileFile(
  file: PsdMotionProfileFile,
): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

function readModelIdentity(value: unknown): PsdMotionModelIdentity | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.sha256 !== 'string' ||
    !/^[a-f\d]{64}$/i.test(value.sha256) ||
    typeof value.width !== 'number' ||
    !Number.isSafeInteger(value.width) ||
    value.width <= 0 ||
    typeof value.height !== 'number' ||
    !Number.isSafeInteger(value.height) ||
    value.height <= 0 ||
    typeof value.layerSignature !== 'string' ||
    value.layerSignature.length === 0 ||
    value.layerSignature.length > 256
  ) {
    return null;
  }

  const fileNameHint =
    typeof value.fileNameHint === 'string'
      ? sanitizePsdFileNameHint(value.fileNameHint)
      : undefined;
  return {
    sha256: value.sha256.toLowerCase(),
    width: value.width,
    height: value.height,
    layerSignature: value.layerSignature,
    ...(fileNameHint ? { fileNameHint } : {}),
  };
}

export function parsePsdMotionProfileJson(
  json: string,
): PsdMotionProfileParseResult {
  if (
    new TextEncoder().encode(json).byteLength >
    PSD_MOTION_PROFILE_MAX_JSON_BYTES
  ) {
    return {
      ok: false,
      error: `JSON file exceeds the ${PSD_MOTION_PROFILE_MAX_JSON_BYTES / 1024} KB limit.`,
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, error: 'The selected file is not valid JSON.' };
  }
  if (!isRecord(value)) {
    return { ok: false, error: 'The motion profile must be a JSON object.' };
  }
  if (value.format !== PSD_MOTION_PROFILE_FORMAT) {
    return { ok: false, error: 'Invalid motion profile format.' };
  }
  if (value.version !== PSD_MOTION_PROFILE_VERSION) {
    return { ok: false, error: 'Unsupported motion profile version.' };
  }
  if (
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt))
  ) {
    return { ok: false, error: 'Invalid motion profile export timestamp.' };
  }
  const model = readModelIdentity(value.model);
  if (!model) {
    return { ok: false, error: 'Invalid PSD identity in the motion profile.' };
  }
  if (!isRecord(value.parameters) || !isRecord(value.automation)) {
    return { ok: false, error: 'Invalid motion profile settings.' };
  }

  const profile = normalizePsdMotionProfile(value);
  return {
    ok: true,
    file: {
      format: PSD_MOTION_PROFILE_FORMAT,
      version: PSD_MOTION_PROFILE_VERSION,
      exportedAt: value.exportedAt,
      model,
      parameters: profile.parameters,
      automation: profile.automation,
    },
  };
}

export function assessPsdMotionProfileCompatibility(
  file: PsdMotionProfileFile,
  current: PsdMotionModelIdentity,
): PsdMotionProfileCompatibility {
  if (file.model.sha256 === current.sha256.toLowerCase()) {
    return { status: 'exact', message: 'The PSD SHA-256 matches.' };
  }
  if (
    file.model.width === current.width &&
    file.model.height === current.height &&
    file.model.layerSignature === current.layerSignature
  ) {
    return {
      status: 'matching-layout',
      message: 'This is a different PSD file, but its layer layout matches.',
    };
  }
  return {
    status: 'incompatible',
    message: 'The canvas or layer layout does not match the current PSD.',
  };
}

function emptyStore(): PsdMotionProfileStoreFile {
  return {
    format: PSD_MOTION_PROFILE_STORE_FORMAT,
    version: PSD_MOTION_PROFILE_STORE_VERSION,
    profiles: {},
  };
}

function parseStore(value: string | null): PsdMotionProfileStoreFile | null {
  if (!value) return emptyStore();
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (
    !isRecord(parsed) ||
    parsed.format !== PSD_MOTION_PROFILE_STORE_FORMAT ||
    parsed.version !== PSD_MOTION_PROFILE_STORE_VERSION ||
    !isRecord(parsed.profiles)
  ) {
    return null;
  }

  const profiles: Record<string, PsdMotionProfile> = {};
  for (const [sha256, profile] of Object.entries(parsed.profiles)) {
    if (/^[a-f\d]{64}$/i.test(sha256)) {
      profiles[sha256.toLowerCase()] = normalizePsdMotionProfile(profile);
    }
  }
  return { ...emptyStore(), profiles };
}

export function readStoredPsdMotionProfile(
  storage: StorageLike | null,
  sha256: string,
): PsdMotionProfileStorageResult {
  if (!storage) {
    return {
      ok: false,
      found: false,
      profile: createDefaultPsdMotionProfile(),
      error: 'localStorage is not available.',
    };
  }
  try {
    const store = parseStore(storage.getItem(PSD_MOTION_PROFILE_STORAGE_KEY));
    if (!store) {
      return {
        ok: false,
        found: false,
        profile: createDefaultPsdMotionProfile(),
        error: 'Saved motion profile data is invalid.',
      };
    }
    const profile = store.profiles[sha256.toLowerCase()];
    return {
      ok: true,
      found: Boolean(profile),
      profile: profile
        ? normalizePsdMotionProfile(profile)
        : createDefaultPsdMotionProfile(),
    };
  } catch {
    return {
      ok: false,
      found: false,
      profile: createDefaultPsdMotionProfile(),
      error: 'Could not read the saved motion profile.',
    };
  }
}

export function saveStoredPsdMotionProfile(
  storage: StorageLike | null,
  sha256: string,
  profile: PsdMotionProfile,
): { ok: boolean; error?: string } {
  if (!storage) return { ok: false, error: 'localStorage is not available.' };
  try {
    const store =
      parseStore(storage.getItem(PSD_MOTION_PROFILE_STORAGE_KEY)) ||
      emptyStore();
    store.profiles[sha256.toLowerCase()] = normalizePsdMotionProfile(profile);
    storage.setItem(PSD_MOTION_PROFILE_STORAGE_KEY, JSON.stringify(store));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save the motion profile.' };
  }
}

export function deleteStoredPsdMotionProfile(
  storage: StorageLike | null,
  sha256: string,
): { ok: boolean; error?: string } {
  if (!storage) return { ok: false, error: 'localStorage is not available.' };
  try {
    const store =
      parseStore(storage.getItem(PSD_MOTION_PROFILE_STORAGE_KEY)) ||
      emptyStore();
    delete store.profiles[sha256.toLowerCase()];
    storage.setItem(PSD_MOTION_PROFILE_STORAGE_KEY, JSON.stringify(store));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not delete the motion profile.' };
  }
}

export function getPsdMotionProfileExportFileName(
  fileNameHint: string,
): string {
  const name = sanitizePsdFileNameHint(fileNameHint).replace(/\.psd$/i, '');
  return `${name || 'avatar'}.motion.json`;
}
