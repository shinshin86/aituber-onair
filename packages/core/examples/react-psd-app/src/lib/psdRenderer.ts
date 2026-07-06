import type { PsdModel } from './psdModel';
import type {
  PsdPoseState,
  PsdRoleBindings,
  PsdVisibilityOverrides,
} from './psdVisibility';
import { getVisibleLayerIds } from './psdVisibility';

export function getComposedOpacityForNode(
  model: PsdModel,
  nodeId: string,
): number {
  let opacity = 1;
  let current = model.nodes[nodeId] as PsdModel['nodes'][string] | undefined;

  while (current) {
    opacity *= Math.max(0, Math.min(current.opacity / 255, 1));
    current = current.parentId ? model.nodes[current.parentId] : undefined;
  }

  return opacity;
}

export function renderPsdToCanvas(
  model: PsdModel,
  canvas: HTMLCanvasElement,
  overrides: PsdVisibilityOverrides,
  roles: PsdRoleBindings,
  pose: PsdPoseState,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  if (canvas.width !== model.width) canvas.width = model.width;
  if (canvas.height !== model.height) canvas.height = model.height;

  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const nodeId of getVisibleLayerIds(model, overrides, roles, pose)) {
    const node = model.nodes[nodeId];
    if (!node || node.kind !== 'layer' || !node.bitmap) continue;
    context.save();
    context.globalAlpha = getComposedOpacityForNode(model, node.id);
    context.drawImage(node.bitmap, node.left, node.top);
    context.restore();
  }
}
