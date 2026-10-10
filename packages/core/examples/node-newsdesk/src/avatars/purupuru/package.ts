import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { type Image, loadImage } from '@napi-rs/canvas';

/**
 * Minimal `.purupuru` package reader for Node.js. A package is a ZIP_STORED
 * archive holding `manifest.json`, a PuruPuru PNGTuber `settings.json`, and
 * PNG layers. Only what the renderer needs is loaded: the eight avatar
 * face/hair images, visible item layers, and motion settings.
 *
 * Mirrors `src/lib/purupuruPackage.ts` in the react-purupuru-app example,
 * decoding with `@napi-rs/canvas` instead of browser `Image` elements.
 */

const ZIP_LOCAL_FILE_HEADER_SIG = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIG = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIG = 0x06054b50;
const MAX_PACKAGE_BYTES = 80 * 1024 * 1024;
const MAX_UNZIPPED_BYTES = 120 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 256;
const textDecoder = new TextDecoder('utf-8');

export const AVATAR_KEYS = [
  'backHair',
  'frontHair',
  'eyesOpenMouthClosed',
  'eyesOpenMouthHalf',
  'eyesOpenMouthOpen',
  'eyesClosedMouthClosed',
  'eyesClosedMouthHalf',
  'eyesClosedMouthOpen',
] as const;

export type AvatarImageKey = (typeof AVATAR_KEYS)[number];
export type FaceKey = Exclude<AvatarImageKey, 'backHair' | 'frontHair'>;
export type MouthState = 'closed' | 'half' | 'open';

export type PuruPuruAvatarImages = Record<AvatarImageKey, Image>;

export interface PuruPuruAvatarSettings {
  avatarSize: number;
  avatarX: number;
  avatarY: number;
  breathStrength: number;
  rollStrength: number;
  hairSpring: number;
  sourceImageWidth: number;
  sourceImageHeight: number;
}

export interface PuruPuruItemLayer {
  image: Image;
  name: string;
  slot: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  followStrength: number;
}

