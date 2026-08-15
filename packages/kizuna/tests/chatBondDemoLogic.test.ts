import { describe, expect, it } from 'vitest';
import {
  classifyInput,
  formatPoints,
  formatSignedPoints,
  normalizeInput,
  selectScriptedReply,
} from '../examples/chat-bond-sample/src/demoLogic';

describe('chat bond demo input classifier', () => {
  it.each([
    ['ヤダ', 'やだ'],
    ['やだー！', 'やだ'],
    ['イヤ', 'いや'],
    ['ＳＨＵＴ－ＵＰ', 'shut up'],
  ])('normalizes %s before matching', (input, normalized) => {
    expect(normalizeInput(input)).toBe(normalized);
  });

  it.each(['ヤダ', 'やだー', 'イヤだ', 'きらい', 'うざい', 'stupid'])(
    'classifies %s as a light negative contact',
    (input) => {
      expect(classifyInput(input)).toMatchObject({
        tone: 'negative',
        valence: 'negative',
        severity: 'light',
      });
    },
  );

  it.each([
    '死ね',
    '消えろ',
    '大嫌い',
    '殺すぞ',
    '二度と来るな',
    '存在価値ない',
    '裏切り者',
    'kill yourself',
    'worthless',
  ])('classifies %s as a grave contact', (input) => {
    expect(classifyInput(input)).toMatchObject({
      tone: 'grave',
      valence: 'negative',
      severity: 'grave',
    });
  });

  it.each([
    '好きじゃない',
    '好きになれない',
    'かわいくない',
    '会いたくない',
    '話したくない',
    '聞きたくない',
    '必要ない',
    '二度と見ない',
    '信じられない',
    "don't like it",
  ])('keeps the negated positive phrase %s negative', (input) => {
    const result = classifyInput(input);
    expect(result.score).toBeLessThan(0);
    expect(result.tone).toBe('negative');
  });

  it('gives negative language priority over a question mark', () => {
    expect(classifyInput('イヤだ？').tone).toBe('negative');
  });

  it.each([
    '嫌だ',
    '無理',
    '話しかけるな',
    'まぬけ',
    'うるせえ',
    '気分悪い',
    'つまんない',
    '飽きた',
    '使えない',
    '期待外れ',
    '信用できない',
    'go away',
    'garbage',
    'pathetic',
  ])('classifies expanded term %s as negative', (input) => {
    expect(classifyInput(input)).toMatchObject({
      tone: 'negative',
      valence: 'negative',
      severity: 'light',
    });
  });

  it.each([
    '機嫌どう？',
    '機嫌なおして',
    '無理しないでね',
    'いやー、すごい！',
    '飽きないね',
    '信じられない！最高！',
  ])('does not misclassify counter-example %s as negative', (input) => {
    expect(classifyInput(input).valence).not.toBe('negative');
  });

  it.each([
    ['今日は最高！', 'positive'],
    ['大好き、ありがとう！', 'positive'],
    ['会いたかった、かわいい！', 'positive'],
    ['どう思う？', 'question'],
    ['今日は散歩したよ', 'normal'],
  ] as const)('classifies %s as %s', (input, tone) => {
    expect(classifyInput(input)).toMatchObject({ tone, valence: 'positive' });
  });

  it.each([
    ['grave', 'angry'],
    ['negative', 'angry'],
    ['question', 'curious'],
    ['positive', 'excited'],
    ['normal', 'calm'],
  ] as const)('maps %s input to a %s reply', (tone, emotion) => {
    expect(selectScriptedReply(tone, 0).emotion).toBe(emotion);
  });
});

describe('chat bond demo number formatting', () => {
  it('rounds floating-point dust to one decimal place', () => {
    expect(formatPoints(106.69999999999999)).toBe('106.7');
    expect(formatSignedPoints(6.699999999999999)).toBe('+6.7');
  });

  it('omits a decimal for whole values', () => {
    expect(formatPoints(100)).toBe('100');
  });
});
