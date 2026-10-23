import { STYLE, canvasWidth } from './layout.js';
import { subtitlePages } from './subtitles.js';
import type { BiimScript, Time, Timeline, TimedLine } from './types.js';

export class ScriptError extends Error {
  constructor(public issues: string[]) {
    super(issues.join('\n'));
  }
}

/** Exact IDs win; otherwise match the longest existing ID plus a suffix. */
export function parseAnchor(value: string, ids: Map<string, number>) {
  const body = value.slice(1);
  if (ids.has(body))
    return { index: ids.get(body) as number, end: false, offset: 0 };
  for (const id of [...ids.keys()].sort((a, b) => b.length - a.length)) {
    if (!body.startsWith(id)) continue;
    const suffix = body.slice(id.length);
    const match = /^(?::end)?([+-]\d+(?:\.\d+)?)?$/.exec(suffix);
    if (match)
      return {
        index: ids.get(id) as number,
        end: suffix.startsWith(':end'),
        offset: Number(match[1] ?? 0),
      };
  }
  throw new Error(`unknown line anchor ${value}`);
}

export function resolveTimeline(
  script: BiimScript,
  durations: number[],
  estimated: boolean,
): Timeline {
  const issues: string[] = [];
  const ids = new Map<string, number>();
  script.lines.forEach((line, i) => {
    if (line.id) ids.set(line.id, i);
  });
  const states = new Array<number>(script.lines.length).fill(0);
  const lines: TimedLine[] = [];
  function time(value: Time, location: string): number {
    try {
      const ref = typeof value === 'number' ? null : parseAnchor(value, ids);
      const result = ref
        ? (ref.end ? line(ref.index).end : line(ref.index).start) + ref.offset
        : (value as number);
      if (!Number.isFinite(result) || result < 0)
        throw new Error('must resolve to nonnegative finite seconds');
      return result;
    } catch (error) {
      issues.push(`${location}: ${(error as Error).message}`);
      return 0;
    }
  }
  function line(i: number): TimedLine {
    if (states[i] === 1) throw new Error('cyclic line timing dependency');
    if (states[i] === 2) return lines[i];
    states[i] = 1;
    const source = script.lines[i];
    const previous = i && source.at === undefined ? line(i - 1) : undefined;
    const start =
      source.at === undefined
        ? previous
          ? previous.end +
            (previous.pauseAfter ?? script.defaults?.pauseAfter ?? 0.3)
          : 0
        : time(source.at, `lines[${i}].at`);
    const end = start + durations[i];
    const pages = subtitlePages(
      source.text,
      canvasWidth(script.canvas),
      Object.keys(script.speakers).length === 2,
    );
    const weights = pages.map((rows) => rows.join('').length);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let cursor = start;
    lines[i] = {
      ...source,
      index: i,
      start,
      end,
      spoken: source.spoken !== false,
      pages: pages.map((rows, page) => {
        const pageStart = cursor;
        cursor += (durations[i] * weights[page]) / total;
        return { rows, start: pageStart, end: cursor };
      }),
    };
    states[i] = 2;
    return lines[i];
  }
  script.lines.forEach((_, i) => line(i));
  lines.forEach((current, i) => {
    if (i && current.start + 1e-8 < lines[i - 1].end)
      issues.push(
        `lines[${i}].at: must be >= previous line end (${lines[i - 1].end.toFixed(3)}s)`,
      );
  });
  const mainStarts = (script.main ?? []).map((item, i) =>
    time(item.at, `main[${i}].at`),
  );
  const explicitEnds = (script.main ?? []).map((item, i) =>
    item.until === undefined ? undefined : time(item.until, `main[${i}].until`),
  );
  const panelStarts = (script.panels ?? []).map((item, i) =>
    time(item.at, `panels[${i}].at`),
  );
  const counterStarts = (script.counter?.events ?? []).map((item, i) =>
    time(item.at, `counter.events[${i}].at`),
  );
  const timerStart = script.timer ? time(script.timer.start, 'timer.start') : 0;
  const timerStop =
    script.timer?.stop === undefined
      ? undefined
      : time(script.timer.stop, 'timer.stop');
  const last = lines[lines.length - 1];
  const duration = Math.max(
    last
      ? last.end + (last.pauseAfter ?? script.defaults?.pauseAfter ?? 0.3)
      : 0,
    ...explicitEnds.map((v) => v ?? 0),
    ...mainStarts,
    ...panelStarts,
    ...counterStarts,
    timerStart,
    timerStop ?? 0,
  );
  const main = (script.main ?? []).map((item, i) => {
    const start = mainStarts[i];
    const end = explicitEnds[i] ?? mainStarts[i + 1] ?? duration;
    if (end <= start)
      issues.push(`main[${i}].until: must be > start (${start}s)`);
    if (i && start < (explicitEnds[i - 1] ?? mainStarts[i]))
      issues.push(`main[${i}].at: overlaps previous main slot`);
    if (i && start < mainStarts[i - 1])
      issues.push(`main[${i}].at: must be chronological`);
    return {
      ...item,
      index: i,
      start,
      end,
      ...(item.video && item.to !== undefined
        ? {
            playbackEnd: Math.min(
              end,
              start + (item.to - (item.from ?? 0)) / (item.speed ?? 1),
            ),
          }
        : {}),
    };
  });
  const panels = (script.panels ?? []).map((item, i, all) => {
    const next = all.findIndex((other, j) => j > i && other.box === item.box);
    const start = panelStarts[i];
    const end = next < 0 ? duration : panelStarts[next];
    if (end < start)
      issues.push(
        `panels[${next}].at: must be chronological within ${item.box}`,
      );
    return { ...item, start, end };
  });
  const events = script.counter?.events.map((item, i) => {
    if (i && counterStarts[i] < counterStarts[i - 1])
      issues.push(`counter.events[${i}].at: must be chronological`);
    return {
      ...item,
      at: counterStarts[i],
      end: counterStarts[i + 1] ?? duration,
    };
  });
  if (timerStop !== undefined && timerStop < timerStart)
    issues.push('timer.stop: must be >= timer.start');
  if (issues.length) throw new ScriptError([...new Set(issues)]);
  return {
    estimated,
    width: canvasWidth(script.canvas),
    height: STYLE.height,
    fps: script.fps ?? 30,
    duration,
    lines,
    main,
    panels,
    ...(script.timer
      ? {
          timer: {
            ...script.timer,
            start: timerStart,
            stop: timerStop ?? duration,
          },
        }
      : {}),
    ...(script.counter
      ? { counter: { label: script.counter.label, events: events ?? [] } }
      : {}),
  };
}

export function estimateDurations(
  script: BiimScript,
  charsPerSecond = 8,
): number[] {
  return script.lines.map((line) =>
    line.spoken === false
      ? (line.duration as number)
      : Math.max(
          0.5,
          Array.from((line.reading ?? line.text).replace(/\s/g, '')).length /
            charsPerSecond,
        ),
  );
}

export function seekTime(value: string, timeline: Timeline): number {
  if (!value.startsWith('@')) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0)
      throw new Error(`Invalid time ${value}`);
    return number;
  }
  const ids = new Map<string, number>();
  timeline.lines.forEach((line, i) => {
    if (line.id) ids.set(line.id, i);
  });
  const ref = parseAnchor(value, ids);
  return (
    (ref.end
      ? timeline.lines[ref.index].end
      : timeline.lines[ref.index].start) + ref.offset
  );
}
