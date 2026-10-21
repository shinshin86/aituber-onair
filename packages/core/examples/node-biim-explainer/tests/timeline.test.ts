import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateScript } from '../src/schema.js';
import {
  estimateDurations,
  resolveTimeline,
  seekTime,
} from '../src/timeline.js';
import { subtitlePages, wrapText } from '../src/subtitles.js';
import { tempoFilters } from '../src/media.js';
import type { BiimScript } from '../src/types.js';

async function fixture(): Promise<BiimScript> {
  return JSON.parse(await readFile('samples/biim-hello-sine.json', 'utf8'));
}

describe('schema and semantic validation', () => {
  it('accepts one or two speakers and reports invalid shapes precisely', async () => {
    const script = await fixture();
    await expect(
      validateScript(script, path.resolve('samples')),
    ).resolves.toEqual(script);
    script.speakers.bob = structuredClone(script.speakers.dango);
    await expect(
      validateScript(script, path.resolve('samples')),
    ).resolves.toBeDefined();
    script.speakers.third = structuredClone(script.speakers.dango);
    await expect(
      validateScript(script, path.resolve('samples')),
    ).rejects.toThrow('speakers: must NOT have more than 2 properties');
    script.speakers = {};
    await expect(validateScript(script, '.')).rejects.toThrow(
      'speakers: must NOT have fewer than 1 properties',
    );
  });
  it('aggregates unknown speakers, duplicate IDs, missing anchors and files', async () => {
    const script = await fixture();
    script.lines[1].speaker = 'missing';
    script.lines[1].id = 'intro-1';
    script.main = [{ at: '@missing', image: 'missing.png' }];
    const error = await validateScript(script, path.resolve('samples')).catch(
      (e: Error) => e,
    );
    expect(String(error)).toContain('lines[1].speaker');
    expect(String(error)).toContain('lines[1].id');
    expect(String(error)).toContain('main[0].at');
    expect(String(error)).toContain('main[0].image');
  });
  it('rejects cycles, invalid silent captions and conflicting widgets', async () => {
    const script = await fixture();
    script.lines[0].at = '@intro-2';
    await expect(
      validateScript(script, path.resolve('samples')),
    ).rejects.toThrow('cyclic');
    script.lines[0].at = undefined;
    script.lines[0].spoken = false;
    await expect(
      validateScript(script, path.resolve('samples')),
    ).rejects.toThrow('lines[0].duration');
    script.lines[0].duration = 2;
    script.panels?.push({ at: 0, box: 'bottom', text: 'conflict' });
    await expect(
      validateScript(script, path.resolve('samples')),
    ).rejects.toThrow('counter: cannot share bottom');
  });
  it('catches known numeric overlap without synthesis', async () => {
    const script = await fixture();
    script.lines = [
      { speaker: 'dango', text: 'silent', spoken: false, duration: 2 },
      { speaker: 'dango', text: 'next', at: 1 },
    ];
    script.main = undefined;
    script.panels = undefined;
    script.timer = undefined;
    script.counter = undefined;
    await expect(
      validateScript(script, path.resolve('samples')),
    ).rejects.toThrow('lines[1].at: must be >= previous line end');
  });
  it('requires exactly one content kind and rejects non-video playback options', async () => {
    const script = await fixture();
    script.main = [{ at: 0, color: '#000000', image: 'other.png' }];
    await expect(validateScript(script, '.')).rejects.toThrow('main[0]');
    script.main = [{ at: 0, color: '#000000', speed: 2 }];
    await expect(validateScript(script, '.')).rejects.toThrow('main[0]');
  });
  it('validates independently known media/panel/timer times without speech estimates', async () => {
    const script = await fixture();
    script.main = [
      { at: 0, until: 5, color: '#000000' },
      { at: 4, color: '#ffffff' },
    ];
    script.panels = [
      { at: 3, box: 'main', text: 'late' },
      { at: 2, box: 'main', clear: true },
    ];
    script.timer = { start: 3, stop: 2 };
    const error = await validateScript(script, path.resolve('samples')).catch(
      (e: Error) => e,
    );
    expect(String(error)).toContain('main[1].at');
    expect(String(error)).toContain('panels[1].at');
    expect(String(error)).toContain('timer.stop');
    script.main = [{ at: '@intro-1-0.5', color: '#000000' }];
    await expect(
      validateScript(script, path.resolve('samples')),
    ).rejects.toThrow('main[0].at: must resolve to nonnegative');
  });
  it('allows a forward anchor when its target has an independent start', async () => {
    const script = await fixture();
    script.lines[0].at = '@intro-2-10';
    script.lines[1].at = 20;
    await expect(
      validateScript(script, path.resolve('samples')),
    ).resolves.toBeDefined();
    const timeline = resolveTimeline(script, [2, 2, 2, 2], false);
    expect(timeline.lines[0].start).toBe(10);
    expect(timeline.lines[1].start).toBe(20);
  });
});