export interface PuruPuruAvatarPackage {
  name: string;
  images: PuruPuruAvatarImages;
  itemLayers: PuruPuruItemLayer[];
  settings: PuruPuruAvatarSettings;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

interface PuruPuruManifest {
  format?: string;
  formatVersion?: number;
  settings?: string;
  avatar?: Partial<Record<AvatarImageKey, string>>;
}

interface PuruPuruSettingsPayload {
  type?: string;
  avatarImageSize?: { width?: number; height?: number };
  state?: {
    avatarSize?: number;
    avatarX?: number;
    avatarY?: number;
    breathStrength?: number;
    rollStrength?: number;
    hairSpring?: number;
  };
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

let crc32Table: Uint32Array | null = null;

export async function loadPuruPuruPackage(
  filePath: string,
): Promise<PuruPuruAvatarPackage> {
  const zip = new Uint8Array(await readFile(filePath));
  const entries = readStoredZip(zip);
  const entryMap = new Map(entries.map((entry) => [entry.name, entry.data]));
  const manifest = parseJson<PuruPuruManifest>(entryMap, 'manifest.json');
  if (
    manifest.format !== 'purupuru-avatar-package' ||
    manifest.formatVersion !== 1
  ) {
    throw new Error('Unsupported .purupuru manifest format.');
  }
  const settingsPath = safePath(manifest.settings);
  const payload = parseJson<PuruPuruSettingsPayload>(entryMap, settingsPath);
  if (payload.type !== 'purupuru-pngtuber-settings') {
    throw new Error('settings.json is not a PuruPuru PNGTuber settings file.');
  }
  const images = {} as PuruPuruAvatarImages;
  for (const key of AVATAR_KEYS) {
    const imagePath = manifest.avatar?.[key];
    if (!imagePath) throw new Error(`Missing avatar image path: ${key}.`);
    images[key] = await loadPng(entryMap, safePath(imagePath));
  }
  const itemLayers: PuruPuruItemLayer[] = [];
  for (const layer of payload.itemLayers || []) {
    if (!layer.file || layer.visible === false) continue;
    const imagePath = safePath(layer.file);
    if (!entryMap.has(imagePath)) continue;
    itemLayers.push({
      image: await loadPng(entryMap, imagePath),
      name: layer.name || path.basename(imagePath),
      slot: layer.slot || 'frontHairFront',
      x: finite(layer.x, 0),
      y: finite(layer.y, 0),
      scale: finite(layer.scale, 100),
      rotation: finite(layer.rotation, 0),
      opacity: finite(layer.opacity, 100),
      followStrength: finite(layer.followStrength, 100),
    });
  }
  return {
    name: path.basename(filePath).replace(/\.purupuru$/i, ''),
    images,
    itemLayers,
    settings: normalizeSettings(payload),
  };
}

export function selectFaceKey(
  eyesClosed: boolean,
  mouthState: MouthState,
): FaceKey {
  const eye = eyesClosed ? 'eyesClosed' : 'eyesOpen';
  const mouth =
    mouthState === 'open'
      ? 'MouthOpen'
      : mouthState === 'half'
        ? 'MouthHalf'
        : 'MouthClosed';
  return `${eye}${mouth}`;
}

function normalizeSettings(
  payload: PuruPuruSettingsPayload,
): PuruPuruAvatarSettings {
  const state = payload.state || {};
  return {
    avatarSize: finite(state.avatarSize, 100),
    avatarX: finite(state.avatarX, 0),
    avatarY: finite(state.avatarY, 0),
    breathStrength: finite(state.breathStrength, 16),
    rollStrength: finite(state.rollStrength, 8),
    hairSpring: finite(state.hairSpring, 20),
    sourceImageWidth: finite(payload.avatarImageSize?.width, 0),
    sourceImageHeight: finite(payload.avatarImageSize?.height, 0),
  };
}

async function loadPng(
  entryMap: Map<string, Uint8Array>,
  imagePath: string,
): Promise<Image> {
  const data = entryMap.get(imagePath);
  if (!data) throw new Error(`Missing PNG image: ${imagePath}.`);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    data.length < 8 ||
    !signature.every((byte, index) => data[index] === byte)
  ) {
    throw new Error(`${imagePath} is not a PNG image.`);
  }
  return loadImage(Buffer.from(data));
}

function parseJson<T>(entryMap: Map<string, Uint8Array>, entryPath: string): T {
  const data = entryMap.get(entryPath);
  if (!data) throw new Error(`Missing ${entryPath} in the package.`);
  return JSON.parse(textDecoder.decode(data)) as T;
}

function readStoredZip(zip: Uint8Array): ZipEntry[] {
  if (zip.length > MAX_PACKAGE_BYTES)
    throw new Error('The .purupuru package is larger than 80 MB.');
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocd = findEocd(zip, view);
  if (eocd < 0)
    throw new Error('Invalid ZIP: end of central directory not found.');
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (
    count > MAX_ZIP_ENTRIES ||
    centralOffset + centralSize > zip.length ||
    centralOffset >= eocd
  ) {
    throw new Error('Invalid ZIP central directory.');
  }
  const entries: ZipEntry[] = [];
  let offset = centralOffset;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    if (
      offset + 46 > zip.length ||
      view.getUint32(offset, true) !== ZIP_CENTRAL_DIRECTORY_SIG
    ) {
      throw new Error('Invalid ZIP central directory entry.');
    }
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const expectedCrc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (
      method !== 0 ||
      (flags & 0x08) !== 0 ||
      compressedSize !== uncompressedSize
    ) {
      throw new Error('Only uncompressed ZIP_STORED packages are supported.');
    }
    const nameStart = offset + 46;
    const next = nameStart + nameLength + extraLength + commentLength;
    if (next > zip.length) throw new Error('Invalid ZIP entry name length.');
    const rawName = textDecoder.decode(
      zip.slice(nameStart, nameStart + nameLength),
    );
    offset = next;
    if (rawName.endsWith('/') && uncompressedSize === 0) continue;
    const name = safePath(rawName);
    total += uncompressedSize;
    if (total > MAX_UNZIPPED_BYTES)
      throw new Error('The ZIP package expands beyond 120 MB.');
    const data = readLocalEntry(zip, view, localOffset, name, compressedSize);
    if (crc32(data) !== expectedCrc)
      throw new Error(`CRC32 check failed for ${name}.`);
    entries.push({ name, data });
  }
  return entries;
}

function readLocalEntry(
  zip: Uint8Array,
  view: DataView,
  offset: number,
  name: string,
  size: number,
): Uint8Array {
  if (
    offset + 30 > zip.length ||
    view.getUint32(offset, true) !== ZIP_LOCAL_FILE_HEADER_SIG
  ) {
    throw new Error(`Invalid local ZIP header for ${name}.`);
  }
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const start = offset + 30 + nameLength + extraLength;
  if (start + size > zip.length)
    throw new Error(`Invalid local ZIP data for ${name}.`);
  return zip.slice(start, start + size);
}

function findEocd(zip: Uint8Array, view: DataView): number {
  const min = Math.max(0, zip.length - 22 - 0xffff);
  for (let index = zip.length - 22; index >= min; index -= 1) {
    if (view.getUint32(index, true) === ZIP_END_OF_CENTRAL_DIRECTORY_SIG)
      return index;
  }
  return -1;
}

function crc32(data: Uint8Array): number {
  if (!crc32Table) {
    crc32Table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1)
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      crc32Table[index] = value >>> 0;
    }
  }
  let value = 0xffffffff;
  for (const byte of data)
    value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function safePath(value: unknown): string {
  const raw = String(value || '');
  if (
    !raw ||
    raw.startsWith('/') ||
    raw.includes('\\') ||
    raw.includes(':') ||
    raw.includes('..') ||
    raw.split('/').some((part) => !part || part === '.')
  ) {
    throw new Error(`Invalid package path: ${raw}`);
  }
  return raw;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
