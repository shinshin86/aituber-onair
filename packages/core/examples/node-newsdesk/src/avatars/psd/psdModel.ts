import { readFile } from 'node:fs/promises';
import PsdImport, { type Layer, type NodeChild } from '@webtoon/psd';
import {
  type Image,
  ImageData,
  createCanvas,
  loadImage,
} from '@napi-rs/canvas';

export type PsdFlip = 'none' | 'x' | 'y' | 'xy';

export interface PsdNameInfo {
  rawName: string;
  displayName: string;
  forcedVisible: boolean;
  radio: boolean;
  flip: PsdFlip;
}

export interface PsdBaseNode {
  id: string;
  parentId: string | null;
  rawName: string;
  displayName: string;
  path: string;
  depth: number;
  forcedVisible: boolean;
  radio: boolean;
  flip: PsdFlip;
  hiddenByDefault: boolean;
  opacity: number;
}

export interface PsdGroupNode extends PsdBaseNode {
  kind: 'group';
  childIds: string[];
}

export interface PsdLayerNode extends PsdBaseNode {
  kind: 'layer';
  left: number;
  top: number;
  width: number;
  height: number;
  image: Image | null;
}

export type PsdModelNode = PsdGroupNode | PsdLayerNode;

export interface PsdUnsupportedSummary {
  nonNormalBlendModeLayers: string[];
  maskLayers: string[];
  clippingMaskLayers: string[];
  flipVariantLayers: string[];
  emptyPixelLayers: string[];
}

export interface PsdModel {
  width: number;
  height: number;
  rootIds: string[];
  nodes: Record<string, PsdModelNode>;
  renderLayerIds: string[];
  unsupported: PsdUnsupportedSummary;
}

type LayerInternals = {
  layerFrame?: {
    layerProperties?: {
      hidden?: boolean;
      blendMode?: string;
      clippingMask?: number;
      maskData?: {
        right?: number;
        left?: number;
        bottom?: number;
        top?: number;
      };
    };
  };
};

/** Parse PSDTool markers from a layer or group name. */
export function parsePsdName(rawName: string): PsdNameInfo {
  let name = rawName.trim();
  let forcedVisible = false;
  let radio = false;

  while (name.startsWith('!') || name.startsWith('*')) {
    if (name.startsWith('!')) forcedVisible = true;
    if (name.startsWith('*')) radio = true;
    name = name.slice(1).trimStart();
  }

  let flip: PsdFlip = 'none';
  const flipMatch = name.match(/:flip(xy|x|y)$/i);
  if (flipMatch) {
    flip = flipMatch[1].toLowerCase() as PsdFlip;
    name = name.slice(0, flipMatch.index).trimEnd();
  }

  return {
    rawName,
    displayName: name || rawName,
    forcedVisible,
    radio,
    flip,
  };
}

/** Load a PSD file and pre-composite every pixel layer once for Canvas 2D. */
export async function loadPsdModel(filePath: string): Promise<PsdModel> {
  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`PSD avatar file was not found: ${filePath}`);
    }
    throw error;
  }
  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  return parsePsdModel(buffer);
}

