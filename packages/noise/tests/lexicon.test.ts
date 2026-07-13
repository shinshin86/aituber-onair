import {
  createContaminator,
  createContextFingerprint,
  diagnosePredictability,
  evaluateRewriteCandidates,
  hasPlayMarker,
  scoreGenericity,
  scorePredictability,
  type NoiseLexicon,
  type RewriteModel,
} from '../src';

const LEXICON: NoiseLexicon = {
  predictablePhrases: ['それでは今日のまとめコーナー'],
  stockReplies: ['ﾅｲｽﾌｧｲﾄです'],
  playMarkers: ['にゃはは'],
};

const CONTEXT = createContextFingerprint({
  systemPrompt: 'AITuberです。',
  messages: [{ role: 'user', content: '今日も配信ありがとう' }],
});

function createStaticModel(text: string): RewriteModel {
  return {
    async generate() {
      return text;
    },
  };
}

describe('custom lexicon', () => {
  it('raises the predictability score for app-marked phrases', () => {
    const draft = 'それでは今日のまとめコーナー、いってみよう。';

    expect(
      scorePredictability({ draft, context: CONTEXT, lexicon: LEXICON })
    ).toBeGreaterThan(scorePredictability({ draft, context: CONTEXT }));
  });

  it('adds a diagnosis issue for app-marked phrases', () => {
    const diagnosis = diagnosePredictability({
      draft: 'それでは今日のまとめコーナー、いってみよう。',
      context: CONTEXT,
      lexicon: LEXICON,
    });

    const issue = diagnosis.issues.find(
      (item) => item.kind === 'repeated_phrase'
    );
    expect(issue?.evidence).toContain('app lexicon');
  });

  it('counts app-marked stock replies in the genericity penalty', () => {
    expect(
      scoreGenericity({ text: 'ﾅｲｽﾌｧｲﾄです！', lexicon: LEXICON })
    ).toBeGreaterThanOrEqual(0.5);
    expect(scoreGenericity({ text: 'ﾅｲｽﾌｧｲﾄです！' })).toBe(0);
  });

  it('accepts character-specific play markers', () => {
    expect(hasPlayMarker('その質問、答えは秘密。にゃはは。', LEXICON)).toBe(
      true
    );
    expect(hasPlayMarker('その質問、答えは秘密。')).toBe(false);
  });

  it('clears missing_play_marker for teasing candidates using a custom marker', () => {
    const evaluated = evaluateRewriteCandidates({
      before:
        '同じ質問が何度か流れていますが、順番に答えていくので少し待っていてくださいね。',
      context: CONTEXT,
      mode: 'inversion',
      lexicon: LEXICON,
      candidates: [
        {
          text: '同じ質問、また来た。先に今日のゲームだけ出しちゃう。にゃはは。',
          appliedInterventions: ['contrarian_reframe'],
        },
      ],
    });

    expect(evaluated[0].evaluation.issues).not.toContain('missing_play_marker');
  });

  it('flows from createContaminator options into the diagnosis', async () => {
    const contaminator = createContaminator({
      intensity: 0.7,
      lexicon: LEXICON,
      model: createStaticModel('まとめコーナーはお休みして、雑談を続けるね。'),
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: 'それでは今日のまとめコーナー、いってみよう。また明日ね。',
      forceTilt: true,
    });

    expect(
      result.diagnosis.issues.some((item) =>
        item.evidence.includes('app lexicon')
      )
    ).toBe(true);
  });
});

describe('language-aware specificity', () => {
  it('recognizes English concrete actions as specific', () => {
    const context = createContextFingerprint({
      systemPrompt: 'An AITuber who reads the chat.',
      messages: [{ role: 'user', content: 'the stream feels slow today' }],
    });

    const diagnosis = diagnosePredictability({
      draft:
        'Let me pause the game here first and check the audio before we keep going anywhere.',
      context,
    });

    expect(diagnosis.issues.map((item) => item.kind)).not.toContain(
      'low_specificity'
    );
  });
});
