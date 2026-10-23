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
}
export function overlapScore(text: string, panels: string, n = 3): number {
  const normalize = (s: string) =>
    Array.from(
      s
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\p{P}\p{Z}\s]/gu, ''),
    );
  const a = normalize(text);
  const b = normalize(panels);
  if (!a.length || !b.length) return 0;
  const size = Math.min(n, a.length, b.length);
  const grams = (s: string[]) =>
    new Set(
      Array.from({ length: Math.max(0, s.length - size + 1) }, (_, i) =>
        s.slice(i, i + size).join(''),
      ),
    );
  const ag = grams(a);
  const bg = grams(b);
  return [...ag].filter((g) => bg.has(g)).length / Math.min(ag.size, bg.size);
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
  constructor(
    private profile: Profile,
    private duration: number,
    private options = { silence: 10, stale: 5, overlap: 0.35 },
  ) {}

  edit(at: number, candidate: PanelCandidate) {
    for (const box of ['top', 'main'] as const) {
      const next =
        box === 'top'
          ? candidate.top
          : candidate.main?.map((item) => item.text);
      if (next === undefined) continue;
      const same = JSON.stringify(next) === JSON.stringify(this.current[box]);
      const minimum = box === 'top' ? 30 : 8;
      const reason = same
        ? 'unchanged'
        : at - this.changed[box] < minimum
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
      at - this.lastSpeech >= this.options.silence
    );
  }
  counterValue(scene: SceneState): number | undefined {
    return scene.metrics[this.profile.scoreboard.metric];
  }
  commentary(
    at: number,
    text: string | null,
    scene: SceneState,
    speaker: string,
  ): 'retry' | 'done' {
    const overlap = text ? overlapScore(text, this.panelText()) : 0;
    const scheduledAt = Math.max(at, this.available);
    // Reserve conservative speech time for queuing. End anchors in the output
    // also keep real TTS sequential; longer audio can shift later lines.
    const duration = text ? Math.max(0.5, Array.from(text).length / 5) : 0;
    const reason = !text
      ? 'silent'
      : !this.trigger(at, scene)
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
      at: previous
        ? `@${previous.id}:end+${Math.max(0.3, scheduledAt - this.available + 0.3).toFixed(3)}`
        : scheduledAt,
      pauseAfter: 0.3,
    });
    this.available = scheduledAt + duration + 0.3;
    this.lastSpeech = scheduledAt;
    return 'done';
  }
}
