import {
  buildFrictionParameters,
  buildInterventionPlan,
  createContextFingerprint,
  diagnosePredictability,
  generateRewriteCandidates,
  type RewriteModel,
} from '../src';

const DRAFT =
  '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。';

function createStaticModel(text: string): RewriteModel {
  return {
    async generate() {
      return text;
    },
  };
}

async function generateWith(model: RewriteModel) {
  const context = createContextFingerprint({
    systemPrompt: 'AITuberです。',
    messages: [{ role: 'user', content: '今日も楽しかった！！' }],
  });
  const diagnosis = diagnosePredictability({ draft: DRAFT, context });
  const plan = buildInterventionPlan({
    diagnosis,
    context,
    intensity: 0.7,
    mode: 'performer',
  });
  const friction = buildFrictionParameters({ diagnosis, context, plan });

  return generateRewriteCandidates({
    draft: DRAFT,
    systemPrompt: 'AITuberです。',
    messages: [{ role: 'user', content: '今日も楽しかった！！' }],
    context,
    plan,
    friction,
    model,
    mode: 'performer',
    candidateCount: 3,
  });
}

describe('generateRewriteCandidates parse robustness', () => {
  it('falls back to the draft when the JSON is truncated mid-output', async () => {
    const candidates = await generateWith(
      createStaticModel(
        '{ "candidates": [{ "text": "今日は来てくれてありがとう。締めはまだ決めて'
      )
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toBe(DRAFT);
    expect(candidates[0].appliedInterventions).toHaveLength(0);
  });

  it('falls back to the draft when the JSON parses but has no candidates', async () => {
    const candidates = await generateWith(
      createStaticModel('{ "candidates": [] }')
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toBe(DRAFT);
  });

  it('falls back to the draft when a fenced JSON block is malformed', async () => {
    const candidates = await generateWith(
      createStaticModel('```json\n{ "candidates": [{ "text": }] }\n```')
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toBe(DRAFT);
  });

  it('keeps plain-text responses as a compatibility mode', async () => {
    const rewritten =
      '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。';
    const candidates = await generateWith(createStaticModel(rewritten));

    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toBe(rewritten);
    expect(candidates[0].appliedInterventions.length).toBeGreaterThan(0);
  });

  it('still parses a valid fenced JSON block', async () => {
    const candidates = await generateWith(
      createStaticModel(
        [
          '```json',
          JSON.stringify({
            candidates: [
              {
                text: '今日は来てくれてありがとう。締めは置いておくね。',
                applied: ['break_clean_closing'],
                typicality: 0.3,
              },
            ],
          }),
          '```',
        ].join('\n')
      )
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].text).toContain('締めは置いておくね');
    expect(candidates[0].appliedInterventions).toContain('break_clean_closing');
  });
});
