import type { ScriptAvatarRoles } from '../types.js';
import { loadPsdModel, formatPsdLayerTree, type PsdModel } from './psdModel.js';
import {
  getInitialVisibility,
  type PsdRole,
  type PsdRoleBindings,
  type PsdVisibilityOverrides,
} from './psdVisibility.js';

export interface PsdAvatar {
  model: PsdModel;
  visibility: PsdVisibilityOverrides;
  roles: PsdRoleBindings;
}

export const PSD_ROLES: PsdRole[] = [
  'mouthOpen',
  'mouthClosed',
  'eyesOpen',
  'eyesClosed',
];

/** Load a PSD and resolve every required mouth and eye role. */
export async function loadPsdAvatar(
  filePath: string,
  overrides?: ScriptAvatarRoles,
): Promise<PsdAvatar> {
  const model = await loadPsdModel(filePath);
  return {
    model,
    visibility: getInitialVisibility(model),
    roles: resolveRoleBindings(model, overrides),
  };
}

/** Detect mouth and eye role nodes using the React static-mode hints. */
export function autoDetectRoleBindings(model: PsdModel): PsdRoleBindings {
  return {
    mouthOpen: pickNode(model, ['口', 'mouth', 'くち'], ['開', 'あ', 'open']),
    mouthClosed: pickNode(
      model,
      ['口', 'mouth', 'くち'],
      ['閉', 'ん', 'close', 'むっ'],
    ),
    eyesOpen: pickNode(model, ['目', 'eye', 'め'], ['開', 'open']),
    eyesClosed: pickNode(model, ['目', 'eye', 'め'], ['閉', 'close', 'つぶり']),
  };
}

/** Merge path overrides with detection and reject unresolved role layers. */
export function resolveRoleBindings(
  model: PsdModel,
  overrides?: ScriptAvatarRoles,
): PsdRoleBindings {
  const detected = autoDetectRoleBindings(model);
  const resolved = { ...detected };

  for (const role of PSD_ROLES) {
    const overridePath = overrides?.[role];
    if (overridePath === undefined) continue;
    const node = Object.values(model.nodes).find(
      (candidate) =>
        candidate.kind === 'layer' && candidate.path === overridePath,
    );
    if (!node) {
      throw new Error(
        `avatarRoles.${role} references missing layer path ` +
          `"${overridePath}".\nLayer tree:\n${formatPsdLayerTree(model)}`,
      );
    }
    resolved[role] = [node.id];
  }

  const missing = PSD_ROLES.filter((role) => resolved[role].length === 0);
  if (missing.length > 0) {
    const tree = formatPsdLayerTree(model);
    throw new Error(
      `Could not resolve PSD avatar roles: ${missing.join(', ')}. Set avatarRoles to exact layer paths.\nLayer tree:\n${tree}`,
    );
  }
  return resolved;
}

function includesAny(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function ancestors(model: PsdModel, nodeId: string): string[] {
  const result: string[] = [];
  let parentId = model.nodes[nodeId]?.parentId ?? null;
  while (parentId) {
    const parent = model.nodes[parentId];
    if (!parent) break;
    result.push(`${parent.rawName} ${parent.displayName}`);
    parentId = parent.parentId;
  }
  return result;
}

function pickNode(
  model: PsdModel,
  groupNames: string[],
  stateNames: string[],
): string[] {
  const match = Object.values(model.nodes).find(
    (node) =>
      ancestors(model, node.id).some((name) => includesAny(name, groupNames)) &&
      includesAny(`${node.rawName} ${node.displayName}`, stateNames),
  );
  return match ? [match.id] : [];
}
