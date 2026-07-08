/*!
 * Based on Anime2.5DRig (https://github.com/852wa/Anime2.5DRig)
 * by 852wa (hakoniwa), MIT License.
 */
import { readPsd } from 'ag-psd';

export interface Anime25RigLayer {
  name: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  z?: number;
  depth?: number;
  group?: string;
  phys?: string | null;
  fade?: string | null;
  side?: string | null;
  strands?: { x: number; rootY: number; tipY: number }[] | null;
  synthetic?: boolean;
  img?: {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  };
}

export interface Anime25RigResult {
  canvas: { w: number; h: number };
  layers: Anime25RigLayer[];
  anchors: Record<string, unknown>;
  warnings: string[];
  synth?: {
    eye?: boolean;
    mouth?: boolean;
  };
}

export interface Anime25Rigger {
  buildRig: (psd: unknown, opts?: unknown) => Anime25RigResult;
  cleanPsdLayers: (psd: unknown) => { noisy: number; layers: number };
  normName: (name: string) => string;
  baseName: (name: string) => string;
}

export interface Anime25RigSummary {
  canvasWidth: number;
  canvasHeight: number;
  layerCount: number;
  anchorCount: number;
  strandCount: number;
  partsFound: string[];
  missingRequiredParts: string[];
  warnings: string[];
  preprocessed: {
    noisy: number;
    layers: number;
  };
}

export interface Anime25RigDetection {
  mode: 'motion' | 'static';
  usable: boolean;
  rig: Anime25RigResult | null;
  summary: Anime25RigSummary | null;
  reason: string;
}

declare global {
  interface Window {
    Rigger?: Anime25Rigger;
  }

  var Rigger: Anime25Rigger | undefined;
}

const REQUIRED_PARTS = [
  'face',
  'eyewhite',
  'irides',
  'eyelash',
  'mouth_open',
];
const REQUIRED_ANCHORS = ['face', 'eyeL', 'eyeR', 'mouth'];

function getRigger(): Anime25Rigger | null {
  return globalThis.Rigger || null;
}

export function normalizeRigLayerName(
  rigger: Pick<Anime25Rigger, 'baseName'>,
  name: string,
): string {
  return rigger.baseName(name.replace(/_(l|r)$/i, ''));
}

export function summarizeAnime25Rig(
  rig: Anime25RigResult,
  rigger: Pick<Anime25Rigger, 'baseName'>,
  preprocessed: { noisy: number; layers: number },
): Anime25RigSummary {
  const partsFound = [
    ...new Set(
      rig.layers
        .map((layer) => normalizeRigLayerName(rigger, layer.name))
        .sort(),
    ),
  ];
  const parts = new Set(partsFound);
  const missingRequiredParts = REQUIRED_PARTS.filter((part) => !parts.has(part));
  const hasHair = parts.has('front hair') || parts.has('back hair');

  if (!hasHair) {
    missingRequiredParts.push('front hair or back hair');
  }

  return {
    canvasWidth: rig.canvas.w,
    canvasHeight: rig.canvas.h,
    layerCount: rig.layers.length,
    anchorCount: Object.keys(rig.anchors).length,
    strandCount: rig.layers.reduce(
      (total, layer) => total + (layer.strands?.length || 0),
      0,
    ),
    partsFound,
    missingRequiredParts,
    warnings: rig.warnings,
    preprocessed,
  };
}

function getMissingRequiredAnchors(rig: Anime25RigResult): string[] {
  const anchors = new Set(Object.keys(rig.anchors));
  return REQUIRED_ANCHORS.filter((anchor) => !anchors.has(anchor));
}

export async function detectAnime25RigFromBuffer(
  buffer: ArrayBuffer,
): Promise<Anime25RigDetection> {
  const rigger = getRigger();
  if (!rigger) {
    return {
      mode: 'static',
      usable: false,
      rig: null,
      summary: null,
      reason: 'Anime2.5DRig rigger runtime is not loaded.',
    };
  }

  try {
    const psd = readPsd(new Uint8Array(buffer.slice(0)), {
      useImageData: true,
      skipThumbnail: true,
    });
    const preprocessed = rigger.cleanPsdLayers(psd);
    const rig = rigger.buildRig(psd);
    const summary = summarizeAnime25Rig(rig, rigger, preprocessed);
    const missingRequiredAnchors = getMissingRequiredAnchors(rig);
    const blockingReasons = [
      ...summary.missingRequiredParts.map((part) => `missing part: ${part}`),
      ...missingRequiredAnchors.map((anchor) => `missing anchor: ${anchor}`),
      ...rig.warnings,
    ];
    const usable = blockingReasons.length === 0;

    return {
      mode: usable ? 'motion' : 'static',
      usable,
      rig,
      summary,
      reason: usable
        ? 'Anime2.5DRig parts detected.'
        : blockingReasons.join('; '),
    };
  } catch (error) {
    return {
      mode: 'static',
      usable: false,
      rig: null,
      summary: null,
      reason:
        error instanceof Error
          ? error.message
          : 'Failed to detect Anime2.5DRig parts.',
    };
  }
}

export {};
