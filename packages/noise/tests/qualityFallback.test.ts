import { createContaminator, type NoiseEvent, type RewriteModel } from '../src';

const PREDICTABLE_DRAFT =
  '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。';

// Persona-drift wording triggers an error-severity quality issue.
const HOSTILE_REWRITE = 'うるさい、同じ話ばかりしないで。黙れって。';

function createStaticModel(text: string): RewriteModel {
  return {
    async generate() {
      return text;
    },
  };
}

describe('fallbackToDraftOnQualityFail', () => {
  it('returns the draft when every candidate fails the quality report', async () => {
    const events: NoiseEvent[] = [];
    const contaminator = createContaminator({
      intensity: 0.8,
      fallbackToDraftOnQualityFail: true,
      model: createStaticModel(HOSTILE_REWRITE),
      onNoiseEvent: (event) => events.push(event),
    });

    const result = await contaminator.contaminate({
      systemPrompt: '穏やかなAITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    });

    expect(result.text).toBe(PREDICTABLE_DRAFT);
    expect(result.skipped?.reason).toBe('quality_fail');
    expect(result.applied).toHaveLength(0);
    expect(result.quality.passed).toBe(false);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(
      events.some(
        (event) =>
          event.type === 'noise_skipped' && event.reason === 'quality_fail'
      )
    ).toBe(true);
    expect(events.some((event) => event.type === 'tilt_applied')).toBe(false);
  });

  it('returns the rewrite by default even when quality fails', async () => {
    const contaminator = createContaminator({
      intensity: 0.8,
      model: createStaticModel(HOSTILE_REWRITE),
    });

    const result = await contaminator.contaminate({
      systemPrompt: '穏やかなAITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    });

    expect(result.text).toBe(HOSTILE_REWRITE);
    expect(result.skipped).toBeUndefined();
    expect(result.quality.passed).toBe(false);
  });

  it('does not touch passing rewrites', async () => {
    const contaminator = createContaminator({
      intensity: 0.7,
      fallbackToDraftOnQualityFail: true,
      model: createStaticModel(
        '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。'
      ),
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    });

    expect(result.skipped).toBeUndefined();
    expect(result.text).toContain('綺麗に閉じすぎない');
  });
});
