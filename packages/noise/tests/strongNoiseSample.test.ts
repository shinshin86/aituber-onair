import {
  evaluateRewriteCandidates,
  selectBestCandidate,
} from '../src/core/candidateEvaluator';
import { describe, it, expect } from 'vitest';
import { createContaminator, createContextFingerprint } from '../src';
import {
  createNeuralCompositionModel,
  splitNeuralText,
  planNeuralSegments,
  validateNeuralCandidate,
} from '../src/brain/neuralComposition';
import { protectSensitiveSpans } from '../src/core/safetyGuard';
import { evaluateNoiseQuality } from '../src/core/qualityEvaluator';
import { textChangePercent } from '../examples/noise-brain-chat/src/strongNoise';
const interventions = [
  { kind: 'self_repair' as const, reason: 'test', strength: 0.9 },
];
const frame = (startStep: number, activity: number) => ({
  startStep,
  endStep: startStep + 1,
  activity,
  axes: [0, 0, 0.8, 0],
});
const frames = [frame(0, 0.5), frame(1, 0.5)];
const source = '今日は来てくれてありがとう。まだ少し話せます。';
function protectedDraft(text: string) {
  return protectSensitiveSpans(text, {
    preserveCodeBlocks: true,
    preserveUrls: true,
    preserveNumbers: true,
  });
}
function input(draft = source) {
  return {
    context: { draft },
    interventions,
    personaParameters: { warmth: 0.8 },
  };
}
function adapter(
  generate: (request: { system: string; prompt: string }) => Promise<string>,
  trace = frames
) {
  return createNeuralCompositionModel({
    model: { generate },
    modulation: () => ({ intensityScale: 1, readoutTrace: trace }),
  });
}

