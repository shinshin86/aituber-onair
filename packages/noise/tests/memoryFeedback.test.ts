import {
  InMemoryNoiseMemoryStore,
  createContaminator,
  createContextFingerprint,
  createInitialNoiseMemory,
  diagnosePredictability,
  type NoiseMemory,
  type RewriteModel,
} from '../src';

const CONTEXT = createContextFingerprint({
  systemPrompt: 'AITuberです。',
  messages: [{ role: 'user', content: '今日も楽しかった！' }],
});

function createStaticModel(text: string): RewriteModel {
  return {
    async generate() {
      return text;
    },
  };
}

describe('memory-driven predictability diagnosis', () => {
  it('flags a closing the character has repeated across turns', () => {
    const memory: NoiseMemory = {
      ...createInitialNoiseMemory(),
      recentClosings: [
        '次回も楽しみにしていてね。',
        '次回も楽しみにしていてね。',
      ],
    };
    const draft = '今日は配信に来てくれて感謝。次回も楽しみにしていてね。';

    const withMemory = diagnosePredictability({
      draft,
      context: CONTEXT,
      memory,
    });
    const withoutMemory = diagnosePredictability({ draft, context: CONTEXT });

    const issue = withMemory.issues.find(
      (item) => item.kind === 'generic_closing'
    );
    expect(issue?.evidence).toContain('multiple times');
    expect(withMemory.score).toBeGreaterThan(withoutMemory.score);
  });

  it('flags phrases the character has leaned on repeatedly', () => {
    const memory: NoiseMemory = {
      ...createInitialNoiseMemory(),
      repeatedPhrases: [{ phrase: 'ありがとう', count: 3 }],
    };

    const diagnosis = diagnosePredictability({
      draft: '今日も来てくれてありがとう。配信の音を先に直すね。',
      context: CONTEXT,
      memory,
    });

    expect(diagnosis.issues.map((item) => item.kind)).toContain(
      'repeated_phrase'
    );
  });

  it('flags a topic that keeps ending on the same closing', () => {
    const context = createContextFingerprint({
      systemPrompt: 'AITuberです。',
      messages: [{ role: 'user', content: '配信ありがとう！' }],
    });
    const memory: NoiseMemory = {
      ...createInitialNoiseMemory(),
      topicLoops: [
        {
          topic: context.topicHints[0],
          pattern: '次回も楽しみにしていてね。',
          count: 2,
        },
      ],
    };

    const diagnosis = diagnosePredictability({
      draft: '今日の配信はここまで。次回も楽しみにしていてね。',
      context,
      memory,
    });

    expect(diagnosis.issues.map((item) => item.kind)).toContain('too_complete');
  });

  it('feeds recorded closings back into contaminate() diagnosis', async () => {
    const store = new InMemoryNoiseMemoryStore();
    const contaminator = createContaminator({
      intensity: 0.7,
      model: createStaticModel(
        '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。'
      ),
      memory: { scopeId: 'feedback', store },
    });
    const input = {
      systemPrompt: 'AITuberです。',
      messages: [],
      draft:
        '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。',
      forceTilt: true,
    };

    await contaminator.contaminate(input);
    await contaminator.contaminate(input);
    const third = await contaminator.contaminate(input);

    const closingIssue = third.diagnosis.issues.find(
      (item) => item.kind === 'generic_closing'
    );
    expect(closingIssue?.evidence).toContain('multiple times');
  });
});
