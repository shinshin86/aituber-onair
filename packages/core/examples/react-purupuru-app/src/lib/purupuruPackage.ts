export type PuruPuruEyeState = 'open' | 'closed';
export type PuruPuruMouthState = 'closed' | 'half' | 'open';

export type PuruPuruFaceKey =
  | 'eyesOpenMouthClosed'
  | 'eyesOpenMouthHalf'
  | 'eyesOpenMouthOpen'
  | 'eyesClosedMouthClosed'
  | 'eyesClosedMouthHalf'
  | 'eyesClosedMouthOpen';

export interface PuruPuruAvatarImages {
  backHair: HTMLImageElement;
  frontHair: HTMLImageElement;
  eyesOpenMouthClosed: HTMLImageElement;
  eyesOpenMouthHalf: HTMLImageElement;
  eyesOpenMouthOpen: HTMLImageElement;
  eyesClosedMouthClosed: HTMLImageElement;
  eyesClosedMouthHalf: HTMLImageElement;
  eyesClosedMouthOpen: HTMLImageElement;
}

export interface PuruPuruAvatarSettings {
  avatarSize: number;
  avatarX: number;
  avatarY: number;
  breathStrength: number;
  rollStrength: number;
  hairSpring: number;
  idleMotionEnabled: boolean;
  bgColor?: string;
  sourceImageWidth?: number;
  sourceImageHeight?: number;
}

export interface PuruPuruItemLayer {
  image: HTMLImageElement;
  name: string;
  slot: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  followStrength: number;
  visible: boolean;
}

export interface PuruPuruAvatarPackage {
  name: string;
  thumbnailUrl: string | null;
  images: PuruPuruAvatarImages;
  settings: PuruPuruAvatarSettings;
  itemLayers: PuruPuruItemLayer[];
  dispose: () => void;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

interface PuruPuruManifest {
  format: string;
  formatVersion: number;
  settings: string;
  thumbnail?: string;
  avatar: Record<string, string>;
}

interface PuruPuruSettingsPayload {
  type?: string;
  version?: number;
  avatarImageSize?: {
    width?: number;
    height?: number;
  };
  state?: Partial<PuruPuruAvatarSettings>;
  itemLayers?: Array<{
    name?: string;
    file?: string;
    slot?: string;
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
    opacity?: number;
    followStrength?: number;
    visible?: boolean;
  }>;
}

const ZIP_LOCAL_FILE_HEADER_SIG = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIG = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIG = 0x06054b50;
const ZIP_STORE_METHOD = 0;
const ZIP_DATA_DESCRIPTOR_FLAG = 0x08;
const MAX_PACKAGE_BYTES = 80 * 1024 * 1024;
const MAX_UNZIPPED_BYTES = 120 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 256;

const AVATAR_KEYS = [
  'backHair',
  'frontHair',
  'eyesOpenMouthClosed',
  'eyesOpenMouthHalf',
  'eyesOpenMouthOpen',
  'eyesClosedMouthClosed',
  'eyesClosedMouthHalf',
  'eyesClosedMouthOpen',
] as const;

const FACE_KEYS = [
  'eyesOpenMouthClosed',
  'eyesOpenMouthHalf',
  'eyesOpenMouthOpen',
  'eyesClosedMouthClosed',
  'eyesClosedMouthHalf',
  'eyesClosedMouthOpen',
] as const;

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const textDecoder = new TextDecoder('utf-8', { fatal: false });

let crc32Table: Uint32Array | null = null;

export async function loadPuruPuruPackage(
  file: File,
): Promise<PuruPuruAvatarPackage> {
  if (file.size > MAX_PACKAGE_BYTES) {
    throw new Error('The .purupuru package is larger than 80 MB.');
  }

  const entries = readStoredZip(new Uint8Array(await file.arrayBuffer()));
  const entryMap = new Map(entries.map((entry) => [entry.name, entry.data]));
  const urls: string[] = [];

  try {
    const manifest = parseJsonEntry<PuruPuruManifest>(entryMap, 'manifest.json');
    validateManifest(manifest);

    const settingsPath = assertSafePackagePath(manifest.settings);
    const settingsPayload = parseJsonEntry<PuruPuruSettingsPayload>(
      entryMap,
      settingsPath,
    );
    if (settingsPayload.type !== 'purupuru-pngtuber-settings') {
      throw new Error('settings.json is not a PuruPuru PNGTuber settings file.');
    }

    const images = {} as PuruPuruAvatarImages;
    for (const key of AVATAR_KEYS) {
      const path = assertSafePackagePath(manifest.avatar[key]);
      images[key] = await loadPngImage(entryMap, path, urls);
    }

    const itemLayers = await loadItemLayers(settingsPayload, entryMap, urls);
    const thumbnailUrl = loadOptionalThumbnail(manifest, entryMap, urls);
    const name = file.name.replace(/\.purupuru$/i, '') || 'PuruPuru Avatar';

    return {
      name,
      thumbnailUrl,
      images,
      settings: normalizeSettings(settingsPayload),
      itemLayers,
      dispose: () => {
        for (const url of urls) {
          URL.revokeObjectURL(url);
        }
      },
    };
  } catch (error) {
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
    throw error;
  }
}

export function selectFaceKey(
  eyeState: PuruPuruEyeState,
  mouthState: PuruPuruMouthState,
): PuruPuruFaceKey {
  if (eyeState === 'closed') {
    if (mouthState === 'open') return 'eyesClosedMouthOpen';
    if (mouthState === 'half') return 'eyesClosedMouthHalf';
    return 'eyesClosedMouthClosed';
  }
  if (mouthState === 'open') return 'eyesOpenMouthOpen';
  if (mouthState === 'half') return 'eyesOpenMouthHalf';
  return 'eyesOpenMouthClosed';
}

function readStoredZip(zipU8: Uint8Array): ZipEntry[] {
  if (zipU8.length > MAX_PACKAGE_BYTES) {
    throw new Error('The ZIP package is larger than 80 MB.');
  }

  const view = new DataView(zipU8.buffer, zipU8.byteOffset, zipU8.byteLength);
  const eocdOffset = findZipEndOfCentralDirectory(zipU8);
  if (eocdOffset < 0) {
    throw new Error('Invalid ZIP: end of central directory not found.');
  }

  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralSize = view.getUint32(eocdOffset + 12, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);

  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new Error('The ZIP package contains too many entries.');
  }
  if (
    centralOffset + centralSize > zipU8.length ||
    centralOffset >= eocdOffset
  ) {
    throw new Error('Invalid ZIP central directory.');
  }

