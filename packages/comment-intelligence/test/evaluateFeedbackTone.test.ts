import { describe, expect, it } from 'vitest';
import { evaluateFeedbackTone } from '../src/safety/evaluateFeedbackTone';

describe('evaluateFeedbackTone', () => {
  it.each([
    'この配信つまらない。喋り方が嫌い',
    'つまらない',
    '喋り方が嫌い',
    'This stream is boring',
    'I hate the way you talk',
  ])('classifies non-constructive hostile feedback: %s', (text) => {
    const result = evaluateFeedbackTone(text);

    expect(result.isHostile).toBe(true);
    expect(result.signals).toContain('negative_stance');
    expect(result.signals).toContain('non_constructive');
  });

  it.each([
    '音が少し小さいかも',
    'もう少しゆっくり話してほしい',
    '画面が見づらいです',
    'マイクが大きすぎるので少し下げてください',
    'Could you speak a little slower please?',
  ])('keeps constructive feedback usable: %s', (text) => {
    const result = evaluateFeedbackTone(text);

    expect(result.isHostile).toBe(false);
    expect(result.signals).toContain('constructive_cue');
  });

  it('does not classify a positive reversal as hostile', () => {
    const result = evaluateFeedbackTone(
      '最初はつまらないかと思ったけど面白かった'
    );

    expect(result.isHostile).toBe(false);
    expect(result.signals).toContain('positive_reversal');
  });
});
