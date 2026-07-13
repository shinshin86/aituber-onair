import { inferReactionFromComments } from '../src';

describe('inferReactionFromComments', () => {
  it('reads an empty chat as silence', () => {
    expect(inferReactionFromComments([]).signal).toBe('silence');
    expect(inferReactionFromComments(['  ']).signal).toBe('silence');
  });

  it('reads laughter tokens as laughter', () => {
    expect(
      inferReactionFromComments(['草', 'それはwww', '今日のゲームなに？'])
        .signal
    ).toBe('laughter');
    expect(inferReactionFromComments(['lol that was good']).signal).toBe(
      'laughter'
    );
  });

  it('reads affection without laughter as positive', () => {
    expect(inferReactionFromComments(['かわいい', '今の返し好き']).signal).toBe(
      'positive'
    );
  });

  it('reads "it fell flat" markers as pushback', () => {
    const reaction = inferReactionFromComments(['今のスベったw', '寒い']);

    expect(reaction.signal).toBe('pushback');
  });

  it('lets laughter outweigh a single pushback comment', () => {
    const reaction = inferReactionFromComments([
      '草',
      'www',
      'ワロタ',
      '寒いって',
    ]);

    expect(reaction.signal).toBe('laughter');
  });

  it('treats any discomfort marker as discomfort even amid laughter', () => {
    const reaction = inferReactionFromComments(['草', 'それはドン引きだわ']);

    expect(reaction.signal).toBe('discomfort');
  });

  it('falls back to neutral for ordinary chatter', () => {
    const reaction = inferReactionFromComments([
      '今日のゲームなに？',
      'こんばんは',
    ]);

    expect(reaction.signal).toBe('neutral');
    expect(reaction.detail).toContain('across 2 comments');
  });
});
