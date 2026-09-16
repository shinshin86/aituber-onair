import { describe, expect, it } from 'vitest';
import {
  decodeNeuralAttention,
  bindNeuralContent,
  type NoiseModulation,
} from '../src/index.js';

const keys = [10, 20];
const early = {
  startStep: 0,
  endStep: 8,
  activity: 0.1,
  axes: [1, 0, 0, -1],
  contentAxes: [0.8, -0.8],
};
const late = {
  startStep: 8,
  endStep: 16,
  activity: 0.1,
  axes: [-1, 0, 0, 1],
  contentAxes: [-0.8, 0.8],
};
const modulation: NoiseModulation = {
  intensityScale: 1,
  contentKeys: keys,
  readoutTrace: [early, late],
};

describe('content attention from temporal activity', () => {
  it('distinguishes opposite temporal paths with identical whole-turn averages', () => {
    const forward = decodeNeuralAttention(modulation, keys);
    const backward = decodeNeuralAttention(
      {
        intensityScale: 1,
        contentKeys: keys,
        readoutTrace: [
          { ...early, axes: late.axes, contentAxes: late.contentAxes },
          { ...late, axes: early.axes, contentAxes: early.contentAxes },
        ],
      },
      keys
    );
    expect(forward.opening.focus).toBe(0);
    expect(forward.settling.focus).toBe(1);
    expect(backward.opening).toEqual(forward.settling);
    expect(backward.settling).toEqual(forward.opening);
  });
  it('rejects mismatched content order instead of silently moving a focus', () => {
    expect(() =>
      decodeNeuralAttention(modulation, [...keys].reverse())
    ).toThrow('neural_unavailable');
    const anchors = ['保存します', '今日は完成させません'];
    const draft = anchors.join('。');
    expect(bindNeuralContent([...anchors].reverse(), draft)).toEqual(
      bindNeuralContent(anchors, draft).reverse()
    );
    expect(() => bindNeuralContent(['存在しない内容'], draft)).toThrow(
      'anchors'
    );
    expect(bindNeuralContent([anchors[0], anchors[0]], draft)[0]).toBe(
      bindNeuralContent([anchors[0]], draft)[0]
    );
  });
  it('keeps silent windows and indistinguishable content neutral', () => {
    const quiet = decodeNeuralAttention(
      {
        intensityScale: 1,
        contentKeys: keys,
        readoutTrace: [{ ...early, activity: 0 }, late],
      },
      keys
    );
    expect(quiet.opening.weights).toEqual([0.5, 0.5]);
    expect(quiet.opening.contrast).toBe(0);
    expect(decodeNeuralAttention(modulation, keys, 0).opening.weights).toEqual([
      0.5, 0.5,
    ]);
    expect(() =>
      decodeNeuralAttention(
        {
          intensityScale: 1,
          contentKeys: keys,
          readoutTrace: [{ ...early, activity: 0 }],
        },
        keys
      )
    ).toThrow('neural_inactive');
  });
  it('has no attention when activity is malformed and rejects invalid bindings before brain mutation', async () => {
    expect(() =>
      decodeNeuralAttention(
        {
          intensityScale: 1,
          contentKeys: keys,
          readoutTrace: [{ ...early, axes: [Number.NaN, 0, 0, 0] }],
        },
        keys
      )
    ).toThrow('neural_inactive');
    expect(() => bindNeuralContent(['not in draft'], 'A')).toThrow('anchors');
  });
});

describe('content population readout', () => {
  it('observes circuit history without changing its dynamics and resets reproducibly', async () => {
    const { createVirtualNoiseBrain, createContextFingerprint } = await import(
      '../src/index.js'
    );
    const options = {
      seed: 42,
      captureReadout: true,
      retainState: true,
      steps: 32,
    };
    const a = createVirtualNoiseBrain(options);
    const b = createVirtualNoiseBrain(options);
    const turn = {
      context: createContextFingerprint({ systemPrompt: '', messages: [] }),
      diagnosis: { score: 0, issues: [] },
      intensity: 0.9,
      mode: 'chaotic' as const,
      stimulus: [0.6, 0, 0.5, 0.1, 0.7, 0],
    };
    const first = await a.modulate({ ...turn, readoutKeys: keys });
    const noObserver = await b.modulate(turn);
    expect(a.getActivitySnapshot()).toEqual(b.getActivitySnapshot());
    expect(first.brainState).toEqual(noObserver.brainState);
    const attention = decodeNeuralAttention(first, keys);
    await a.modulate({ ...turn, stimulus: [1, 0, 0, 0, 0, 0] });
    const after = await a.modulate({ ...turn, readoutKeys: keys });
    expect(decodeNeuralAttention(after, keys)).not.toEqual(attention);
    a.reset();
    expect(await a.modulate({ ...turn, readoutKeys: keys })).toEqual(first);
    a.reset();
    const reordered = await a.modulate({
      ...turn,
      readoutKeys: [...keys].reverse(),
    });
    expect(reordered.readoutTrace?.map((f) => f.contentAxes)).toEqual(
      first.readoutTrace?.map((f) => [...(f.contentAxes ?? [])].reverse())
    );
    a.reset();
    const silent = await a.modulate({
      ...turn,
      stimulus: [0, 0, 0, 0, 0, 0],
      readoutKeys: keys,
    });
    expect(() => decodeNeuralAttention(silent, keys)).toThrow(
      'neural_inactive'
    );
    // Rejected keys must not advance the reservoir.
    a.reset();
    await expect(
      a.modulate({ ...turn, readoutKeys: [Number.NaN] })
    ).rejects.toThrow('readout keys');
    expect(await a.modulate({ ...turn, readoutKeys: keys })).toEqual(first);
  });
  it('reports a neutral attention skip without asking a writer to invent a change', async () => {
    const { createNeuralReactionModel, createContaminator } = await import(
      '../src/index.js'
    );
    let calls = 0;
    const model = createNeuralReactionModel({
      model: {
        generate: async () => {
          calls++;
          return '{"stimulus":[1,0,0,0,0,0]}';
        },
      },
      brain: {
        modulate: async (input) => ({
          intensityScale: 1,
          contentKeys: [...(input.readoutKeys ?? [])],
          readoutTrace: [
            {
              startStep: 0,
              endStep: 8,
              activity: 0.2,
              axes: [0, 0, 0, 0],
              contentAxes: input.readoutKeys?.map(() => 0),
            },
          ],
        }),
      },
    });
    const draft = '現在は下書きです。保存します。';
    const result = await createContaminator({
      model,
      mode: 'chaotic',
      relationshipCapital: 0.8,
    }).contaminate({
      systemPrompt: '',
      messages: [],
      draft,
      forceTilt: true,
      intensity: 0.9,
    });
    expect(calls).toBe(1);
    expect(result.text).toBe(draft);
    expect(result.skipped?.reason).toBe('neural_unfocused');
    expect(result.rewriteTrace).toBeUndefined();
  });
});
