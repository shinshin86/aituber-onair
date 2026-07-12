import { InMemoryNoiseMemoryStore, createContaminator } from '../src';

const PREDICTABLE_DRAFT =
  '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。';

describe('memory update serialization', () => {
  it('does not lose turns when contaminate calls overlap', async () => {
    const store = new InMemoryNoiseMemoryStore();
    const contaminator = createContaminator({
      intensity: 0.7,
      model: {
        async generate() {
          // Yield so an unserialized second call could interleave here.
          await new Promise((resolve) => setTimeout(resolve, 5));
          return '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。';
        },
      },
      memory: { scopeId: 'concurrent', store },
    });
    const input = {
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
      forceTilt: true,
    };

    const [first, second] = await Promise.all([
      contaminator.contaminate(input),
      contaminator.contaminate(input),
    ]);

    expect(first.turnId).toBe(0);
    expect(second.turnId).toBe(1);

    const memory = await store.load('concurrent');
    expect(memory?.rhythm.totalTurns).toBe(2);
    expect(memory?.recentResponses).toHaveLength(2);
  });

  it('serializes reactions against in-flight turns', async () => {
    const store = new InMemoryNoiseMemoryStore();
    const contaminator = createContaminator({
      intensity: 0.7,
      model: {
        async generate() {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。';
        },
      },
      memory: { scopeId: 'concurrent-reaction', store },
    });

    const [result, reaction] = await Promise.all([
      contaminator.contaminate({
        systemPrompt: 'AITuberです。',
        messages: [],
        draft: PREDICTABLE_DRAFT,
        forceTilt: true,
      }),
      contaminator.reportReaction({ signal: 'laughter' }),
    ]);

    // The reaction ran after the queued turn, so it saw the recorded tilt.
    expect(result.turnId).toBe(0);
    expect(reaction.promotedMoment).toBeDefined();

    const memory = await store.load('concurrent-reaction');
    expect(memory?.rhythm.totalTurns).toBe(1);
    expect(memory?.violationBudget).toBe(1);
  });
});
