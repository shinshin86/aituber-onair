import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  applyIdleMotionProfile,
  emptyMotionProfile,
  getMotionProfileKey,
  playProfileEmotion,
  readMotionProfile,
  resolveIdleMotions,
  writeMotionProfile,
} from './inochi2dMotionProfiles';
import type {
  InochiRuntimeController,
  ResolvedInochiModelDefinition,
} from '../types/inochi2d';

const model: ResolvedInochiModelDefinition = {
  id: 'sample',
  name: 'Sample',
  modelUrl: '/sample.inx',
  parameters: [],
  idleAnimations: ['breathe', 'sway'],
  emotionAnimations: { neutral: ['breathe'] },
};
const names = ['breathe', 'sway', 'celebrate'];
const controller = () => ({
  configureAnimationGroups: vi.fn(),
  stopAnimation: vi.fn(),
  playIdleAnimations: vi.fn(),
  playEmotionAnimation: vi.fn(),
  playAnimation: vi.fn(),
});

describe('model motion profiles', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
    vi.stubGlobal('crypto', webcrypto);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps idle defaults, explicit none, and missing motions distinct', () => {
    expect(resolveIdleMotions(model, emptyMotionProfile(), names)).toEqual([
      'breathe',
      'sway',
    ]);
    expect(
      resolveIdleMotions(model, { idle: null, emotions: {} }, names),
    ).toEqual([]);
    expect(
      resolveIdleMotions(model, { idle: 'gone', emotions: {} }, names),
    ).toEqual([]);
  });
  it('uses the legacy auto animation when no idle group exists', () => {
    expect(
      resolveIdleMotions(
        { ...model, idleAnimations: [], autoAnimation: 'sway' },
        emptyMotionProfile(),
        names,
      ),
    ).toEqual(['sway']);
  });
  it('restores separate assignments for each model', () => {
    writeMotionProfile('one', {
      idle: 'breathe',
      emotions: { happy: 'celebrate', sad: null },
    });
    writeMotionProfile('two', { idle: null, emotions: {} });
    expect(readMotionProfile('one').emotions).toEqual({
      happy: 'celebrate',
      sad: null,
    });
    expect(readMotionProfile('two').idle).toBeNull();
    expect(readMotionProfile('three')).toEqual(emptyMotionProfile());
  });
  it('ignores malformed fields and unsupported emotions', () => {
    localStorage.setItem(
      'inochi2d:motion-profile:v1:one',
      JSON.stringify({
        idle: 42,
        emotions: { happy: [], sad: null, unknown: 'sway' },
      }),
    );
    expect(readMotionProfile('one')).toEqual({ emotions: { sad: null } });
  });
  it('surfaces corrupted storage so the UI can explain fallback', () => {
    localStorage.setItem('inochi2d:motion-profile:v1:one', '{broken');
    expect(() => readMotionProfile('one')).toThrow();
  });
  it('surfaces write errors instead of claiming persistence', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Quota exceeded');
      },
    });
    expect(() => writeMotionProfile('one', emptyMotionProfile())).toThrow();
  });
  it('identifies the same file across blob URLs, and separates different contents', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(
            url.endsWith('other') ? 'different model' : 'same model',
          ),
        ),
      ),
    );
    const first = await getMotionProfileKey({
      ...model,
      modelUrl: 'blob:first',
    });
    expect(
      await getMotionProfileKey({ ...model, modelUrl: 'blob:second' }),
    ).toBe(first);
    expect(
      await getMotionProfileKey({ ...model, modelUrl: 'blob:other' }),
    ).not.toBe(first);
  });
  it('separates manifest profiles by model and external motion URL', async () => {
    const first = await getMotionProfileKey(model);
    expect(
      await getMotionProfileKey({ ...model, motionUrl: '/other.json' }),
    ).not.toBe(first);
  });
  it('clears the idle queue and stops the current clip for explicit none', async () => {
    const c = controller();
    await applyIdleMotionProfile(
      c as unknown as InochiRuntimeController,
      model,
      { idle: null, emotions: {} },
      names,
      true,
    );
    expect(c.stopAnimation).toHaveBeenCalledOnce();
    expect(c.playIdleAnimations).toHaveBeenCalledWith([], { shuffle: true });
    expect(c.configureAnimationGroups).toHaveBeenCalledWith(
      expect.objectContaining({ emotionAnimations: model.emotionAnimations }),
    );
  });
  it('makes an explicitly selected idle repeat without a rare-gesture cooldown', async () => {
    const c = controller();
    await applyIdleMotionProfile(
      c as unknown as InochiRuntimeController,
      {
        ...model,
        idleAnimationProfiles: {
          sway: { type: 'rareGesture', cooldownMs: 60000 },
        },
      },
      { idle: 'sway', emotions: {} },
      names,
    );
    expect(c.configureAnimationGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        idleAnimationProfiles: {
          sway: { type: 'base', cooldownMs: 0, weight: 1 },
        },
      }),
    );
  });
  it('does not stop an animation during initial setup', async () => {
    const c = controller();
    await applyIdleMotionProfile(
      c as unknown as InochiRuntimeController,
      model,
      emptyMotionProfile(),
      names,
    );
    expect(c.stopAnimation).not.toHaveBeenCalled();
    expect(c.playIdleAnimations).toHaveBeenCalledWith(['breathe', 'sway'], {
      shuffle: true,
    });
  });
  it('plays a user assignment once with an emotion transition', async () => {
    const c = controller();
    await playProfileEmotion(
      c as unknown as InochiRuntimeController,
      { emotions: { happy: 'celebrate' } },
      names,
      ' HAPPY ',
    );
    expect(c.playAnimation).toHaveBeenCalledWith('celebrate', {
      kind: 'reaction',
      loop: false,
      restart: true,
      transitionMs: 250,
    });
    expect(c.playEmotionAnimation).not.toHaveBeenCalled();
  });
  it('does not fall back to neutral for explicit none or a missing assigned clip', async () => {
    const c = controller();
    for (const happy of [null, 'missing']) {
      await playProfileEmotion(
        c as unknown as InochiRuntimeController,
        { emotions: { happy } },
        names,
        'happy',
      );
    }
    expect(c.playAnimation).not.toHaveBeenCalled();
    expect(c.playEmotionAnimation).not.toHaveBeenCalled();
  });
  it('plays default emotion clips with idle continuation; ignores unknown events', async () => {
    const c = controller();
    await playProfileEmotion(
      c as unknown as InochiRuntimeController,
      emptyMotionProfile(),
      names,
      'happy',
      { happy: ['celebrate'] },
    );
    await playProfileEmotion(
      c as unknown as InochiRuntimeController,
      emptyMotionProfile(),
      names,
      'unknown',
      { neutral: ['breathe'] },
    );
    expect(c.playAnimation).toHaveBeenCalledTimes(1);
    expect(c.playAnimation).toHaveBeenCalledWith(
      'celebrate',
      expect.objectContaining({ kind: 'reaction', loop: false }),
    );
  });
});