  const entries: ZipEntry[] = [];
  let offset = centralOffset;
  let totalUnzipped = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > zipU8.length) {
      throw new Error('Invalid ZIP central directory entry.');
    }
    if (view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_SIG) {
      throw new Error('Invalid ZIP central directory signature.');
    }

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const expectedCrc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);

    if (method !== ZIP_STORE_METHOD) {
      throw new Error('Only uncompressed ZIP_STORED packages are supported.');
    }
    if ((flags & ZIP_DATA_DESCRIPTOR_FLAG) !== 0) {
      throw new Error('ZIP data descriptors are not supported.');
    }
    if (compressedSize !== uncompressedSize) {
      throw new Error('Invalid stored ZIP entry sizes.');
    }

    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    const nextOffset = nameEnd + extraLength + commentLength;
    if (nextOffset > zipU8.length) {
      throw new Error('Invalid ZIP entry name length.');
    }

    const rawName = textDecoder.decode(zipU8.slice(nameStart, nameEnd));
    if (rawName.endsWith('/') && uncompressedSize === 0) {
      offset = nextOffset;
      continue;
    }

    const name = assertSafePackagePath(rawName);
    totalUnzipped += uncompressedSize;
    if (totalUnzipped > MAX_UNZIPPED_BYTES) {
      throw new Error('The ZIP package expands beyond 120 MB.');
    }

    const data = readLocalStoredEntry(
      zipU8,
      view,
      localHeaderOffset,
      name,
      compressedSize,
    );
    if (crc32(data) !== expectedCrc) {
      throw new Error(`CRC32 check failed for ${name}.`);
    }

    entries.push({ name, data });
    offset = nextOffset;
  }

  return entries;
}

function readLocalStoredEntry(
  zipU8: Uint8Array,
  view: DataView,
  localHeaderOffset: number,
  expectedName: string,
  compressedSize: number,
): Uint8Array {
  if (
    localHeaderOffset + 30 > zipU8.length ||
    view.getUint32(localHeaderOffset, true) !== ZIP_LOCAL_FILE_HEADER_SIG
  ) {
    throw new Error(`Invalid local ZIP header for ${expectedName}.`);
  }

  const nameLength = view.getUint16(localHeaderOffset + 26, true);
  const extraLength = view.getUint16(localHeaderOffset + 28, true);
  const dataStart = localHeaderOffset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + compressedSize;
  if (dataEnd > zipU8.length) {
    throw new Error(`Invalid local ZIP data for ${expectedName}.`);
  }

  return zipU8.slice(dataStart, dataEnd);
}

function findZipEndOfCentralDirectory(zipU8: Uint8Array): number {
  const min = Math.max(0, zipU8.length - 22 - 0xffff);
  const view = new DataView(zipU8.buffer, zipU8.byteOffset, zipU8.byteLength);
  for (let index = zipU8.length - 22; index >= min; index -= 1) {
    if (view.getUint32(index, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIG) {
      return index;
    }
  }
  return -1;
}

function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table;
  crc32Table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    crc32Table[index] = value >>> 0;
  }
  return crc32Table;
}

