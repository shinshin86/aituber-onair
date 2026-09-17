import { createGraphNoiseBrain } from '../src/brain/createNoiseBrain.js';
import { describe, it, expect } from 'vitest';
import {
  createVirtualNoiseBrain,
  createContextFingerprint,
  createNeuralReactionModel,
  decodeNeuralReaction,
  decodeNeuralAttention,
  bindNeuralContent,
  createContaminator,
} from '../src/index.js';
import type {
  NoiseModulation,
  RewriteModel,
  NeuralReactionTrace,
} from '../src/index.js';

const base = {
  context: createContextFingerprint({ systemPrompt: '', messages: [] }),
  diagnosis: { score: 0, issues: [] },
  intensity: 0.9,
  mode: 'chaotic' as const,
};
const input = {
  system: '',
  prompt: JSON.stringify({
    context: {
      persona: 'Friendly character',
      recentMessages: [{ role: 'user', content: 'もう終わり？' }],
      draft: '今日はここまで。明日はまた配信します。',
    },
    rewriteStyle: { mode: 'chaotic' },
    interventions: [{ kind: 'contrarian_reframe', strength: 0.9 }],
  }),
};
const modulation: NoiseModulation = {
  intensityScale: 1,
  contentKeys: bindNeuralContent(
    ['今日はここまで。', '明日はまた配信します。'],
    JSON.parse(input.prompt).context.draft
  ),
  readoutTrace: [
    {
      startStep: 0,
      endStep: 4,
      activity: 0.1,
      axes: [0.8, -0.5, -0.8, 0],
      contentAxes: [0.8, -0.8],
    },
  ],
};
const good = '明日また配信するよ。今日はここまで、まだ話したいけど。';

