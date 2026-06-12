import {
  InMemoryNoiseMemoryStore,
  assessSincerity,
  advanceRhythmState,
  createContaminator,
  createInitialNoiseMemory,
  createInitialRhythmState,
  decideRhythm,
  gateMode,
  getAllowedInterventions,
  hasPlayMarker,
  pickCallbackMoment,
  resolveRelationshipTier,
  scoreGenericity,
  type NoiseEvent,
  type RewriteModel,
} from '../src';

const PREDICTABLE_DRAFT =
  '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。';

function createStaticModel(text: string): RewriteModel {
  return {
    async generate() {
      return text;
    },
  };
}

describe('sincerity gate', () => {
  it('flags distress and consultation bids as serious', () => {
    expect(
      assessSincerity({
        messages: [
          { role: 'user', content: '最近ずっと落ち込んでいて、つらいです。' },
        ],
      }).serious
    ).toBe(true);
    expect(
      assessSincerity({
        messages: [
          { role: 'user', content: '真剣な話、聞いてほしいことがあるんだ。' },
        ],
      }).serious
    ).toBe(true);
  });

  it('does not flag ordinary banter', () => {
    const assessment = assessSincerity({
      messages: [
        { role: 'user', content: '今日も配信楽しみにしてたwww' },
        { role: 'user', content: '今日のゲームなに？' },
      ],
    });

    expect(assessment.serious).toBe(false);
    expect(assessment.score).toBe(0);
  });

  it('suppresses all noise when the user makes a sincere bid', async () => {
    const contaminator = createContaminator({
      intensity: 0.8,
      model: createStaticModel('書き換えられてはいけないテキスト。'),
    });

    const result = await contaminator.contaminate({
      systemPrompt: '気まぐれなAITuberです。',
      messages: [
        {
          role: 'user',
          content: '相談したいことがあって…最近ずっとつらいんだ。',
        },
      ],
      draft:
        'それは大変だったね。無理しないでほしいし、話したいだけ話していいからね。',
    });

    expect(result.skipped?.reason).toBe('sincerity');
    expect(result.text).toBe(
      'それは大変だったね。無理しないでほしいし、話したいだけ話していいからね。'
    );
    expect(result.applied).toHaveLength(0);
    expect(result.gates.sincerity.serious).toBe(true);
  });
});

describe('rhythm controller', () => {
  it('enforces platform -> tilt -> cooldown -> tilt rhythm', () => {
    let state = createInitialRhythmState();
    const options = { cooldownTurns: 1, minPlatformTurns: 0 };

    const first = decideRhythm({ state, diagnosisScore: 0.6, options });
    expect(first.apply).toBe(true);

    state = advanceRhythmState({ state, tilted: true, options });
    const second = decideRhythm({ state, diagnosisScore: 0.6, options });
    expect(second.apply).toBe(false);
    expect(second.phase).toBe('cooldown');

    state = advanceRhythmState({ state, tilted: false, options });
    const third = decideRhythm({ state, diagnosisScore: 0.6, options });
    expect(third.apply).toBe(true);
  });

  it('requires platform turns before the first tilt when configured', () => {
    const state = createInitialRhythmState();
    const decision = decideRhythm({
      state,
      diagnosisScore: 0.9,
      options: { minPlatformTurns: 2 },
    });

    expect(decision.apply).toBe(false);
    expect(decision.phase).toBe('platform');
  });

  it('forces a tilt after a long dry stretch below the threshold', () => {
    let state = createInitialRhythmState();
    const options = { tiltThreshold: 0.5, forcedTiltAfter: 3 };

    for (let turn = 0; turn < 3; turn += 1) {
      const decision = decideRhythm({
        state,
        diagnosisScore: 0.2,
        options,
      });
      expect(decision.apply).toBe(false);
      state = advanceRhythmState({ state, tilted: false, options });
    }

    const forced = decideRhythm({ state, diagnosisScore: 0.2, options });
    expect(forced.apply).toBe(true);
  });

  it('skips the cooldown turn after a tilt in the contaminator', async () => {
    const contaminator = createContaminator({
      intensity: 0.7,
      model: createStaticModel(
        '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。'
      ),
    });
    const input = {
      systemPrompt: 'AITuberです。',
      messages: [{ role: 'user' as const, content: '今日も楽しかった！！' }],
      draft: PREDICTABLE_DRAFT,
    };

    const first = await contaminator.contaminate(input);
    expect(first.skipped).toBeUndefined();
    expect(first.gates.rhythm.phase).toBe('tilt');

    const second = await contaminator.contaminate(input);
    expect(second.skipped?.reason).toBe('cooldown');
    expect(second.text).toBe(PREDICTABLE_DRAFT);

    const third = await contaminator.contaminate(input);
    expect(third.skipped).toBeUndefined();
  });

  it('bypasses the rhythm gate with forceTilt', async () => {
    const contaminator = createContaminator({
      intensity: 0.7,
      model: createStaticModel(
        '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。'
      ),
    });
    const input = {
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    };

    await contaminator.contaminate(input);
    const forced = await contaminator.contaminate({
      ...input,
      forceTilt: true,
    });

    expect(forced.skipped).toBeUndefined();
  });
});

