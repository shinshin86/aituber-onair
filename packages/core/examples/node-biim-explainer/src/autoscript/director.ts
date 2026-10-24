import { overlapScore } from './text.js';
export { overlapScore } from './text.js';
import type { Panel, ScriptLine } from '../types.js';
import type { PanelCandidate, Profile, SceneState } from './contracts.js';

export interface Decision {
  at: number;
  role: 'top' | 'main' | 'commentary';
  candidate: unknown;
  accepted: boolean;
  reason: string;
  overlap?: number;
  scheduledAt?: number;
  audioDuration?: number;
  eventAt?: number;
}

export class Director {
  panels: Panel[] = [];
  lines: ScriptLine[] = [];
  decisions: Decision[] = [];
  current = { top: '', main: [] as string[] };
  private changed = {
    top: Number.NEGATIVE_INFINITY,
    main: Number.NEGATIVE_INFINITY,
  };
  private available = 0;
  private lastSpeech = Number.NEGATIVE_INFINITY;
  private lastLocation: string | undefined;
  private options: { silence: number; stale: number; overlap: number };
  get nextAvailable() {
    return this.available;
  }
  constructor(
    private profile: Profile,
    private duration: number,
    options: { silence?: number; stale?: number; overlap?: number } = {},
  ) {
    this.options = {
      silence: options.silence ?? profile.friend.silenceSeconds,
      stale: options.stale ?? 5,
      overlap: options.overlap ?? 0.35,
    };
  }

  edit(at: number, candidate: PanelCandidate, scene?: SceneState) {
    const newLocation = Boolean(
      scene?.sceneChanged &&
        scene.context.location &&
        scene.context.location !== this.lastLocation,
    );
    for (const box of ['top', 'main'] as const) {
      const next =
        box === 'top'
          ? candidate.top
          : candidate.main?.map((item) => item.text);
      if (next === undefined) continue;
      const same = JSON.stringify(next) === JSON.stringify(this.current[box]);
      const minimum = box === 'top' ? this.profile.map.minDisplaySeconds : 8;
      const reason = same
        ? 'unchanged'
        : !(box === 'top' && newLocation) && at - this.changed[box] < minimum
          ? `minimum-display-${minimum}s`
          : 'accepted';
      this.decisions.push({
        at,
        role: box,
        candidate: next,
        accepted: reason === 'accepted',
        reason,
      });
      if (reason !== 'accepted') continue;
      this.changed[box] = at;
      if (box === 'top') {
        this.lastLocation = scene?.context.location ?? this.lastLocation;
        this.current.top = next as string;
        this.panels.push({
          at,
          box,
          ...(next ? { text: next as string } : { clear: true as const }),
        });
      } else {
        this.current.main = next as string[];
        this.panels.push({
          at,
          box,
          ...((next as string[]).length
            ? {
                items: (next as string[]).map((text, i) => ({
                  text,
                  color: i ? ('white' as const) : ('yellow' as const),
                })),
              }
            : { clear: true as const }),
        });
      }
    }
  }
  panelText(): string {
    return [this.current.top, ...this.current.main].join('\n');
  }
  trigger(at: number, scene: SceneState): boolean {
    return (
      scene.sceneChanged ||
      scene.events.some((e) => e.importance === 3) ||
      at - this.lastSpeech >= this.profile.friend.targetCadenceSeconds ||
      at - (this.available - 0.3) >= this.options.silence
    );
  }
  counterValue(scene: SceneState): number | undefined {
    return scene.metrics[this.profile.scoreboard.metric];
  }
  counterState(
    scene: SceneState,
  ): { value: number; text?: string } | undefined {
    for (const rule of this.profile.scoreboard.rules) {
      const value = scene.metrics[rule.metric];
      if (value !== undefined && value >= rule.min)
        return {
          value,
          text: rule.format.replaceAll('{value}', String(value)),
        };
    }
    const value = this.counterValue(scene);
    return value === undefined ? undefined : { value };
  }
  commentary(
    at: number,
    text: string | null,
    scene: SceneState,
    speaker: string,
    timing?: {
      duration: number;
      eventAt?: number;
      start?: number;
      shortened?: boolean;
    },
  ): 'retry' | 'done' {
    const overlap = text ? overlapScore(text, this.panelText()) : 0;
    const scheduledAt = Math.max(
      at,
      this.available,
      timing?.eventAt ?? at,
      timing?.start ?? at,
    );
    // The pipeline supplies measured speech. Direct callers without timing
    // retain the conservative legacy estimate and sequential anchors.
    const duration =
      timing?.duration ??
      (text
        ? Math.max(0.5, Array.from(text.replace(/\s/g, '')).length / 5)
        : 0);
    const reason = !text
      ? 'silent'
      : !this.trigger(at, scene) && timing?.eventAt === undefined
        ? 'no-trigger'
        : scheduledAt - at > this.options.stale
          ? 'stale'
          : scheduledAt + duration > this.duration
            ? 'past-video-end'
            : /\p{N}|[〇零一二三四五六七八九十百千万億兆]+(?:回|個|つ|枚|秒|分|階|層|匹|体|本|点|倍)/u.test(
                  text,
                )
              ? 'number-reading'
              : overlap >= this.options.overlap
                ? 'panel-overlap'
                : 'accepted';
    this.decisions.push({
      at,
      role: 'commentary',
      candidate: text,
      accepted: reason === 'accepted',
      reason,
      overlap,
      scheduledAt,
    });
    if (reason !== 'accepted')
      return reason === 'panel-overlap' ? 'retry' : 'done';
    const previous = this.lines.at(-1);
    this.lines.push({
      id: `auto-${this.lines.length + 1}`,
      speaker,
      text: text as string,
      at: timing
        ? scheduledAt
        : previous
          ? `@${previous.id}:end+${Math.max(0.3, scheduledAt - this.available + 0.3).toFixed(3)}`
          : scheduledAt,
      ...(timing?.eventAt !== undefined ? { eventAt: timing.eventAt } : {}),
      pauseAfter: 0.3,
    });
    this.available = scheduledAt + duration + 0.3;
    this.lastSpeech = scheduledAt;
    return 'done';
  }
}