describe('neural reaction pathway', () => {
  it('requires synaptic propagation, not just text-derived numbers', async () => {
    const make = (weight: number) =>
      createGraphNoiseBrain(
        {
          offsets: new Uint32Array([0, 1, 1]),
          targets: new Uint32Array([1]),
          weights: new Float32Array([weight]),
          bodyIds: new Uint32Array([0, 1]),
          flags: new Uint32Array([0, (255 << 8) | 1]),
        },
        { provider: 'virtual', captureReadout: true, steps: 8 }
      );
    const connected = await make(0.5).modulate({
      ...base,
      stimulus: [1, 0, 0, 0, 0, 0],
    });
    const disconnected = await make(0).modulate({
      ...base,
      stimulus: [1, 0, 0, 0, 0, 0],
    });
    expect(connected.brainState?.descendingActivity).toBeGreaterThan(0);
    expect(disconnected.brainState?.descendingActivity).toBe(0);
    expect(() => decodeNeuralReaction(disconnected)).toThrow('neural_inactive');
  });
  it('honors the current turn intensity before any model call', async () => {
    let calls = 0;
    const model = createNeuralReactionModel({
      model: {
        generate: async () => {
          calls++;
          throw Error('unexpected');
        },
      },
      brain: { modulate: async () => modulation },
      strength: 0.9,
    });
    await expect(
      model.generate({ ...input, rewriteContext: { intensity: 0 } })
    ).rejects.toThrow('neural_inactive');
    expect(calls).toBe(0);
  });
  it('preserves state between turns and resets to reproducible isolated sessions', async () => {
    const brain = createVirtualNoiseBrain({
      captureReadout: true,
      retainState: true,
      steps: 32,
    });
    const stimulus = [0.6, 0.1, 0.9, 0.6, 0.2, 0];
    const first = await brain.modulate({ ...base, stimulus });
    await brain.modulate({ ...base, stimulus: [0, 1, 0, 0, 0, 0] });
    const afterHistory = await brain.modulate({ ...base, stimulus });
    expect(afterHistory.readoutTrace).not.toEqual(first.readoutTrace);
    brain.reset();
    expect(await brain.modulate({ ...base, stimulus })).toEqual(first);
    brain.reset();
    const silent = await brain.modulate({
      ...base,
      stimulus: [0, 0, 0, 0, 0, 0],
    });
    expect(() => decodeNeuralReaction(silent)).toThrow('neural_inactive');
    await expect(
      brain.modulate({ ...base, stimulus: [Number.NaN] })
    ).rejects.toThrow('stimulus');
  });
  it('feeds encoded stimuli into the circuit and actual spike readout into speech, never encoder-selected emotion', async () => {
    let seenStimulus: readonly number[] | undefined;
    let speechAttention: unknown;
    let reportedIntervention = 'contrarian_reframe';
    let trace: NeuralReactionTrace | undefined;
    const model: RewriteModel = {
      generate: async (r) => {
        if (r.system.startsWith('Independently'))
          return JSON.stringify({
            factsPreserved: true,
            natural: true,
            reactionChanged: true,
            stateAligned: true,
          });
        if (r.system.startsWith('Classify'))
          return JSON.stringify({
            stimulus: [1, 0, 0.8, 0.3, 0.1, 0],
            state: { approach: 0 },
            facts: ['今日はここまで。', '明日はまた配信する。'],
            baselineAct: 'end the stream',
            anchors: ['今日はここまで。', '明日はまた配信します。'],
          });
        if (r.system.startsWith('Audit'))
          return JSON.stringify({
            reviews: [
              {
                grounded: true,
                unsupportedClaims: [],
                missingFacts: [],
                reaction: true,
                state: true,
                persona: true,
                natural: true,
                intervention: reportedIntervention,
              },
            ],
          });
        const speech = JSON.parse(r.prompt);
        expect(speech.draft).toBeUndefined();
        expect(speech.facts).toEqual([
          '今日はここまで。',
          '明日はまた配信します。',
        ]);
        expect(speech.original).toBe(JSON.parse(input.prompt).context.draft);
        expect(speech.state).toBeUndefined();
        speechAttention = speech.attention;
        return JSON.stringify({
          candidates: [
            { text: '明日も配信する。今日は終わり、惜しい。' },
            { text: '明日も配信する。今日は終わり、惜しい。' },
          ],
        });
      },
    };
    const adapter = createNeuralReactionModel({
      model,
      brain: {
        modulate: async (r) => {
          seenStimulus = r.stimulus;
          return modulation;
        },
      },
      onTrace: (t) => {
        trace = t;
      },
    });
    const requested = JSON.parse(input.prompt);
    requested.interventions.unshift({ kind: 'self_repair', strength: 0.9 });
    const turn = { ...input, prompt: JSON.stringify(requested) };
    const result = JSON.parse(await adapter.generate(turn));
    expect(result.candidates[0].appliedInterventions).toEqual([
      'contrarian_reframe',
    ]);
    expect(seenStimulus).toEqual([1, 0, 0.8, 0.3, 0.1, 0]);
    expect(speechAttention).toEqual(
      decodeNeuralAttention(modulation, modulation.contentKeys ?? [])
    );
    expect(result.candidates[0].rewriteTrace[0].operation).toBe(
      'neural_reaction'
    );
    expect(trace?.attempts).toHaveLength(2);
    reportedIntervention = 'boke_bait';
    await expect(adapter.generate(turn)).rejects.toThrow(
      'Invalid applied intervention'
    );
  });
  it('accepts a changed intention and omitted draft content through the full pipeline', async () => {
    let trace: NeuralReactionTrace | undefined;
    const changed = 'やっぱり、もう少しだけ話していたいな。';
    const adapter = createNeuralReactionModel({
      brain: { modulate: async () => modulation },
      onTrace: (value) => {
        trace = value;
      },
      model: {
        generate: async (r) => {
          if (r.system.startsWith('Classify'))
            return JSON.stringify({ stimulus: [1, 0, 0, 0, 0, 0] });
          if (r.system.startsWith('Audit'))
            return JSON.stringify({
              reviews: [
                {
                  grounded: true,
                  unsupportedClaims: [],
                  missingFacts: ['明日はまた配信します。'],
                  reaction: true,
                  state: true,
                  persona: true,
                  natural: true,
                  intervention: 'shift_attention',
                },
              ],
            });
          return JSON.stringify({
            candidates: [{ text: changed }, { text: changed }],
          });
        },
      },
    });
    const output = await createContaminator({ model: adapter }).contaminate({
      systemPrompt: 'Friendly character',
      messages: [{ role: 'user', content: 'もう終わり？' }],
      draft: JSON.parse(input.prompt).context.draft,
      forceTilt: true,
    });
    expect(output.skipped).toBeUndefined();
    expect(output.plan.preserve.meaning).toBe(false);
    expect(output.text).toBe(changed);
    expect(trace?.attempts[0].audit).toBe('passed');
    expect(trace?.attempts[0].missingFacts).toEqual(['明日はまた配信します。']);
  });
  it.each(['reaction', 'grounded', 'state', 'natural', 'persona'])(
    'fails closed on %s audit failure, retaining every rejected attempt',
    async (failure) => {
      let calls = 0;
      let speechCalls = 0;
      let trace: NeuralReactionTrace | undefined;
      const model: RewriteModel = {
        generate: async (r) => {
          calls++;
          if (r.system.startsWith('Independently'))
            return JSON.stringify({
              factsPreserved: true,
              natural: false,
              reactionChanged: true,
              stateAligned: true,
              reason: 'Unnatural despite passing the claim audit',
            });
          if (r.system.startsWith('Classify'))
            return '{"stimulus":[1,0,0,0,0,0],"facts":["今日はここまで。","明日はまた配信する。"],"anchors":["今日はここまで。","明日はまた配信します。"],"baselineAct":"fixture"}';
          if (r.system.startsWith('Audit'))
            return JSON.stringify({
              reviews: Array.from({ length: 1 }, () => ({
                grounded: true,
                unsupportedClaims:
                  failure === 'grounded' ? ['New practical restriction'] : [],
                missingFacts: failure === 'grounded' ? ['Wait a little'] : [],
                reaction: failure !== 'reaction',
                state: failure !== 'state',
                persona: failure !== 'persona',
                natural: failure !== 'natural',
                intervention: 'contrarian_reframe',
                reason: 'Audit rejection',
              })),
            });
          speechCalls++;
          if (speechCalls === 2 && failure === 'grounded') {
            const feedback = JSON.parse(r.prompt).feedback;
            expect(feedback[0].missingFacts).toEqual(['Wait a little']);
            expect(feedback[0].unsupportedClaims).toEqual([
              'New practical restriction',
            ]);
          }
          return JSON.stringify({
            candidates: Array.from({ length: 2 }, () => ({
              text: '今日はここまで。明日はまた配信するよ。',
            })),
          });
        },
      };
      await expect(
        createNeuralReactionModel({
          model,
          brain: { modulate: async () => modulation },
          onTrace: (t) => {
            trace = t;
          },
        }).generate(input)
      ).rejects.toThrow('quality_fail');
      expect(calls).toBe(7);
      expect(trace?.attempts).toHaveLength(4);
      expect(trace?.attempts.every((a) => a.rejection?.includes(failure))).toBe(
        true
      );
    }
  );
  it('cannot forward token corruption or overlength candidates to audit', async () => {
    let audits = 0;
    const model: RewriteModel = {
      generate: async (r) => {
        if (r.system.startsWith('Classify'))
          return '{"stimulus":[1,0,0,0,0,0],"facts":["今日はここまで。","明日はまた配信する。"],"anchors":["今日はここまで。","明日はまた配信します。"],"baselineAct":"fixture"}';
        if (r.system.startsWith('Audit')) {
          audits++;
          throw Error('unexpected');
        }
        return JSON.stringify({
          candidates: [
            { text: good.repeat(10) },
            {
              text: '今日は __AITUBER_NOISE_SPAN_9__ まで。明日も配信するよ。',
            },
          ],
        });
      },
    };
    await expect(
      createNeuralReactionModel({
        model,
        brain: { modulate: async () => modulation },
      }).generate(input)
    ).rejects.toThrow('quality_fail');
    expect(audits).toBe(0);
  });
  it('sincerity gate prevents both language calls and neural mutation', async () => {
    let calls = 0;
    const model = createNeuralReactionModel({
      model: {
        generate: async () => {
          calls++;
          throw Error('unexpected');
        },
      },
      brain: {
        modulate: async () => {
          calls++;
          return modulation;
        },
      },
    });
    const result = await createContaminator({
      model,
      relationshipCapital: 0.8,
    }).contaminate({
      systemPrompt: '',
      messages: [{ role: 'user', content: 'ずっとつらくて相談したいです。' }],
      draft: '話してくれてありがとう。',
      forceTilt: true,
    });
    expect(result.skipped?.reason).toBe('sincerity');
    expect(calls).toBe(0);
  });
  it('rejects concurrent state mutations without stopping the original call', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const model = createNeuralReactionModel({
      model: {
        generate: async () => {
          await pending;
          throw Error('done');
        },
      },
      brain: { modulate: async () => modulation },
    });
    const first = model.generate(input);
    await expect(model.generate(input)).rejects.toThrow('already running');
    release();
    await expect(first).rejects.toThrow('done');
  });
});
