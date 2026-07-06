import type { PsdModel, PsdModelNode } from './psdModel';

export type PsdVisibilityOverrides = Record<string, boolean>;

export type PsdRole = 'mouthOpen' | 'mouthClosed' | 'eyesOpen' | 'eyesClosed';

export type PsdRoleBindings = Record<PsdRole, string[]>;

export const EMPTY_ROLE_BINDINGS: PsdRoleBindings = {
  mouthOpen: [],
  mouthClosed: [],
  eyesOpen: [],
  eyesClosed: [],
};

export interface PsdPoseState {
  mouthOpen: boolean;
  eyesClosed: boolean;
}

function isNodeVisibleByDefault(node: PsdModelNode): boolean {
  return node.forcedVisible || !node.hiddenByDefault;
}

export function getNodeVisible(
  node: PsdModelNode,
  overrides: PsdVisibilityOverrides,
): boolean {
  if (node.forcedVisible) return true;
  return overrides[node.id] ?? isNodeVisibleByDefault(node);
}

export function getInitialVisibility(model: PsdModel): PsdVisibilityOverrides {
  const next: PsdVisibilityOverrides = {};

  for (const node of Object.values(model.nodes)) {
    if (!node.forcedVisible) {
      next[node.id] = isNodeVisibleByDefault(node);
    }
  }

  const normalizeRadioSiblings = (siblingIds: string[]) => {
    const radioChildIds = siblingIds.filter((childId) => {
      const child = model.nodes[childId];
      return child?.radio;
    });
    const firstVisibleRadioId = radioChildIds.find((childId) =>
      getNodeVisible(model.nodes[childId], next),
    );

    if (!firstVisibleRadioId) return;

    for (const childId of radioChildIds) {
      const child = model.nodes[childId];
      if (!child || child.forcedVisible) continue;
      next[childId] = childId === firstVisibleRadioId;
    }
  };

  normalizeRadioSiblings(model.rootIds);

  for (const node of Object.values(model.nodes)) {
    if (node.kind !== 'group') continue;
    normalizeRadioSiblings(node.childIds);
  }

  return next;
}

function getRadioSiblingIds(model: PsdModel, node: PsdModelNode): string[] {
  if (!node.radio) return [];
  if (!node.parentId) {
    return model.rootIds.filter((childId) => model.nodes[childId]?.radio);
  }
  const parent = model.nodes[node.parentId];
  if (!parent || parent.kind !== 'group') return [];
  return parent.childIds.filter((childId) => model.nodes[childId]?.radio);
}

export function setNodeVisible(
  model: PsdModel,
  overrides: PsdVisibilityOverrides,
  nodeId: string,
  visible: boolean,
): PsdVisibilityOverrides {
  const node = model.nodes[nodeId];
  if (!node || node.forcedVisible) return overrides;
  const next = { ...overrides, [nodeId]: visible };

  if (visible && node.radio) {
    for (const siblingId of getRadioSiblingIds(model, node)) {
      if (siblingId !== nodeId && !model.nodes[siblingId]?.forcedVisible) {
        next[siblingId] = false;
      }
    }
  }

  return next;
}

function applyRoleSet(
  model: PsdModel,
  overrides: PsdVisibilityOverrides,
  showIds: string[],
  hideIds: string[],
): PsdVisibilityOverrides {
  let next = overrides;
  for (const nodeId of hideIds) {
    next = setNodeVisible(model, next, nodeId, false);
  }
  for (const nodeId of showIds) {
    next = setNodeVisible(model, next, nodeId, true);
  }
  return next;
}

export function applyPoseRoles(
  model: PsdModel,
  overrides: PsdVisibilityOverrides,
  roles: PsdRoleBindings,
  pose: PsdPoseState,
): PsdVisibilityOverrides {
  let next = overrides;
  next = pose.mouthOpen
    ? applyRoleSet(model, next, roles.mouthOpen, roles.mouthClosed)
    : applyRoleSet(model, next, roles.mouthClosed, roles.mouthOpen);
  next = pose.eyesClosed
    ? applyRoleSet(model, next, roles.eyesClosed, roles.eyesOpen)
    : applyRoleSet(model, next, roles.eyesOpen, roles.eyesClosed);
  return next;
}

export function isEffectivelyVisible(
  model: PsdModel,
  nodeId: string,
  overrides: PsdVisibilityOverrides,
): boolean {
  let current: PsdModelNode | undefined = model.nodes[nodeId];

  while (current) {
    if (!getNodeVisible(current, overrides)) return false;
    current = current.parentId ? model.nodes[current.parentId] : undefined;
  }

  return true;
}

export function getVisibleLayerIds(
  model: PsdModel,
  overrides: PsdVisibilityOverrides,
  roles: PsdRoleBindings,
  pose: PsdPoseState,
): string[] {
  const resolved = applyPoseRoles(model, overrides, roles, pose);
  return model.renderLayerIds.filter((nodeId) =>
    isEffectivelyVisible(model, nodeId, resolved),
  );
}
