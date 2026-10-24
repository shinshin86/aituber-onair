import type { AvatarEffect } from '../types.js';
import { object, shortText } from './contracts.js';
export interface ExternalEvent {
  id: string;
  at: number;
  kind: string;
  importance: number;
  [key: string]: unknown;
}
export function parseEvents(
  value: unknown,
  duration = Number.POSITIVE_INFINITY,
): ExternalEvent[] {
  const entries = Array.isArray(value) ? value : object(value).events;
  if (!Array.isArray(entries))
    throw new Error('Event log requires an events array');
  const seen = new Set<string>();
  return entries
    .map((raw, i) => {
      const e = object(raw);
      const id = shortText(e.id ?? `event-${i + 1}`, 80);
      const kind = shortText(e.kind, 40);
      if (!id || seen.has(id))
        throw new Error('Event IDs must be unique and nonempty');
      seen.add(id);
      if (
        typeof e.at !== 'number' ||
        !Number.isFinite(e.at) ||
        e.at < 0 ||
        e.at >= duration
      )
        throw new Error(`Event ${id}: at must be inside the source video`);
      const importance =
        e.importance ??
        (['death', 'stage-clear'].includes(kind)
          ? 3
          : ['damage', 'attempt', 'respawn'].includes(kind)
            ? 2
            : 1);
      if (![1, 2, 3].includes(importance as number))
        throw new Error(`Event ${id}: invalid importance`);
      return { ...e, id, kind, at: e.at, importance: importance as number };
    })
    .sort((a, b) => a.at - b.at);
}
export function eventWidgets(
  events: ExternalEvent[],
  speaker: string,
  duration: number,
) {
  const effects: AvatarEffect[] = [];
  const counters: { at: number; value: number }[] = [{ at: 0, value: 0 }];
  let misses = 0;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind !== 'death') continue;
    counters.push({ at: e.at, value: ++misses });
    const respawn = events
      .slice(i + 1)
      .find(
        (v) =>
          v.kind === 'respawn' &&
          (v.speaker === undefined || v.speaker === e.speaker),
      );
    const until = respawn?.at ?? duration;
    if (until > e.at)
      effects.push({ at: e.at, until, speaker, effect: 'grayscale' });
    const shakeEnd = Math.min(duration, e.at + 0.45);
    if (shakeEnd > e.at)
      effects.push({
        at: e.at,
        until: shakeEnd,
        speaker,
        effect: 'shake',
        amplitude: 10,
      });
  }
  return { effects, counter: { label: 'ミス', events: counters } };
}

export interface AudioSlot {
  at: number;
  duration: number;
  eventAt?: number;
  priority: number;
  nextImportant: number;
  sourceEnd: number;
  available: number;
  stale: number;
}
export function audioSlot(slot: AudioSlot) {
  if (!Number.isFinite(slot.duration) || slot.duration <= 0)
    throw new Error('Measured audio duration must be positive and finite');
  const start = Math.max(slot.at, slot.eventAt ?? slot.at, slot.available);
  const end = start + slot.duration;
  const reason =
    start - slot.at > slot.stale
      ? 'stale'
      : slot.eventAt !== undefined && start - slot.eventAt > 0.25
        ? 'event-conflict'
        : end > slot.sourceEnd + 1e-8
          ? 'past-video-end'
          : end + 0.3 > slot.nextImportant + 1e-8
            ? 'audio-does-not-fit-before-event'
            : 'accepted';
  return { start, end, reason };
}
