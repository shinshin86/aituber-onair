import type { PsdModel, PsdModelNode } from './psdModel';
import {
  EMPTY_ROLE_BINDINGS,
  type PsdRole,
  type PsdRoleBindings,
} from './psdVisibility';

const ROLE_LABELS: Record<PsdRole, string> = {
  mouthOpen: 'Mouth open',
  mouthClosed: 'Mouth closed',
  eyesOpen: 'Eyes open',
  eyesClosed: 'Eyes closed',
};

function includesAny(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function ancestors(model: PsdModel, node: PsdModelNode): PsdModelNode[] {
  const result: PsdModelNode[] = [];
  let parent = node.parentId ? model.nodes[node.parentId] : undefined;
  while (parent) {
    result.push(parent);
    parent = parent.parentId ? model.nodes[parent.parentId] : undefined;
  }
  return result;
}

function groupMatches(
  model: PsdModel,
  node: PsdModelNode,
  names: string[],
): boolean {
  return ancestors(model, node).some((parent) =>
    includesAny(`${parent.rawName} ${parent.displayName}`, names),
  );
}

function nodeMatchesState(node: PsdModelNode, stateNames: string[]): boolean {
  return includesAny(`${node.rawName} ${node.displayName}`, stateNames);
}

function pickNode(
  model: PsdModel,
  groupNames: string[],
  stateNames: string[],
): string[] {
  const match = Object.values(model.nodes).find(
    (node) =>
      groupMatches(model, node, groupNames) &&
      nodeMatchesState(node, stateNames),
  );
  return match ? [match.id] : [];
}

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

export function mergeRoleBindings(
  detected: PsdRoleBindings,
  restored?: Partial<PsdRoleBindings>,
): PsdRoleBindings {
  return {
    mouthOpen: restored?.mouthOpen || detected.mouthOpen,
    mouthClosed: restored?.mouthClosed || detected.mouthClosed,
    eyesOpen: restored?.eyesOpen || detected.eyesOpen,
    eyesClosed: restored?.eyesClosed || detected.eyesClosed,
  };
}

export function createEmptyRoleBindings(): PsdRoleBindings {
  return { ...EMPTY_ROLE_BINDINGS };
}

export function getRoleLabel(role: PsdRole): string {
  return ROLE_LABELS[role];
}

export const PSD_ROLES: PsdRole[] = [
  'mouthOpen',
  'mouthClosed',
  'eyesOpen',
  'eyesClosed',
];
