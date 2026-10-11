/**
 * The "director": turns the timed lines into a schedule of avatar actions and
 * screen events. Pure and seeded, so it runs the same in Node (tests) and in the
 * render harness.
 *
 * Motions are picked at random, but only from a pool that suits the moment:
 * calm, small moves while reading, a breath or a tilt at a topic change, a
 * greeting at the start, and so on.
 */
import type { LineEmotion, TimedLine } from '../types.js';

export type AvatarAction =
  | { type: 'emotion'; tag: LineEmotion }
  | { type: 'play'; id: string };

export interface ScheduledAction {
  time: number;
  action: AvatarAction;
}

export interface Popup {
  text: string;
  start: number;
  end: number;
  /** 0-based slot beside the avatar (top to bottom). */
  slot: number;
}

export interface ChapterSpan {
  index: number;
  title: string;
  start: number;
  end: number;
}

export interface PointSpan {
  chapter: number;
  text: string;
  start: number;
  /** Line whose narration belongs to this point (for the highlight). */
  lineIndex: number;
}

export interface Timeline {
  actions: ScheduledAction[];
  popups: Popup[];
  chapters: ChapterSpan[];
  points: PointSpan[];
  /** Times of topic changes after the first topic (cut-in + panel slide). */
  transitions: number[];
}

/** Mulberry32, same generator as the harness's seeded Math.random. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

// Motion pools per moment. Ids are the mesh avatar's motions / idle motions.
export const POOLS = {
  opening: ['greet'],
  closing: ['nod', 'greet'],
  topicChange: ['sigh', 'tilt', 'readNote'],
  betweenLines: ['readNote', 'glance', 'nod', 'hum'],
  lineStart: {
    neutral: [null, null, 'nod'],
    happy: ['nod', 'giggle', null],
    surprised: ['surprise'],
    sad: ['sigh', null],
    angry: ['no', null],
    relaxed: ['sway', null],
  } as Record<LineEmotion, Array<string | null>>,
} as const;

/** Rough length of each motion, to avoid starting a new one on top of it. */
const MOTION_SECONDS: Record<string, number> = {
  greet: 2.6,
  nod: 1.7,
  giggle: 2.2,
  surprise: 2.0,
  sigh: 5.6,
  no: 1.9,
  sway: 7.0,
  tilt: 2.6,
  readNote: 2.6,
  glance: 4.6,
  hum: 5.6,
};

const POPUP_SLOTS = 3;
const MIN_GAP_FOR_IDLE = 0.3;

export function buildTimeline(
  lines: TimedLine[],
  duration: number,
  seed: number,
): Timeline {
  const random = createSeededRandom(seed ^ 0x5eed);
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(random() * items.length) % items.length];
  const actions: ScheduledAction[] = [];
  let busyUntil = 0;
  // `force`: the sign-off must happen even if a long motion is still running
  const play = (time: number, id: string | null, force = false) => {
    if (!id || (!force && time < busyUntil - 0.2)) return;
    actions.push({ time, action: { type: 'play', id } });
    busyUntil = time + (MOTION_SECONDS[id] ?? 2);
  };

  // chapters and points
  const chapters: ChapterSpan[] = [];
  const points: PointSpan[] = [];
  const transitions: number[] = [];
  for (const line of lines) {
    if (line.chapter) {
      const previous = chapters.at(-1);
      const start = chapters.length === 0 ? 0 : Math.max(0, line.start - 0.35);
      if (previous) {
        previous.end = start;
        transitions.push(start);
      }
      chapters.push({
        index: chapters.length,
        title: line.chapter,
        start,
        end: duration + 1,
      });
    }
    if (line.point) {
      points.push({
        chapter: Math.max(0, chapters.length - 1),
        text: line.point,
        start: line.start,
        lineIndex: line.index,
      });
    }
  }

  // avatar: opening greeting during the lead-in, then per line
  if (lines.length > 0)
    play(Math.max(0, lines[0].start - 0.6), pick(POOLS.opening));
  lines.forEach((line, i) => {
    actions.push({
      time: line.start,
      action: { type: 'emotion', tag: line.emotion },
    });
    const isTopicChange = i > 0 && Boolean(line.chapter);
    if (isTopicChange)
      play(Math.max(0, line.start - 0.35), pick(POOLS.topicChange));
    else if (i > 0) play(line.start, pick(POOLS.lineStart[line.emotion]));
    const next = lines[i + 1];
    const gap = next ? next.start - line.end : duration - line.end;
    if (!next) {
      play(line.end + 0.1, pick(POOLS.closing), true);
      actions.push({
        time: line.end + 0.1,
        action: { type: 'emotion', tag: 'happy' },
      });
    } else if (gap >= MIN_GAP_FOR_IDLE && !next.chapter && random() < 0.55) {
      play(line.end + 0.05, pick(POOLS.betweenLines));
    }
  });
  actions.sort((a, b) => a.time - b.time);

  // keyword pop-ups: staggered through the line, cycling through the slots
  const popups: Popup[] = [];
  let slot = 0;
  for (const line of lines) {
    const span = Math.max(0.6, line.end - line.start);
    line.keywords.forEach((text, k) => {
      const start = line.start + Math.min(span * 0.6, 0.35 + k * 0.55);
      popups.push({
        text,
        start,
        end: line.end + 1.4,
        slot: slot % POPUP_SLOTS,
      });
      slot += 1;
    });
  }

  return { actions, popups, chapters, points, transitions };
}
