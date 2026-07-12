import { createContaminator, type NoiseEvent } from '../src';

const PREDICTABLE_DRAFT =
  '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。';

describe('rewrite model failsafe', () => {
  it('returns the draft unchanged when the rewrite model throws', async () => {
    const events: NoiseEvent[] = [];
    const contaminator = createContaminator({
      intensity: 0.7,
      model: {
        async generate() {
          throw new Error('provider is down');
        },
      },
      onNoiseEvent: (event) => events.push(event),
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    });

    expect(result.text).toBe(PREDICTABLE_DRAFT);
    expect(result.skipped?.reason).toBe('model_error');
    expect(result.skipped?.detail).toContain('provider is down');
    expect(result.applied).toHaveLength(0);
    expect(
      events.some(
        (event) =>
          event.type === 'noise_skipped' && event.reason === 'model_error'
      )
    ).toBe(true);
  });

  it('keeps working on the next turn after a model failure', async () => {
    let calls = 0;
    const contaminator = createContaminator({
      intensity: 0.7,
      model: {
        async generate() {
          calls += 1;

          if (calls === 1) {
            throw new Error('transient failure');
          }

          return '今日は来てくれてありがとう。綺麗に閉じすぎないでおくね。';
        },
      },
    });
    const input = {
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    };

    const first = await contaminator.contaminate(input);
    expect(first.skipped?.reason).toBe('model_error');

    const second = await contaminator.contaminate(input);
    expect(second.skipped).toBeUndefined();
    expect(second.text).toContain('綺麗に閉じすぎない');
  });

  it('aborts a hanging rewrite model after modelTimeoutMs', async () => {
    const contaminator = createContaminator({
      intensity: 0.7,
      modelTimeoutMs: 20,
      model: {
        generate() {
          return new Promise(() => {
            // Never resolves.
          });
        },
      },
    });

    const result = await contaminator.contaminate({
      systemPrompt: 'AITuberです。',
      messages: [],
      draft: PREDICTABLE_DRAFT,
    });

    expect(result.skipped?.reason).toBe('model_error');
    expect(result.skipped?.detail).toContain('timed out after 20ms');
    expect(result.text).toBe(PREDICTABLE_DRAFT);
  });
});
