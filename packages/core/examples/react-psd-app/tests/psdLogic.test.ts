import { describe, expect, it } from 'vitest';
import { autoDetectRoleBindings } from '../src/lib/psdBinding';
import {
  getPsdNodeOptions,
  type PsdModel,
  type PsdModelNode,
} from '../src/lib/psdModel';
import { getComposedOpacityForNode } from '../src/lib/psdRenderer';
import { getInitialVisibility } from '../src/lib/psdVisibility';

function baseNode(
  id: string,
  parentId: string | null,
  path: string,
  overrides: Partial<PsdModelNode> = {},
): PsdModelNode {
  const common = {
    id,
    parentId,
    rawName: path.split('/').at(-1) || path,
    displayName: path.split('/').at(-1) || path,
    path,
    depth: id.split('/').length - 1,
    forcedVisible: false,
    radio: false,
    flip: 'none' as const,
    hiddenByDefault: false,
    opacity: 255,
  };

  if (overrides.kind === 'layer') {
    return {
      ...common,
      kind: 'layer',
      left: 0,
      top: 0,
      width: 1,
      height: 1,
      bitmap: null,
      ...overrides,
    };
  }

  return {
    ...common,
    kind: 'group',
    childIds: [],
    ...overrides,
  };
}

function model(nodes: Record<string, PsdModelNode>): PsdModel {
  return {
    width: 1,
    height: 1,
    rootIds: Object.values(nodes)
      .filter((node) => node.parentId === null)
      .map((node) => node.id),
    nodes,
    renderLayerIds: Object.values(nodes)
      .filter((node) => node.kind === 'layer')
      .map((node) => node.id),
    unsupported: {
      nonNormalBlendModeLayers: [],
      maskLayers: [],
      clippingMaskLayers: [],
      flipVariantLayers: [],
      emptyPixelLayers: [],
    },
  };
}

describe('PSD visibility logic', () => {
  it('normalizes every radio sibling group on initial load', () => {
    const testModel = model({
      face: baseNode('face', null, '表情', {
        kind: 'group',
        childIds: ['face/smile', 'face/angry'],
      }),
      'face/smile': baseNode('face/smile', 'face', '表情/笑顔', {
        kind: 'layer',
        radio: true,
      }),
      'face/angry': baseNode('face/angry', 'face', '表情/怒り', {
        kind: 'layer',
        radio: true,
      }),
      clothes: baseNode('clothes', null, '服', {
        kind: 'group',
        childIds: ['clothes/a', 'clothes/b'],
      }),
      'clothes/a': baseNode('clothes/a', 'clothes', '服/A', {
        kind: 'layer',
        radio: true,
      }),
      'clothes/b': baseNode('clothes/b', 'clothes', '服/B', {
        kind: 'layer',
        radio: true,
      }),
    });

    expect(getInitialVisibility(testModel)).toMatchObject({
      'face/smile': true,
      'face/angry': false,
      'clothes/a': true,
      'clothes/b': false,
    });
  });

  it('normalizes root-level radio siblings on initial load', () => {
    const testModel = model({
      poseA: baseNode('poseA', null, 'pose A', {
        kind: 'layer',
        radio: true,
      }),
      poseB: baseNode('poseB', null, 'pose B', {
        kind: 'layer',
        radio: true,
      }),
    });

    expect(getInitialVisibility(testModel)).toMatchObject({
      poseA: true,
      poseB: false,
    });
  });
});

describe('PSD role binding helpers', () => {
  it('includes group nodes in role binding options', () => {
    const testModel = model({
      mouth: baseNode('mouth', null, '口', {
        kind: 'group',
        childIds: ['mouth/open'],
      }),
      'mouth/open': baseNode('mouth/open', 'mouth', '口/開き', {
        kind: 'group',
        childIds: ['mouth/open/layer'],
      }),
      'mouth/open/layer': baseNode(
        'mouth/open/layer',
        'mouth/open',
        '口/開き/layer',
        { kind: 'layer' },
      ),
    });

    expect(getPsdNodeOptions(testModel)).toContainEqual({
      value: 'mouth/open',
      label: '口/開き (group)',
    });
  });

  it('auto-detects subgroup role bindings without crossing mouth and eye roles', () => {
    const testModel = model({
      mouth: baseNode('mouth', null, '口', {
        kind: 'group',
        childIds: ['mouth/open'],
      }),
      'mouth/open': baseNode('mouth/open', 'mouth', '口/開き', {
        kind: 'group',
        childIds: ['mouth/open/layer'],
      }),
      'mouth/open/layer': baseNode(
        'mouth/open/layer',
        'mouth/open',
        '口/開き/layer',
        { kind: 'layer' },
      ),
      eyes: baseNode('eyes', null, '目', {
        kind: 'group',
        childIds: ['eyes/open'],
      }),
      'eyes/open': baseNode('eyes/open', 'eyes', '目/開き', {
        kind: 'layer',
      }),
    });

    expect(autoDetectRoleBindings(testModel)).toMatchObject({
      mouthOpen: ['mouth/open'],
      eyesOpen: ['eyes/open'],
      mouthClosed: [],
      eyesClosed: [],
    });
  });
});

describe('PSD renderer helpers', () => {
  it('multiplies ancestor group opacity into layer opacity', () => {
    const testModel = model({
      group: baseNode('group', null, 'group', {
        kind: 'group',
        childIds: ['group/layer'],
        opacity: 128,
      }),
      'group/layer': baseNode('group/layer', 'group', 'group/layer', {
        kind: 'layer',
        opacity: 128,
      }),
    });

    expect(getComposedOpacityForNode(testModel, 'group/layer')).toBeCloseTo(
      (128 / 255) * (128 / 255),
    );
  });
});