describe('relationship gate', () => {
  it('maps capital to tiers', () => {
    expect(resolveRelationshipTier(0.1)).toBe('stranger');
    expect(resolveRelationshipTier(0.4)).toBe('acquaintance');
    expect(resolveRelationshipTier(0.7)).toBe('regular');
    expect(resolveRelationshipTier(0.9)).toBe('companion');
  });

  it('unlocks teasing-class interventions only for close relationships', () => {
    const stranger = getAllowedInterventions('stranger');
    const companion = getAllowedInterventions('companion');

    expect(stranger.has('tsukkomi')).toBe(false);
    expect(stranger.has('contrarian_reframe')).toBe(false);
    expect(stranger.has('break_clean_closing')).toBe(true);
    expect(companion.has('tsukkomi')).toBe(true);
    expect(companion.has('withheld_uptake')).toBe(true);
  });

  it('caps the requested mode at what the tier earned', () => {
    expect(gateMode('chaotic', 'stranger')).toBe('subtle');
    expect(gateMode('chaotic', 'acquaintance')).toBe('performer');
    expect(gateMode('performer', 'companion')).toBe('performer');
    expect(gateMode('chaotic', 'companion')).toBe('chaotic');
  });

  it('filters licensed interventions inside the contaminator', async () => {
    const contaminator = createContaminator({
      intensity: 0.9,
      mode: 'chaotic',
      model: createStaticModel(
        '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。'
      ),
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.1,
    });

    expect(result.gates.relationship.tier).toBe('stranger');
    expect(result.gates.relationship.effectiveMode).toBe('subtle');

    const appliedKinds = result.applied.map((item) => item.kind);
    const allowed = getAllowedInterventions('stranger');

    for (const kind of appliedKinds) {
      expect(allowed.has(kind)).toBe(true);
    }
  });
});

describe('gag ledger and callbacks', () => {
  it('records moments and plans callbacks for regulars', async () => {
    const store = new InMemoryNoiseMemoryStore();
    const events: NoiseEvent[] = [];
    const contaminator = createContaminator({
      intensity: 0.8,
      mode: 'bold',
      model: {
        async generate() {
          return JSON.stringify({
            candidates: [
              {
                text: 'そういえば例のプリン事件もあったし、今日は綺麗に締めないでおくね。',
                applied: ['callback', 'break_clean_closing'],
                typicality: 0.2,
              },
            ],
          });
        },
      },
      memory: {
        scopeId: 'gag-test',
        store,
      },
      onNoiseEvent: (event) => {
        events.push(event);
      },
    });

    await contaminator.recordMoment({
      summary: '視聴者がプリンを冷蔵庫で爆発させた事件',
      source: 'user',
    });

    // Advance one turn so the recorded moment becomes eligible.
    await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.7,
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.7,
      forceTilt: true,
    });

    const planKinds = result.plan.interventions.map((item) => item.kind);
    expect(planKinds).toContain('callback');

    const callbackPlan = result.plan.interventions.find(
      (item) => item.kind === 'callback'
    );
    expect(callbackPlan?.material).toContain('プリン');
    expect(events.some((event) => event.type === 'callback_used')).toBe(true);

    const memory = await store.load('gag-test');
    const moment = memory?.memorableMoments.find((item) =>
      item.summary.includes('プリン')
    );
    expect(moment?.callbacks).toBe(1);
  });

  it('does not plan callbacks for strangers', () => {
    const memory = createInitialNoiseMemory();

    expect(getAllowedInterventions('stranger').has('callback')).toBe(false);
    expect(pickCallbackMoment(memory)).toBeUndefined();
  });
});

describe('reaction loop', () => {
  it('raises the budget on laughter and promotes the last tilt into a gag', async () => {
    const store = new InMemoryNoiseMemoryStore();
    const contaminator = createContaminator({
      intensity: 0.7,
      model: createStaticModel(
        '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。'
      ),
      memory: {
        scopeId: 'reaction-test',
        store,
      },
    });

    await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    });

    const before = await store.load('reaction-test');
    const result = await contaminator.reportReaction({ signal: 'laughter' });

    expect(result.repairAdvised).toBe(false);
    expect(result.violationBudget).toBeGreaterThanOrEqual(
      before?.violationBudget ?? 1
    );
    expect(result.promotedMoment).toBeDefined();

    const after = await store.load('reaction-test');
    expect(after?.memorableMoments.length).toBe(1);
  });

  it('shrinks the budget and forces repair turns on discomfort', async () => {
    const events: NoiseEvent[] = [];
    const contaminator = createContaminator({
      intensity: 0.7,
      model: createStaticModel(
        '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。'
      ),
      onNoiseEvent: (event) => {
        events.push(event);
      },
    });
    const input = {
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    };

    await contaminator.contaminate(input);
    const reaction = await contaminator.reportReaction({
      signal: 'discomfort',
    });

    expect(reaction.repairAdvised).toBe(true);
    expect(reaction.violationBudget).toBeLessThan(1);
    expect(events.some((event) => event.type === 'repair_advised')).toBe(true);

    const next = await contaminator.contaminate(input);
    expect(next.skipped?.reason).toBe('repair');
    expect(next.text).toBe(PREDICTABLE_DRAFT);
  });
});

describe('genericity and play markers', () => {
  it('scores stock could-reply-to-anything phrases as generic', () => {
    expect(
      scoreGenericity({ text: 'なるほどですね。頑張ってください！' })
    ).toBeGreaterThan(0.4);
    expect(
      scoreGenericity({ text: '配信の音、少し割れてるから直すね。' })
    ).toBe(0);
  });

  it('penalizes near-repeats of the character own recent outputs', () => {
    const previous = '今日の配信はホラーゲームの新作を進めていくよ。';

    expect(
      scoreGenericity({
        text: '今日の配信はホラーゲームの新作を進めていくね。',
        recentResponses: [previous],
      })
    ).toBeGreaterThan(0.3);
  });

  it('detects play markers across Japanese and English styles', () => {
    expect(hasPlayMarker('それは違うでしょ、なんてね。')).toBe(true);
    expect(hasPlayMarker('知らんけどw')).toBe(true);
    expect(hasPlayMarker("that's the worst take, just kidding")).toBe(true);
    expect(hasPlayMarker('順番に答えます。')).toBe(false);
  });
});