function crc32(u8: Uint8Array): number {
  const table = getCrc32Table();
  let value = 0xffffffff;
  for (let index = 0; index < u8.length; index += 1) {
    value = table[(value ^ u8[index]) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function assertSafePackagePath(path: unknown): string {
  const raw = String(path || '');
  if (
    !raw ||
    raw.startsWith('/') ||
    raw.includes('\\') ||
    raw.includes(':') ||
    raw.includes('..') ||
    raw.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`Invalid package path: ${raw}`);
  }
  return raw;
}

function parseJsonEntry<T>(entryMap: Map<string, Uint8Array>, path: string): T {
  const data = entryMap.get(path);
  if (!data) {
    throw new Error(`Missing ${path} in the package.`);
  }
  return JSON.parse(textDecoder.decode(data)) as T;
}

function validateManifest(manifest: PuruPuruManifest): void {
  if (
    manifest.format !== 'purupuru-avatar-package' ||
    manifest.formatVersion !== 1
  ) {
    throw new Error('Unsupported .purupuru manifest format.');
  }
  for (const key of AVATAR_KEYS) {
    if (!manifest.avatar?.[key]) {
      throw new Error(`Missing avatar image path: ${key}.`);
    }
  }
}

async function loadPngImage(
  entryMap: Map<string, Uint8Array>,
  path: string,
  urls: string[],
): Promise<HTMLImageElement> {
  const data = entryMap.get(path);
  if (!data) {
    throw new Error(`Missing PNG image: ${path}.`);
  }
  assertPng(data, path);

  const blob = new Blob([copyToArrayBuffer(data)], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  urls.push(url);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to decode PNG: ${path}.`));
    image.src = url;
  });
}

function loadOptionalThumbnail(
  manifest: PuruPuruManifest,
  entryMap: Map<string, Uint8Array>,
  urls: string[],
): string | null {
  if (!manifest.thumbnail) return null;
  const path = assertSafePackagePath(manifest.thumbnail);
  const data = entryMap.get(path);
  if (!data) return null;
  assertPng(data, path);

  const url = URL.createObjectURL(
    new Blob([copyToArrayBuffer(data)], { type: 'image/png' }),
  );
  urls.push(url);
  return url;
}

async function loadItemLayers(
  settingsPayload: PuruPuruSettingsPayload,
  entryMap: Map<string, Uint8Array>,
  urls: string[],
): Promise<PuruPuruItemLayer[]> {
  const layers = settingsPayload.itemLayers || [];
  const loadedLayers: PuruPuruItemLayer[] = [];

  for (const layer of layers) {
    if (!layer.file || layer.visible === false) continue;
    const path = assertSafePackagePath(layer.file);
    if (!entryMap.has(path)) continue;

    loadedLayers.push({
      image: await loadPngImage(entryMap, path, urls),
      name: layer.name || path.split('/').at(-1) || 'item.png',
      slot: layer.slot || 'frontHairFront',
      x: numberOrDefault(layer.x, 0),
      y: numberOrDefault(layer.y, 0),
      scale: numberOrDefault(layer.scale, 100),
      rotation: numberOrDefault(layer.rotation, 0),
      opacity: numberOrDefault(layer.opacity, 100),
      followStrength: numberOrDefault(layer.followStrength, 100),
      visible: true,
    });
  }

  return loadedLayers;
}

function normalizeSettings(
  settingsPayload: PuruPuruSettingsPayload,
): PuruPuruAvatarSettings {
  const state = settingsPayload.state || {};
  return {
    avatarSize: numberOrDefault(state.avatarSize, 100),
    avatarX: numberOrDefault(state.avatarX, 0),
    avatarY: numberOrDefault(state.avatarY, 0),
    breathStrength: numberOrDefault(state.breathStrength, 16),
    rollStrength: numberOrDefault(state.rollStrength, 8),
    hairSpring: numberOrDefault(state.hairSpring, 20),
    idleMotionEnabled: state.idleMotionEnabled !== false,
    bgColor: typeof state.bgColor === 'string' ? state.bgColor : undefined,
    sourceImageWidth: numberOrDefault(settingsPayload.avatarImageSize?.width, 0),
    sourceImageHeight: numberOrDefault(
      settingsPayload.avatarImageSize?.height,
      0,
    ),
  };
}

function assertPng(data: Uint8Array, path: string): void {
  if (
    data.length < pngSignature.length ||
    !pngSignature.every((byte, index) => data[index] === byte)
  ) {
    throw new Error(`${path} is not a PNG image.`);
  }
}

function copyToArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export const puruPuruFaceKeys = FACE_KEYS;
