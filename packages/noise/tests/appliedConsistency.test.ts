import {
  InMemoryNoiseMemoryStore,
  createContaminator,
  createContextFingerprint,
  evaluateRewriteCandidates,
  selectBestCandidate,
  type NoiseEvent,
  type RewriteModel,
} from '../src';

const PREDICTABLE_DRAFT =
  '今日は来てくれてありがとう。次回も楽しみにしていてね。';

function jsonModel(
  candidates: Array<{
    text: string;
    applied: string[];
    typicality?: number;
  }>
): RewriteModel {
  return {
    async generate() {
      return JSON.stringify({ candidates });
    },
  };
}

describe('applied interventions consistency', () => {
  it('drops a claimed intervention that the tier never allowed', async () => {
    const store = new InMemoryNoiseMemoryStore();
    const events: NoiseEvent[] = [];
    const contaminator = createContaminator({
      mode: 'chaotic',
      intensity: 0.9,
      // tsukkomi is companion-only, so a stranger plan can never authorize it.
      model: jsonModel([
        {
          text: 'また来てくれてうれしい。締めは置いておくね、なんてねw',
          applied: ['tsukkomi', 'break_clean_closing'],
        },
      ]),
      memory: { scopeId: 'tier', store },
      onNoiseEvent: (event) => events.push(event),
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.1,
      forceTilt: true,
    });

    expect(result.skipped).toBeUndefined();
    expect(result.gates.relationship.tier).toBe('stranger');

    const appliedKinds = result.applied.map((item) => item.kind);
    expect(appliedKinds).toContain('break_clean_closing');
    expect(appliedKinds).not.toContain('tsukkomi');

    const tiltEvent = events.find((event) => event.type === 'tilt_applied');
    expect(tiltEvent?.type).toBe('tilt_applied');
    if (tiltEvent?.type === 'tilt_applied') {
      expect(tiltEvent.interventions).not.toContain('tsukkomi');
    }

    const memory = await store.load('tier');
    const stainKinds = memory?.usedStains.map((record) => record.kind) ?? [];
    expect(stainKinds).not.toContain('tsukkomi');
    expect(memory?.lastTilt?.interventions).not.toContain('tsukkomi');
  });

  it('keeps applied, tilt_applied, and lastTilt as the same set', async () => {
    const store = new InMemoryNoiseMemoryStore();
    const events: NoiseEvent[] = [];
    const contaminator = createContaminator({
      mode: 'performer',
      intensity: 0.8,
      model: jsonModel([
        {
          text: 'さっきの音、少し気になったから先に直すね。',
          applied: ['break_clean_closing', 'increase_specificity'],
        },
      ]),
      memory: { scopeId: 'sets', store },
      onNoiseEvent: (event) => events.push(event),
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.5,
      forceTilt: true,
    });

    const appliedKinds = [...result.applied.map((item) => item.kind)].sort();
    const memory = await store.load('sets');
    const lastTiltKinds = [...(memory?.lastTilt?.interventions ?? [])].sort();
    const tiltEvent = events.find((event) => event.type === 'tilt_applied');
    const eventKinds =
      tiltEvent?.type === 'tilt_applied'
        ? [...tiltEvent.interventions].sort()
        : [];

    expect(appliedKinds.length).toBeGreaterThan(0);
    expect(lastTiltKinds).toEqual(appliedKinds);
    expect(eventKinds).toEqual(appliedKinds);
  });

  it('fires callback_used only when callback is planned AND claimed', async () => {
    // Case A: callback is planned and the selected candidate claims it.
    const storeA = new InMemoryNoiseMemoryStore();
    const eventsA: NoiseEvent[] = [];
    const contaminatorA = createContaminator({
      mode: 'bold',
      intensity: 0.85,
      model: jsonModel([
        {
          text: 'あの宝箱の件、また戻ってきちゃった。締めは置いておくね。',
          applied: ['callback', 'break_clean_closing'],
        },
      ]),
      memory: { scopeId: 'cb-a', store: storeA },
      onNoiseEvent: (event) => eventsA.push(event),
    });

    await contaminatorA.recordMoment({
      summary: '宝箱に何度も挨拶しに行った件',
      source: 'user',
    });
    // First turn advances the rhythm counter so the moment becomes eligible.
    await contaminatorA.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.7,
      forceTilt: true,
    });
    eventsA.length = 0;
    const resultA = await contaminatorA.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.7,
      forceTilt: true,
    });

    expect(resultA.plan.interventions.map((item) => item.kind)).toContain(
      'callback'
    );
    expect(eventsA.some((event) => event.type === 'callback_used')).toBe(true);
    const memoryA = await storeA.load('cb-a');
    const momentA = memoryA?.memorableMoments.find((moment) =>
      moment.summary.includes('宝箱')
    );
    expect(momentA?.callbacks).toBe(1);

    // Case B: callback is planned, but the selected candidate never claims it.
    const storeB = new InMemoryNoiseMemoryStore();
    const eventsB: NoiseEvent[] = [];
    const contaminatorB = createContaminator({
      mode: 'bold',
      intensity: 0.85,
      model: jsonModel([
        {
          text: 'いまの質問、先にまとめて答えるね。締めは置いておく。',
          applied: ['break_clean_closing'],
        },
      ]),
      memory: { scopeId: 'cb-b', store: storeB },
      onNoiseEvent: (event) => eventsB.push(event),
    });

    await contaminatorB.recordMoment({
      summary: '宝箱に何度も挨拶しに行った件',
      source: 'user',
    });
    await contaminatorB.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.7,
      forceTilt: true,
    });
    eventsB.length = 0;
    const resultB = await contaminatorB.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      relationshipCapital: 0.7,
      forceTilt: true,
    });

    expect(resultB.plan.interventions.map((item) => item.kind)).toContain(
      'callback'
    );
    expect(eventsB.some((event) => event.type === 'callback_used')).toBe(false);
    const memoryB = await storeB.load('cb-b');
    const momentB = memoryB?.memorableMoments.find((moment) =>
      moment.summary.includes('宝箱')
    );
    expect(momentB?.callbacks).toBe(0);
  });

  it('ranks a candidate with an unplanned intervention below a planned one', () => {
    const before = PREDICTABLE_DRAFT;
    const context = createContextFingerprint({
      systemPrompt: 'AITuberです。',
      messages: [],
    });
    const evaluated = evaluateRewriteCandidates({
      before,
      context,
      mode: 'inversion',
      plannedInterventions: ['break_clean_closing'],
      candidates: [
        {
          text: '締めは置いておくね、なんてねw',
          appliedInterventions: ['break_clean_closing'],
        },
        {
          text: '締めは置いておくね、なんてねw',
          appliedInterventions: ['break_clean_closing', 'tsukkomi'],
        },
      ],
    });
    const selected = selectBestCandidate(evaluated, ['break_clean_closing']);

    expect(selected.index).toBe(0);
    expect(evaluated[1].evaluation.issues).toContain(
      'unplanned_teasing_intervention'
    );
  });
});
