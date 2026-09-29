import { extractKeywords } from '../src/shared/keywords.js';
import { buildTimeline, POOLS } from '../src/shared/schedule.js';
import { normalizeEmotion, parseArgs } from '../src/gen/cli.js';
import { resolveLocalAssetPath } from '../src/gen/stage.js';
import type { TimedLine } from '../src/types.js';

function line(
  index: number,
  start: number,
  end: number,
  extra: Partial<TimedLine> = {},
): TimedLine {
  return {
    index,
    text: `line ${index}`,
    chapter: null,
    point: null,
    keywords: [],
    emotion: 'neutral',
    spoken: true,
    start,
    end,
    ...extra,
  };
}

describe('keywords', () => {
  it('picks numbers with units and quoted terms', () => {
    expect(extractKeywords('表情は6種類、速度は3.2倍です。')).toEqual([
      '6種類',
      '3.2倍',
    ]);
    expect(extractKeywords('新機能「字幕」を追加。v1.2.3 です')).toEqual([
      '字幕',
      'v1.2.3',
    ]);
    expect(extractKeywords('1つずつ、1 と 2 は無視')).toEqual(['1つ']);
  });
});

describe('director timeline', () => {
  const lines = [
    line(0, 1, 3, { chapter: 'はじめに', emotion: 'happy' }),
    line(1, 3.5, 6, { point: '要点A', keywords: ['10倍'] }),
    line(2, 7, 9, { chapter: '次の話題', emotion: 'surprised' }),
    line(3, 9.5, 12, { emotion: 'sad' }),
  ];

  it('opens with a greeting, marks topic changes, closes with a sign-off', () => {
    const t = buildTimeline(lines, 14, 1);
    const plays = t.actions.filter((a) => a.action.type === 'play');
    expect(plays[0].action).toEqual({ type: 'play', id: 'greet' });
    expect(t.transitions).toHaveLength(1);
    expect(t.transitions[0]).toBeCloseTo(6.65);
    expect(t.chapters.map((c) => c.title)).toEqual(['はじめに', '次の話題']);
    const last = plays.at(-1);
    expect(POOLS.closing).toContain((last?.action as { id: string }).id);
  });

  it('only picks motions from the pool for the moment', () => {
    const allowed = new Set<string>([
      ...POOLS.opening,
      ...POOLS.closing,
      ...POOLS.topicChange,
      ...POOLS.betweenLines,
      ...Object.values(POOLS.lineStart)
        .flat()
        .filter((v): v is string => Boolean(v)),
    ]);
    for (let seed = 0; seed < 20; seed += 1) {
      for (const a of buildTimeline(lines, 14, seed).actions) {
        if (a.action.type === 'play')
          expect(allowed.has(a.action.id)).toBe(true);
      }
    }
  });

  it('is repeatable per seed and sets each line emotion at its start', () => {
    expect(buildTimeline(lines, 14, 5)).toEqual(buildTimeline(lines, 14, 5));
    const emotions = buildTimeline(lines, 14, 5).actions.filter(
      (a) => a.action.type === 'emotion',
    );
    expect(emotions.slice(0, 4).map((a) => a.time)).toEqual([1, 3.5, 7, 9.5]);
  });

  it('places keyword pop-ups during their line and points in their chapter', () => {
    const t = buildTimeline(lines, 14, 1);
    expect(t.popups).toHaveLength(1);
    expect(t.popups[0].start).toBeGreaterThanOrEqual(3.5);
    expect(t.popups[0].start).toBeLessThan(6);
    expect(t.points).toEqual([
      { chapter: 0, text: '要点A', start: 3.5, lineIndex: 1 },
    ]);
  });
});

describe('CLI helpers', () => {
  it('parses frame export flags and normalizes emotions', () => {
    expect(
      parseArgs(['--script', 'a.json', '--frame', '3', '--png', 'x.png']),
    ).toMatchObject({
      script: 'a.json',
      frame: 3,
      png: 'x.png',
    });
    expect(normalizeEmotion('happy')).toBe('happy');
    expect(normalizeEmotion('excited')).toBe('neutral');
  });

  it('serves avatar files only from inside the avatar folder', () => {
    expect(
      resolveLocalAssetPath('/a/avatar', '/avatar/', '/avatar/sprites/x.png'),
    ).toBe('/a/avatar/sprites/x.png');
    expect(
      resolveLocalAssetPath('/a/avatar', '/avatar/', '/avatar/../secret'),
    ).toBeNull();
  });
});
