import {
  InMemoryNoiseMemoryStore,
  createContaminator,
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

function createTestContaminator() {
  const store = new InMemoryNoiseMemoryStore();
  const contaminator = createContaminator({
    intensity: 0.7,
    model: createStaticModel(
      '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。'
    ),
    memory: { scopeId: 'turn-link', store },
  });

  return { contaminator, store };
}

const INPUT = {
  systemPrompt: 'AITuberです。',
  messages: [],
  draft: PREDICTABLE_DRAFT,
  forceTilt: true,
};

describe('reaction-to-turn linkage', () => {
  it('exposes a turnId that matches the recorded tilt', async () => {
    const { contaminator, store } = createTestContaminator();

    const first = await contaminator.contaminate(INPUT);
    const memory = await store.load('turn-link');

    expect(first.turnId).toBe(0);
    expect(memory?.lastTilt?.turn).toBe(first.turnId);

    const second = await contaminator.contaminate(INPUT);
    expect(second.turnId).toBe(1);
  });

  it('promotes the tilt when the reaction carries its turnId', async () => {
    const { contaminator } = createTestContaminator();
    const result = await contaminator.contaminate(INPUT);

    const reaction = await contaminator.reportReaction({
      signal: 'laughter',
      turnId: result.turnId,
    });

    expect(reaction.promotedMoment).toBeDefined();
  });

  it('does not promote a newer tilt from a stale reaction', async () => {
    const { contaminator } = createTestContaminator();
    const first = await contaminator.contaminate(INPUT);
    await contaminator.contaminate(INPUT);

    // The reaction belongs to the first tilt, but a second tilt has already
    // replaced lastTilt. The budget still moves; promotion must not happen.
    const reaction = await contaminator.reportReaction({
      signal: 'laughter',
      turnId: first.turnId,
    });

    expect(reaction.promotedMoment).toBeUndefined();
    expect(reaction.violationBudget).toBe(1);
  });

  it('keeps promoting without a turnId for backward compatibility', async () => {
    const { contaminator } = createTestContaminator();
    await contaminator.contaminate(INPUT);

    const reaction = await contaminator.reportReaction({ signal: 'laughter' });

    expect(reaction.promotedMoment).toBeDefined();
  });
});