describe('resolved timeline', () => {
  it('resolves sequential lines, exact hyphenated IDs, offsets, end and persistence', async () => {
    const script = await fixture();
    const timeline = resolveTimeline(script, [2, 3, 4, 5], false);
    expect(timeline.lines[1].start).toBeCloseTo(2.3);
    expect(seekTime('@intro-2', timeline)).toBeCloseTo(2.3);
    expect(seekTime('@intro-2-0.5', timeline)).toBeCloseTo(1.8);
    expect(seekTime('@intro-2:end+1.5', timeline)).toBeCloseTo(6.8);
    expect(timeline.panels[1].end).toBeCloseTo(2.5);
    expect(timeline.main[2].playbackEnd).toBeCloseTo(
      timeline.main[2].start + 2,
    );
    expect(timeline.main[2].end).toBeGreaterThan(
      timeline.main[2].playbackEnd as number,
    );
    expect(timeline.timer?.stop).toBeCloseTo(timeline.lines[3].end);
    expect(timeline.counter?.events[3].end).toBe(timeline.duration);
  });
  it('allows later explicit starts but rejects line and media overlap', async () => {
    const script = await fixture();
    script.lines[1].at = 8;
    expect(resolveTimeline(script, [2, 2, 2, 2], false).lines[1].start).toBe(8);
    script.lines[1].at = 1;
    expect(() => resolveTimeline(script, [2, 2, 2, 2], false)).toThrow(
      'lines[1].at',
    );
    script.lines[1].at = undefined;
    script.main = [
      { at: 0, until: 4, color: '#000000' },
      { at: 3, color: '#ffffff' },
    ];
    expect(() => resolveTimeline(script, [2, 2, 2, 2], false)).toThrow(
      'overlaps previous main slot',
    );
  });
  it('rejects unknown anchors, negative resolved times, reverse panel order and clock range', async () => {
    const script = await fixture();
    script.panels = [
      { at: '@intro-1-1', box: 'top', text: 'negative' },
      { at: '@unknown', box: 'main', clear: true },
    ];
    expect(() => resolveTimeline(script, [2, 2, 2, 2], true)).toThrow(
      'panels[0].at',
    );
    script.panels = [
      { at: 3, box: 'top', text: 'late' },
      { at: 2, box: 'top', text: 'early' },
    ];
    script.timer = { start: 5, stop: 4 };
    expect(() => resolveTimeline(script, [2, 2, 2, 2], true)).toThrow(
      'chronological',
    );
    script.panels = [];
    expect(() => resolveTimeline(script, [2, 2, 2, 2], true)).toThrow(
      'timer.stop',
    );
  });
  it('estimates reading length, preserving explicit silent durations', async () => {
    const script = await fixture();
    script.lines = [
      { speaker: 'dango', text: 'display', reading: '12345678' },
      { speaker: 'dango', text: 'caption', spoken: false, duration: 3 },
    ];
    expect(estimateDurations(script, 4)).toEqual([2, 3]);
  });
});

describe('text and audio utilities', () => {
  it('pages Japanese and long Latin tokens without losing content or leading punctuation', () => {
    const text =
      '動画を切り替えながら、長い解説文を読みやすい長さで表示します。'.repeat(
        8,
      );
    const pages = subtitlePages(text, 1440, true);
    expect(pages.length).toBeGreaterThan(2);
    expect(pages.every((p) => p.length <= 2)).toBe(true);
    expect(pages.flat().join('')).toBe(text);
    expect(pages.flat().every((row) => !/^[、。]/u.test(row))).toBe(true);
    expect(
      wrapText('superlongtokenwithoutspaces'.repeat(8), 200).length,
    ).toBeGreaterThan(2);
    expect(wrapText('hello world from canvas', 300).join(' ')).toContain(
      'hello',
    );
    expect(
      subtitlePages(
        '右側には要点を並べ、下には字幕を表示しています。',
        1440,
        true,
      )[0],
    ).toEqual(['右側には要点を並べ、下には字幕を', '表示しています。']);
  });
  it('builds legal atempo chains for very fast and slow playback', () => {
    expect(tempoFilters(8)).toBe('atempo=2,atempo=2,atempo=2');
    expect(tempoFilters(0.125)).toBe('atempo=0.5,atempo=0.5,atempo=0.5');
  });
});
