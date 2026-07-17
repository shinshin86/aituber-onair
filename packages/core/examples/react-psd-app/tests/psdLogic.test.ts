import { describe, expect, it } from 'vitest';
import { autoDetectRoleBindings } from '../src/lib/psdBinding';
import {
  calculateCenteredZoomTransform,
  sanitizeAvatarViewTransform,
} from '../src/lib/avatarViewTransform';
import {
  getPsdNodeOptions,
  hasPsdToolLayerControls,
  type PsdModel,
  type PsdModelNode,
} from '../src/lib/psdModel';
import {
  isAnime25RigUsable,
  summarizeAnime25Rig,
} from '../src/lib/rig/anime25Rig';
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
  it('detects when PSDTool layer controls are useful', () => {
    expect(
      hasPsdToolLayerControls(
        model({
          body: baseNode('body', null, 'body', { kind: 'layer' }),
          mouth: baseNode('mouth', null, 'mouth', { kind: 'layer' }),
        }),
      ),
    ).toBe(false);

    expect(
      hasPsdToolLayerControls(
        model({
          group: baseNode('group', null, 'group', {
            kind: 'group',
            childIds: ['group/layer'],
          }),
          'group/layer': baseNode('group/layer', 'group', 'group/layer', {
            kind: 'layer',
          }),
        }),
      ),
    ).toBe(true);

    expect(
      hasPsdToolLayerControls(
        model({
          radio: baseNode('radio', null, '*radio', {
            kind: 'layer',
            radio: true,
          }),
        }),
      ),
    ).toBe(true);

    expect(
      hasPsdToolLayerControls(
        model({
          forced: baseNode('forced', null, '!forced', {
            kind: 'layer',
            forcedVisible: true,
          }),
        }),
      ),
    ).toBe(true);
  });

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

describe('Anime2.5DRig detection helpers', () => {
  it('summarizes rig parts, anchors, and strands', () => {
    const summary = summarizeAnime25Rig(
      {
        canvas: { w: 512, h: 512 },
        layers: [
          { name: 'face' },
          { name: 'eyewhite_l' },
          { name: 'eyewhite_r' },
          { name: 'irides_l' },
          { name: 'irides_r' },
          { name: 'eyelash_l' },
          { name: 'eyelash_r' },
          { name: 'eye_close_l' },
          { name: 'eye_close_r' },
          { name: 'mouth_open' },
          { name: 'mouth_close' },
          {
            name: 'front hair_1',
            strands: [
              { x: 1, rootY: 2, tipY: 3 },
              { x: 4, rootY: 5, tipY: 6 },
            ],
          },
        ],
        anchors: { face: {}, eyeL: {}, eyeR: {}, mouth: {} },
        warnings: [],
      },
      { baseName: (name) => name.replace(/_\d+$/, '') },
      { noisy: 1, layers: 12 },
    );

    expect(summary).toMatchObject({
      canvasWidth: 512,
      canvasHeight: 512,
      layerCount: 12,
      anchorCount: 4,
      strandCount: 2,
      missingRequiredParts: [],
      preprocessed: { noisy: 1, layers: 12 },
    });
    expect(summary.partsFound).toContain('front hair');
  });

  it('does not require an eye_close layer when eye anchors are available', () => {
    const summary = summarizeAnime25Rig(
      {
        canvas: { w: 512, h: 512 },
        layers: [
          { name: 'face' },
          { name: 'eyewhite_l' },
          { name: 'eyewhite_r' },
          { name: 'irides_l' },
          { name: 'irides_r' },
          { name: 'eyelash_l' },
          { name: 'eyelash_r' },
          { name: 'mouth_open' },
          { name: 'mouth_close' },
          { name: 'front hair_1', strands: [{ x: 1, rootY: 2, tipY: 3 }] },
        ],
        anchors: { face: {}, eyeL: {}, eyeR: {}, mouth: {} },
        warnings: [],
      },
      { baseName: (name) => name.replace(/_\d+$/, '') },
      { noisy: 0, layers: 10 },
    );

    expect(summary.missingRequiredParts).toEqual([]);
  });

  it('accepts a warning-bearing single-eye motion rig with a face layer', () => {
    const summary = summarizeAnime25Rig(
      {
        canvas: { w: 1280, h: 1280 },
        layers: [
          { name: 'face' },
          { name: 'eyewhite_r' },
          { name: 'irides_r' },
          { name: 'eye_close_r' },
          { name: 'mouth_open' },
          { name: 'mouth_close' },
          { name: 'front hair_1' },
        ],
        anchors: { face: {}, eyeR: {}, mouth: {} },
        warnings: ['Optional left eye anchor is unavailable.'],
      },
      { baseName: (name) => name.replace(/_\d+$/, '') },
      { noisy: 0, layers: 7 },
    );

    expect(summary.missingRequiredParts).toEqual([]);
    expect(summary.warnings).toHaveLength(1);
    expect(isAnime25RigUsable(summary)).toBe(true);
  });

  it('keeps static fallback for rigs without a face layer', () => {
    const summary = summarizeAnime25Rig(
      {
        canvas: { w: 512, h: 512 },
        layers: [{ name: '!body' }],
        anchors: {},
        warnings: ['Unknown layer.'],
      },
      { baseName: (name) => name },
      { noisy: 0, layers: 1 },
    );

    expect(summary.missingRequiredParts).toEqual(['face']);
    expect(isAnime25RigUsable(summary)).toBe(false);
  });
});

describe('PSD avatar view transform helpers', () => {
  it('zooms around the avatar center without changing x/y', () => {
    expect(
      calculateCenteredZoomTransform({ x: 120, y: -80, scale: 1 }, 1.4, {
        width: 480,
        height: 480,
      }),
    ).toEqual({ x: 120, y: -80, scale: 1.4 });
  });

  it('clamps unbounded avatar offsets to a recoverable range', () => {
    expect(
      sanitizeAvatarViewTransform({
        x: 10_000,
        y: -10_000,
        scale: 10,
      }),
    ).toEqual({ x: 2_000, y: -2_000, scale: 3 });
  });
});
