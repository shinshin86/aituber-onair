import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMouthValues } from '../src/gen/audio.js';
import { selectAvatarMode } from '../src/gen/avatarMode.js';
import { createBlinkSchedule } from '../src/gen/blink.js';
import {
  assertSequentialMotionFrame,
  resolveLocalAssetPath,
} from '../src/gen/psdMotionAvatar.js';
import {
  autoDetectRoleBindings,
  loadPsdAvatar,
  resolveRoleBindings,
} from '../src/gen/psdBinding.js';
import {
  type PsdGroupNode,
  type PsdLayerNode,
  type PsdModel,
  parsePsdName,
} from '../src/gen/psdModel.js';
import {
  getInitialVisibility,
  getNodeVisible,
} from '../src/gen/psdVisibility.js';
import {
  MOUTH_OPEN_THRESHOLD,
  resolveAvatarStateKey,
  resolveIdlePose,
  resolveMouthState,
} from '../src/gen/renderer.js';
import { createSeededRandom, VirtualClock } from '../harness/virtualClock.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const samplePsd = path.resolve(testDirectory, '../assets/sample-static.psd');

describe('deterministic animation helpers', () => {
  it('creates the same blink schedule for the same seed', () => {
    const first = createBlinkSchedule(300, 30, 42);
    const second = createBlinkSchedule(300, 30, 42);
    const different = createBlinkSchedule(300, 30, 43);

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
    expect(first.includes(1)).toBe(true);
  });

  it('keeps RMS normalized and applies the binary mouth threshold', () => {
    const empty = createMouthValues(
      { samples: new Float32Array(), sampleRate: 48_000 },
      30,
      2,
    );
    const loud = createMouthValues(
      { samples: new Float32Array(3_200).fill(1), sampleRate: 48_000 },
      30,
      2,
    );

    expect([...empty]).toEqual([0, 0]);
    expect([...loud].every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(resolveMouthState(MOUTH_OPEN_THRESHOLD - 0.001)).toBe('closed');
    expect(resolveMouthState(MOUTH_OPEN_THRESHOLD)).toBe('open');
    expect(resolveAvatarStateKey('open', true)).toBe('mouth_open_eyes_closed');
  });

  it('disables video-only idle motion at zero intensity', () => {
    expect(resolveIdlePose(75, 30, 0)).toEqual({
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
    });
    expect(resolveIdlePose(75, 30, 1).y).not.toBe(0);
  });

  it('reuses deterministic browser clock and RNG semantics', () => {
    const firstRandom = createSeededRandom(42);
    const secondRandom = createSeededRandom(42);
    expect([firstRandom(), firstRandom(), firstRandom()]).toEqual([
      secondRandom(),
      secondRandom(),
      secondRandom(),
    ]);

    const clock = new VirtualClock();
    clock.reset(42);
    const order: string[] = [];
    clock.requestAnimationFrame(() => {
      order.push('first');
      clock.requestAnimationFrame(() => order.push('nested'));
    });
    clock.requestAnimationFrame(() => order.push('second'));
    clock.advance(1 / 30);
    expect(clock.flushAnimationFrame()).toBe(2);
    expect(order).toEqual(['first', 'second']);
    expect(clock.pendingAnimationFrames()).toBe(1);
    expect(clock.flushAnimationFrame()).toBe(1);
    expect(order).toEqual(['first', 'second', 'nested']);
  });
});

describe('PSD avatar mode selection', () => {
  const usable = { usable: true, reason: 'Anime2.5DRig parts detected.' };
  const ineligible = { usable: false, reason: 'missing part: face' };

  it('selects motion first for auto and falls back to static', () => {
    expect(selectAvatarMode('auto', usable)).toBe('motion');
    expect(selectAvatarMode('auto', ineligible)).toBe('static');
  });

  it('honors forced modes and preserves the rigger diagnostic', () => {
    expect(selectAvatarMode('static', usable)).toBe('static');
    expect(selectAvatarMode('motion', usable)).toBe('motion');
    expect(() => selectAvatarMode('motion', ineligible)).toThrow(
      'missing part: face',
    );
  });

  it('enforces sequential motion frames and read-only route boundaries', () => {
    expect(() => assertSequentialMotionFrame(4, 4)).not.toThrow();
    expect(() => assertSequentialMotionFrame(4, 5)).toThrow(
      /expected 4, got 5/,
    );
    expect(resolveLocalAssetPath('/models', '/avatar/', '/avatar/a.psd')).toBe(
      path.resolve('/models/a.psd'),
    );
    expect(
      resolveLocalAssetPath('/models', '/avatar/', '/avatar/../secret.psd'),
    ).toBeNull();
    expect(
      resolveLocalAssetPath('/models', '/avatar/', '/avatar/%2e%2e/secret.psd'),
    ).toBeNull();
  });
});

describe('static PSDTool model', () => {
  it('parses forced, radio, and parsed-only flip notation', () => {
    expect(parsePsdName(' !*Mouth:flipxy ')).toEqual({
      rawName: ' !*Mouth:flipxy ',
      displayName: 'Mouth',
      forcedVisible: true,
      radio: true,
      flip: 'xy',
    });
    expect(parsePsdName('*Open:flipx').flip).toBe('x');
    expect(parsePsdName('Closed').flip).toBe('none');
  });

  it('normalizes radio siblings and preserves forced visibility', () => {
    const model = createRoleModel('ja');
    const body = createLayer('2', null, '!body', '!body', true, true);
    model.rootIds.push(body.id);
    model.nodes[body.id] = body;
    const visibility = getInitialVisibility(model);

    expect(visibility['0/0']).toBe(true);
    expect(visibility['0/1']).toBe(false);
    expect(getNodeVisible(body, visibility)).toBe(true);
  });

  it('auto-detects Japanese and English group and state hints', () => {
    expect(autoDetectRoleBindings(createRoleModel('ja'))).toEqual({
      mouthOpen: ['0/0'],
      mouthClosed: ['0/1'],
      eyesOpen: ['1/0'],
      eyesClosed: ['1/1'],
    });
    expect(autoDetectRoleBindings(createRoleModel('en'))).toEqual({
      mouthOpen: ['0/0'],
      mouthClosed: ['0/1'],
      eyesOpen: ['1/0'],
      eyesClosed: ['1/1'],
    });
  });

  it('uses explicit layer-path overrides for custom names', () => {
    const model = createRoleModel('custom');
    expect(
      resolveRoleBindings(model, {
        mouthOpen: 'Visemes/Wide',
        mouthClosed: 'Visemes/Rest',
        eyesOpen: 'Lids/Awake',
        eyesClosed: 'Lids/Asleep',
      }),
    ).toEqual({
      mouthOpen: ['0/0'],
      mouthClosed: ['0/1'],
      eyesOpen: ['1/0'],
      eyesClosed: ['1/1'],
    });
  });

  it('lists the layer tree when an override path is missing', () => {
    const model = createRoleModel('custom');
    expect(() =>
      resolveRoleBindings(model, {
        mouthOpen: 'Visemes/NotThere',
        mouthClosed: 'Visemes/Rest',
        eyesOpen: 'Lids/Awake',
        eyesClosed: 'Lids/Asleep',
      }),
    ).toThrow(/avatarRoles\.mouthOpen.*Layer tree:.*Visemes\/Wide/s);
  });

  it('loads the bundled PSD and resolves all four roles in Node.js', async () => {
    const avatar = await loadPsdAvatar(samplePsd);

    expect(avatar.model.width).toBe(512);
    expect(avatar.model.height).toBe(512);
    expect(Object.values(avatar.roles).every((ids) => ids.length > 0)).toBe(
      true,
    );
  });

  it('keeps bundled mouth and eye roles smaller than the PSD canvas', async () => {
    const avatar = await loadPsdAvatar(samplePsd);

    for (const layerIds of Object.values(avatar.roles)) {
      expect(layerIds).toHaveLength(1);
      const node = avatar.model.nodes[layerIds[0]];
      if (node.kind !== 'layer') {
        throw new Error(`Expected a pixel layer for ${node.path}.`);
      }

      expect(node.width).toBeLessThan(avatar.model.width);
      expect(node.height).toBeLessThan(avatar.model.height);
    }
  });
});

function createRoleModel(locale: 'ja' | 'en' | 'custom'): PsdModel {
  const names =
    locale === 'ja'
      ? ['口', '開き', '閉じ', '目', '開き', '閉じ']
      : locale === 'en'
        ? ['Mouth', 'Open', 'Closed', 'Eyes', 'Open', 'Closed']
        : ['Visemes', 'Wide', 'Rest', 'Lids', 'Awake', 'Asleep'];
  const mouth = createGroup('0', null, names[0], ['0/0', '0/1']);
  const mouthOpen = createLayer(
    '0/0',
    '0',
    `${names[0]}/${names[1]}`,
    names[1],
  );
  const mouthClosed = createLayer(
    '0/1',
    '0',
    `${names[0]}/${names[2]}`,
    names[2],
  );
  const eyes = createGroup('1', null, names[3], ['1/0', '1/1']);
  const eyesOpen = createLayer('1/0', '1', `${names[3]}/${names[4]}`, names[4]);
  const eyesClosed = createLayer(
    '1/1',
    '1',
    `${names[3]}/${names[5]}`,
    names[5],
  );
  return {
    width: 2,
    height: 2,
    rootIds: ['0', '1'],
    nodes: {
      '0': mouth,
      '0/0': mouthOpen,
      '0/1': mouthClosed,
      '1': eyes,
      '1/0': eyesOpen,
      '1/1': eyesClosed,
    },
    renderLayerIds: ['1/1', '1/0', '0/1', '0/0'],
    unsupported: {
      nonNormalBlendModeLayers: [],
      maskLayers: [],
      clippingMaskLayers: [],
      flipVariantLayers: [],
      emptyPixelLayers: [],
    },
  };
}

function createGroup(
  id: string,
  parentId: string | null,
  name: string,
  childIds: string[],
): PsdGroupNode {
  return {
    ...baseNode(id, parentId, name, name),
    kind: 'group',
    childIds,
  };
}

function createLayer(
  id: string,
  parentId: string | null,
  pathValue: string,
  name: string,
  forcedVisible = false,
  hiddenByDefault = false,
): PsdLayerNode {
  return {
    ...baseNode(id, parentId, pathValue, name, forcedVisible, hiddenByDefault),
    kind: 'layer',
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    image: null,
  };
}

function baseNode(
  id: string,
  parentId: string | null,
  pathValue: string,
  name: string,
  forcedVisible = false,
  hiddenByDefault = false,
) {
  return {
    id,
    parentId,
    rawName: forcedVisible ? `!${name}` : `*${name}`,
    displayName: name,
    path: pathValue,
    depth: id.split('/').length - 1,
    forcedVisible,
    radio: !forcedVisible && parentId !== null,
    flip: 'none' as const,
    hiddenByDefault,
    opacity: 255,
  };
}
