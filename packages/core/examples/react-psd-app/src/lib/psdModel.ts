import Psd, { type Layer, type NodeChild } from '@webtoon/psd';

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
  bitmap: ImageBitmap | null;
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

async function createLayerBitmap(layer: Layer): Promise<ImageBitmap | null> {
  if (layer.width <= 0 || layer.height <= 0) return null;
  const pixels = await layer.composite(false, false);
  const imageData = new ImageData(
    new Uint8ClampedArray(pixels),
    layer.width,
    layer.height,
  );
  return createImageBitmap(imageData);
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

export async function parsePsdModel(buffer: ArrayBuffer): Promise<PsdModel> {
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

    if (name.flip !== 'none') {
      unsupported.flipVariantLayers.push(displayPath);
    }

    if (child.type === 'Group') {
      const childIds: string[] = [];
      nodes[id] = { ...base, kind: 'group', childIds };
      for (let i = 0; i < child.children.length; i += 1) {
        childIds.push(
          await visit(child.children[i], [...indexPath, i], id, displayPath),
        );
      }
      return id;
    }

    const blendMode = getBlendMode(child);
    if (blendMode !== 'norm' && blendMode !== 'pass') {
      unsupported.nonNormalBlendModeLayers.push(displayPath);
    }
    if (hasMask(child)) unsupported.maskLayers.push(displayPath);
    if (hasClippingMask(child))
      unsupported.clippingMaskLayers.push(displayPath);
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
      bitmap: await createLayerBitmap(child),
    };
    return id;
  };

  for (let i = 0; i < psd.children.length; i += 1) {
    rootIds.push(await visit(psd.children[i], [i], null, ''));
  }

  const renderLayerIds = flattenLayerIdsBottomUp(rootIds, nodes);

  return {
    width: psd.width,
    height: psd.height,
    rootIds,
    nodes,
    renderLayerIds,
    unsupported,
  };
}

export function closePsdModel(model: PsdModel | null) {
  if (!model) return;
  for (const node of Object.values(model.nodes)) {
    if (node.kind === 'layer' && node.bitmap) {
      node.bitmap.close();
    }
  }
}

export function flattenLayerIdsBottomUp(
  nodeIds: string[],
  nodes: Record<string, PsdModelNode>,
): string[] {
  const result: string[] = [];

  for (const nodeId of [...nodeIds].reverse()) {
    const node = nodes[nodeId];
    if (!node) continue;
    if (node.kind === 'layer') {
      result.push(node.id);
      continue;
    }
    result.push(...flattenLayerIdsBottomUp(node.childIds, nodes));
  }

  return result;
}

export function getPsdNodeOptions(model: PsdModel | null) {
  if (!model) return [];
  return Object.values(model.nodes)
    .filter((node) => node.kind === 'layer' || node.kind === 'group')
    .map((node) => ({
      value: node.id,
      label: node.kind === 'group' ? `${node.path} (group)` : node.path,
    }));
}

export function hasPsdToolLayerControls(model: PsdModel | null): boolean {
  if (!model) return false;
  return Object.values(model.nodes).some(
    (node) => node.kind === 'group' || node.radio || node.forcedVisible,
  );
}

export function summarizeUnsupported(summary: PsdUnsupportedSummary): string[] {
  const lines: string[] = [];
  if (summary.nonNormalBlendModeLayers.length > 0) {
    lines.push(
      `Non-normal blend modes ignored: ${summary.nonNormalBlendModeLayers.join(', ')}`,
    );
  }
  if (summary.maskLayers.length > 0) {
    lines.push(`Layer masks ignored: ${summary.maskLayers.join(', ')}`);
  }
  if (summary.clippingMaskLayers.length > 0) {
    lines.push(
      `Clipping masks ignored: ${summary.clippingMaskLayers.join(', ')}`,
    );
  }
  if (summary.flipVariantLayers.length > 0) {
    lines.push(
      `Flip variants parsed but not flipped: ${summary.flipVariantLayers.join(', ')}`,
    );
  }
  return lines;
}