/** Parse a PSD buffer into the static PSDTool layer model. */
export async function parsePsdModel(buffer: ArrayBuffer): Promise<PsdModel> {
  const psdModule = PsdImport as unknown as {
    default?: typeof PsdImport;
  };
  const Psd = psdModule.default ?? PsdImport;
  const psd = Psd.parse(buffer);
  const nodes: Record<string, PsdModelNode> = {};
  const rootIds: string[] = [];
  const unsupported = createUnsupportedSummary();

  const visit = async (
    child: NodeChild,
    indexPath: number[],
    parentId: string | null,
    parentPath: string,
  ): Promise<string> => {
    const id = indexPath.join('/');
    const name = parsePsdName(child.name || `Layer ${id}`);
    const displayPath = parentPath
      ? `${parentPath}/${name.displayName}`
      : name.displayName;
    const base = {
      id,
      parentId,
      rawName: name.rawName,
      displayName: name.displayName,
      path: displayPath,
      depth: indexPath.length - 1,
      forcedVisible: name.forcedVisible,
      radio: name.radio,
      flip: name.flip,
      hiddenByDefault: getOwnHidden(child),
      opacity: child.opacity,
    };

    if (name.flip !== 'none') unsupported.flipVariantLayers.push(displayPath);

    if (child.type === 'Group') {
      const childIds: string[] = [];
      nodes[id] = { ...base, kind: 'group', childIds };
      for (let index = 0; index < child.children.length; index += 1) {
        childIds.push(
          await visit(
            child.children[index],
            [...indexPath, index],
            id,
            displayPath,
          ),
        );
      }
      return id;
    }

    const blendMode = getBlendMode(child);
    if (blendMode !== 'norm' && blendMode !== 'pass') {
      unsupported.nonNormalBlendModeLayers.push(displayPath);
    }
    if (hasMask(child)) unsupported.maskLayers.push(displayPath);
    if (hasClippingMask(child)) {
      unsupported.clippingMaskLayers.push(displayPath);
    }
    if (child.width <= 0 || child.height <= 0) {
      unsupported.emptyPixelLayers.push(displayPath);
    }

    nodes[id] = {
      ...base,
      kind: 'layer',
      left: child.left,
      top: child.top,
      width: child.width,
      height: child.height,
      image: await createLayerImage(child),
    };
    return id;
  };

  for (let index = 0; index < psd.children.length; index += 1) {
    rootIds.push(await visit(psd.children[index], [index], null, ''));
  }

  return {
    width: psd.width,
    height: psd.height,
    rootIds,
    nodes,
    renderLayerIds: flattenLayerIdsBottomUp(rootIds, nodes),
    unsupported,
  };
}

/** Flatten pixel layers in the bottom-up order used by the React example. */
export function flattenLayerIdsBottomUp(
  nodeIds: string[],
  nodes: Record<string, PsdModelNode>,
): string[] {
  const result: string[] = [];
  for (const nodeId of [...nodeIds].reverse()) {
    const node = nodes[nodeId];
    if (!node) continue;
    if (node.kind === 'layer') result.push(node.id);
    else result.push(...flattenLayerIdsBottomUp(node.childIds, nodes));
  }
  return result;
}

/** Format a model tree for role-binding diagnostics. */
export function formatPsdLayerTree(model: PsdModel): string {
  const lines: string[] = [];
  const visit = (nodeId: string): void => {
    const node = model.nodes[nodeId];
    if (!node) return;
    const prefix = node.kind === 'group' ? '[group] ' : '- ';
    lines.push(`${'  '.repeat(node.depth)}${prefix}${node.path}`);
    if (node.kind === 'group') node.childIds.forEach(visit);
  };
  model.rootIds.forEach(visit);
  return lines.join('\n');
}

function getOwnHidden(node: NodeChild): boolean {
  if (node.type === 'Layer') return node.isHidden;
  return Boolean(
    (node as unknown as LayerInternals).layerFrame?.layerProperties?.hidden,
  );
}

function getBlendMode(layer: Layer): string {
  return (
    (layer as unknown as LayerInternals).layerFrame?.layerProperties
      ?.blendMode || 'norm'
  );
}

function hasMask(layer: Layer): boolean {
  const mask = (layer as unknown as LayerInternals).layerFrame?.layerProperties
    ?.maskData;
  if (!mask) return false;
  return (
    Number(mask.right || 0) > Number(mask.left || 0) &&
    Number(mask.bottom || 0) > Number(mask.top || 0)
  );
}

function hasClippingMask(layer: Layer): boolean {
  return Boolean(
    (layer as unknown as LayerInternals).layerFrame?.layerProperties
      ?.clippingMask,
  );
}

async function createLayerImage(layer: Layer): Promise<Image | null> {
  if (layer.width <= 0 || layer.height <= 0) return null;
  const pixels = await layer.composite(false, false);
  const data = new Uint8ClampedArray(pixels);
  const canvas = createCanvas(layer.width, layer.height);
  canvas
    .getContext('2d')
    .putImageData(new ImageData(data, layer.width, layer.height), 0, 0);
  return loadImage(canvas.toBuffer('image/png'));
}

function createUnsupportedSummary(): PsdUnsupportedSummary {
  return {
    nonNormalBlendModeLayers: [],
    maskLayers: [],
    clippingMaskLayers: [],
    flipVariantLayers: [],
    emptyPixelLayers: [],
  };
}
