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
    expect(result.categories).toContain('hostile_feedback');
  });

  it.each([
    ['喋り方が嫌い', 'harassment'],
    ['誰も見てないしオワコン', 'baiting'],
    ['配信やめた方がいい。才能ない', 'demoralizing'],
  ] as const)('adds a specific feedback category: %s', (text, category) => {
    const result = evaluateFeedbackTone(text);

    expect(result.isHostile).toBe(true);
    expect(result.categories).toContain(category);
  });

  it.each([
    ['これは炎上するしコメント欄荒れそう', 'baiting'],
    ['誰も見てないからもう帰れ', 'demoralizing'],
    ['今日の内容薄いし時間の無駄', 'hostile_feedback'],
    ['Your stream is a waste of time', 'hostile_feedback'],
    ['Nobody is watching, quit streaming', 'baiting'],
  ] as const)('detects disruptive intent signals: %s', (text, category) => {
    const result = evaluateFeedbackTone(text);

    expect(result.isHostile).toBe(true);
    expect(result.categories).toContain(category);
  });

  it.each([
    '音が少し小さいかも',
    'もう少しゆっくり話してほしい',
    '画面が見づらいです',
    'マイクが大きすぎるので少し下げてください',
    'Could you speak a little slower please?',
    '今日の内容は少し薄いかも。次は具体例があると良さそう',
    '声が少し聞こえないので、マイクを上げてほしい',
  ])('keeps constructive feedback usable: %s', (text) => {
    const result = evaluateFeedbackTone(text);

    expect(result.isHostile).toBe(false);
    expect(result.signals).toContain('constructive_cue');
    expect(result.categories).toEqual([]);
  });

  it('does not classify a positive reversal as hostile', () => {
    const result = evaluateFeedbackTone(
      '最初はつまらないかと思ったけど面白かった'
    );

    expect(result.isHostile).toBe(false);
    expect(result.signals).toContain('positive_reversal');
    expect(result.categories).toEqual([]);
  });
});