describe('temporal in-place rewriting', () => {
  it('losslessly segments Japanese quotes, newlines, clauses and opaque code', () => {
    for (const text of [
      '「本当？まだ？」と言った。\n次へ。',
      'まずここを見て、次はこちら。',
      '価格は__AITUBER_NOISE_SPAN_0__。\n以上。',
    ]) {
      expect(splitNeuralText(text).join('')).toBe(text);
      expect(splitNeuralText(text)).toHaveLength(2);
    }
    const text = protectedDraft('コードは `a。b` です。\n次はこちら。').text;
    expect(splitNeuralText(text)).toHaveLength(2);
    expect(splitNeuralText(text).join('')).toBe(text);
  });
  it('moves edit positions with bursts and keeps silent intervals unchanged', () => {
    for (const index of [0, 1]) {
      const plan = planNeuralSegments(
        source,
        [frame(0, index === 0 ? 0.5 : 0), frame(1, index === 1 ? 0.5 : 0)],
        interventions
      );
      expect(plan[index].operation).toBe('selfRepair');
      expect(plan[1 - index].operation).toBe('keep');
    }
    expect(
      planNeuralSegments(source, [frame(0, 0)], interventions).every(
        (s) => s.operation === 'keep'
      )
    ).toBe(true);
    expect(
      planNeuralSegments(source, frames, interventions, 0).every(
        (s) => s.operation === 'keep'
      )
    ).toBe(true);
    expect(
      planNeuralSegments('一。二。三。四。', frames, interventions).every((s) =>
        Number.isFinite(s.strength)
      )
    ).toBe(true);
  });
  it('maps distinct temporal axes to different licensed operations', () => {
    const allowed = [
      'ground_in_recent_comment',
      'contrarian_reframe',
      'self_repair',
      'unfinished_margin',
    ] as const;
    const kinds = allowed.map((kind) => ({
      kind,
      reason: 'test',
      strength: 0.9,
    }));
    const operations = ['fixation', 'reversal', 'selfRepair', 'detour'];
    for (let axis = 0; axis < 4; axis++) {
      const axes = [-0.5, -0.5, -0.5, -0.5];
      axes[axis] = 0.9;
      const plan = planNeuralSegments(
        source,
        [{ ...frame(0, 0.5), axes }],
        kinds
      );
      expect(plan.every((s) => s.operation === operations[axis])).toBe(true);
    }
  });
  it('chooses only licensed operations and handles malformed or missing traces', async () => {
    expect(
      planNeuralSegments(source, frames, interventions).every(
        (s) => s.intervention === 'self_repair'
      )
    ).toBe(true);
    expect(() =>
      planNeuralSegments('ありがとう。', frames, interventions)
    ).toThrow('unsplittable');
    expect(() => planNeuralSegments(source, frames, [])).toThrow(
      'no_licensed_intervention'
    );
    expect(
      planNeuralSegments(source, [frame(1, 0.5)], interventions).every(
        (s) => s.operation === 'keep'
      )
    ).toBe(true);
    let calls = 0;
    const model = adapter(async () => {
      calls++;
      return '{}';
    });
    await expect(
      model.generate({
        system: '',
        prompt: JSON.stringify(input()),
        rewriteContext: {},
      })
    ).rejects.toThrow('neural_unavailable');
    expect(calls).toBe(0); // Stale closure must not substitute for failed current-turn modulation.
  });
  it('rejects sentence injection, token corruption, new digits and unchanged candidates', () => {
    const plan = planNeuralSegments(source, frames, interventions);
    expect(() =>
      validateNeuralCandidate(
        ['今日はありがとう。追加。', '少しまだ話せるよ。'],
        plan
      )
    ).toThrow('segment_boundary_changed');
    expect(() =>
      validateNeuralCandidate(
        ['今日は2回来てくれてありがとう。', '少しまだ話せるよ。'],
        plan
      )
    ).toThrow('new_protected_content');
    expect(() =>
      validateNeuralCandidate(
        plan.map((s) => s.text),
        plan
      )
    ).toThrow('unchanged');
    const protectedSource = protectedDraft('料金は20円です。参加できます。');
    const tokenPlan = planNeuralSegments(
      protectedSource.text,
      frames,
      interventions
    );
    expect(() =>
      validateNeuralCandidate(
        ['料金は無料です。', '参加できるよ。'],
        tokenPlan,
        protectedSource.spans
      )
    ).toThrow('protected_token_changed');
    const result = validateNeuralCandidate(
      [
        '20円です料金は。'.replace('20円', protectedSource.spans[0].token),
        '参加できるよ。',
      ],
      tokenPlan,
      protectedSource.spans
    );
    expect(result.rewriteTrace).toHaveLength(2);
  });
  it('rejects reordering protected values and introducing inline code', () => {
    const draft = protectedDraft(
      '開始は20時で終了は22時です。準備してください。'
    );
    const plan = planNeuralSegments(draft.text, frames, interventions);
    const swapped = plan[0].text
      .replace(draft.spans[0].token, 'TEMP')
      .replace(draft.spans[1].token, draft.spans[0].token)
      .replace('TEMP', draft.spans[1].token);
    expect(() =>
      validateNeuralCandidate([swapped, plan[1].text], plan, draft.spans)
    ).toThrow('protected_token_changed');
    expect(() =>
      validateNeuralCandidate(
        [plan[0].text, '`run` を準備してください。'],
        plan,
        draft.spans
      )
    ).toThrow('new_protected_content');
  });
  it('measures budgets on restored characters and restores keep segments before measuring', () => {
    const draft = protectedDraft('20円。参加できます。');
    const plan = planNeuralSegments(draft.text, frames, interventions);
    expect(() =>
      validateNeuralCandidate(
        [plan[0].text, '途中からでも今からでも参加できるんだよ。'],
        plan,
        draft.spans
      )
    ).toThrow('length_budget');
    const quiet = planNeuralSegments(
      source,
      [frame(0, 0), frame(1, 0.5)],
      interventions
    );
    const result = validateNeuralCandidate(
      ['勝手に変えた。', '少しまだ話せるよ。'],
      quiet
    );
    expect(result.rewriteTrace[0].after).toBe(quiet[0].text);
    expect(result.appliedInterventions).toEqual(['self_repair']);
  });
  it('generates once, validates two candidates and passes the actual plan/persona', async () => {
    let calls = 0;
    const model = adapter(async (request) => {
      calls++;
      const data = JSON.parse(request.prompt);
      expect(data.personaParameters.warmth).toBe(0.8);
      expect(data.interventions).toEqual(interventions);
      return JSON.stringify({
        candidates: [
          { sentences: ['来てくれたね今日はありがと。', '少しまだ話せるよ。'] },
          { sentences: ['追加。追加。', '話せる。'] },
        ],
      });
    });
    const result = JSON.parse(
      await model.generate({ system: '', prompt: JSON.stringify(input()) })
    );
    expect(calls).toBe(1);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].appliedInterventions).toEqual(['self_repair']);
  });
  it('preserves selected trace through core restoration and removes it on fallback', async () => {
    const draft = '料金は20円です。途中参加もできます。';
    const model = createNeuralCompositionModel({
      model: {
        generate: async (request) => {
          const data = JSON.parse(request.prompt);
          const sentences = data.segments.map((s: { text: string }) =>
            s.text
              .replace('です。', 'なんだ。')
              .replace('できます。', 'できるよ。')
          );
          return JSON.stringify({ candidates: [{ sentences }, { sentences }] });
        },
      },
    });
    const options = {
      model,
      modulator: {
        modulate: async () => ({ intensityScale: 1, readoutTrace: frames }),
      },
      relationshipCapital: 0.8,
      fallbackToDraftOnQualityFail: true,
      quality: { minLengthRatio: 0.8, maxLengthRatio: 1.25 },
    };
    const turn = {
      systemPrompt: 'AITuber',
      messages: [],
      draft,
      intensity: 0.9,
      forceTilt: true,
    };
    const output = await createContaminator(options).contaminate(turn);
    expect(output.text).not.toBe(draft);
    expect(output.rewriteTrace?.map((s) => s.after).join('')).toBe(output.text);
    expect(output.rewriteTrace?.map((s) => s.before).join('')).toBe(draft);
    expect(output.applied.length).toBeGreaterThan(0);
    const fallback = await createContaminator({
      ...options,
      quality: { minScore: 1 },
    }).contaminate(turn);
    expect(fallback.text).toBe(draft);
    expect(fallback.rewriteTrace).toBeUndefined();
    expect(fallback.applied).toEqual([]);
  });
  it('does not treat edit distance as proof of a better reaction', () => {
    const context = createContextFingerprint({
      systemPrompt: '',
      messages: [],
    });
    const before = '明日は休む予定です。';
    const candidates = evaluateRewriteCandidates({
      before,
      context,
      candidates: ['明日は、休む予定です。', '休む予定です、明日は。'].map(
        (after) => ({
          text: after,
          appliedInterventions: ['self_repair'],
          rewriteTrace: [
            {
              index: 0,
              before,
              after,
              operation: 'selfRepair',
              intervention: 'self_repair',
              strength: 0.9,
            },
          ],
        })
      ),
    });
    for (const c of candidates) {
      c.evaluation.finalScore = 0.7;
      c.quality.passed = true;
    }
    expect(selectBestCandidate(candidates).index).toBe(0);
    candidates[1].quality.passed = false;
    candidates[1].quality.issues.push({
      kind: 'ungrounded_detail',
      severity: 'error',
      message: 'test',
    });
    expect(selectBestCandidate(candidates).index).toBe(0);
  });
  it('enforces optional minimum length without changing default behavior', () => {
    const context = createContextFingerprint({
      systemPrompt: '',
      messages: [],
    });
    const quality = evaluateNoiseQuality({
      before: '今日はいい天気です。',
      after: '晴れ。',
      context,
      options: { minLengthRatio: 0.8 },
    });
    expect(quality.passed).toBe(false);
    expect(quality.issues.some((i) => i.severity === 'error')).toBe(true);
    expect(textChangePercent('😀', '😁')).toBe(100);
  });
});
