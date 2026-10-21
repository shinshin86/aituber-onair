import { constants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';
import { resolveImagePaths } from './gen/avatarStates.js';
import { parseAnchor, ScriptError } from './timeline.js';
import type { BiimScript, Time } from './types.js';

const schema = JSON.parse(
  await readFile(
    new URL('../schema/biim-script.schema.json', import.meta.url),
    'utf8',
  ),
);
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);

function jsonPath(pointer: string): string {
  return pointer
    .split('/')
    .filter(Boolean)
    .map((part, i) =>
      /^\d+$/.test(part)
        ? `[${part}]`
        : `${i ? '.' : ''}${part.replace(/~1/g, '/').replace(/~0/g, '~')}`,
    )
    .join('');
}

/** Validate shape, references, causal timing, and files without calling TTS. */
export async function validateScript(
  value: unknown,
  baseDir: string,
): Promise<BiimScript> {
  if (!validate(value))
    throw new ScriptError(
      (validate.errors ?? []).map(
        (e) =>
          `${jsonPath(e.instancePath) || '$'}${e.keyword === 'required' ? `.${e.params.missingProperty}` : ''}: ${e.message}`,
      ),
    );
  const script = value as BiimScript;
  const issues: string[] = [];
  const ids = new Map<string, number>();
  const dependencies = script.lines.map((line, i) =>
    i && line.at === undefined ? [i - 1] : ([] as number[]),
  );
  const times: [Time, string, number?][] = [];
  const files: [string, string][] = [];
  script.lines.forEach((line, i) => {
    if (line.id) {
      if (ids.has(line.id))
        issues.push(`lines[${i}].id: duplicate ID ${line.id}`);
      ids.set(line.id, i);
    }
    if (!Object.hasOwn(script.speakers, line.speaker))
      issues.push(`lines[${i}].speaker: unknown speaker ${line.speaker}`);
    if (line.at !== undefined) times.push([line.at, `lines[${i}].at`, i]);
  });
  for (const [id, speaker] of Object.entries(script.speakers)) {
    for (const [state, file] of Object.entries(
      resolveImagePaths(speaker.image, baseDir),
    ))
      files.push([file, `speakers.${id}.image.${state}`]);
  }
  script.main?.forEach((clip, i) => {
    times.push([clip.at, `main[${i}].at`]);
    if (clip.until !== undefined) times.push([clip.until, `main[${i}].until`]);
    if (clip.video) files.push([clip.video, `main[${i}].video`]);
    if (clip.image) files.push([clip.image, `main[${i}].image`]);
    if (clip.to !== undefined && clip.to <= (clip.from ?? 0))
      issues.push(`main[${i}].to: must be > from`);
  });
  script.panels?.forEach((panel, i) => {
    times.push([panel.at, `panels[${i}].at`]);
    if (panel.image) files.push([panel.image, `panels[${i}].image`]);
  });
  if (script.timer) {
    times.push([script.timer.start, 'timer.start']);
    if (script.timer.stop !== undefined)
      times.push([script.timer.stop, 'timer.stop']);
  }
  script.counter?.events.forEach((event, i) =>
    times.push([event.at, `counter.events[${i}].at`]),
  );
  for (const [value, location, owner] of times) {
    if (typeof value !== 'string') continue;
    try {
      const ref = parseAnchor(value, ids);
      if (owner !== undefined) dependencies[owner].push(ref.index);
    } catch (error) {
      issues.push(`${location}: ${(error as Error).message}`);
    }
  }
  const visited = new Set<number>();
  const visiting = new Set<number>();
  function visit(i: number) {
    if (visiting.has(i)) {
      issues.push(`lines[${i}].at: cyclic line timing dependency`);
      return;
    }
    if (visited.has(i)) return;
    visiting.add(i);
    for (const dependency of dependencies[i]) visit(dependency);
    visiting.delete(i);
    visited.add(i);
  }
  script.lines.forEach((_, i) => visit(i));
  // Resolve only times independent of unknown speech durations. Never estimate
  // during validation: an end anchor may become known only after synthesis.
  const known = new Map<number, { start?: number; end?: number }>();
  const calculating = new Set<number>();
  function knownLine(i: number): { start?: number; end?: number } {
    if (known.has(i)) return known.get(i) as { start?: number; end?: number };
    if (calculating.has(i)) return {};
    calculating.add(i);
    const source = script.lines[i];
    const previousEnd =
      i && source.at === undefined ? knownLine(i - 1).end : undefined;
    const start =
      source.at === undefined
        ? i === 0
          ? 0
          : previousEnd === undefined
            ? undefined
            : previousEnd +
              (script.lines[i - 1].pauseAfter ??
                script.defaults?.pauseAfter ??
                0.3)
        : knownTime(source.at);
    const result = {
      start,
      end:
        start !== undefined && source.spoken === false
          ? start + (source.duration as number)
          : undefined,
    };
    calculating.delete(i);
    known.set(i, result);
    return result;
  }
  function knownTime(value: Time): number | undefined {
    if (typeof value === 'number') return value;
    try {
      const ref = parseAnchor(value, ids);
      const target = knownLine(ref.index);
      const seconds = ref.end ? target.end : target.start;
      return seconds === undefined ? undefined : seconds + ref.offset;
    } catch {
      return undefined;
    }
  }
  for (const [value, location] of times) {
    const seconds = knownTime(value);
    if (seconds !== undefined && seconds < 0)
      issues.push(`${location}: must resolve to nonnegative seconds`);
  }
  script.lines.forEach((_, i) => {
    const current = knownLine(i);
    const previous = i ? knownLine(i - 1) : undefined;
    if (
      current.start !== undefined &&
      previous?.end !== undefined &&
      current.start < previous.end
    )
      issues.push(
        `lines[${i}].at: must be >= previous line end (${previous.end}s)`,
      );
  });
  script.main?.forEach((clip, i, clips) => {
    const start = knownTime(clip.at);
    const next = clips[i + 1]?.at;
    const endTime = clip.until ?? next;
    const end = endTime === undefined ? undefined : knownTime(endTime);
    if (start !== undefined && end !== undefined && end <= start)
      issues.push(`main[${i}].until: must be > start`);
    const previous = clips[i - 1];
    const previousEnd =
      previous?.until === undefined ? undefined : knownTime(previous.until);
    const previousStart = previous ? knownTime(previous.at) : undefined;
    if (start !== undefined && previousEnd !== undefined && start < previousEnd)
      issues.push(`main[${i}].at: overlaps previous main slot`);
    if (
      start !== undefined &&
      previousStart !== undefined &&
      start < previousStart
    )
      issues.push(`main[${i}].at: must be chronological`);
  });
  const lastPanel = new Map<string, number>();
  script.panels?.forEach((panel, i) => {
    const at = knownTime(panel.at);
    const previous = lastPanel.get(panel.box);
    if (at !== undefined && previous !== undefined && at < previous)
      issues.push(`panels[${i}].at: must be chronological within ${panel.box}`);
    if (at !== undefined) lastPanel.set(panel.box, at);
  });
  let lastCounter: number | undefined;
  script.counter?.events.forEach((event, i) => {
    const at = knownTime(event.at);
    if (at !== undefined && lastCounter !== undefined && at < lastCounter)
      issues.push(`counter.events[${i}].at: must be chronological`);
    lastCounter = at;
  });
  if (script.timer?.stop !== undefined) {
    const start = knownTime(script.timer.start);
    const stop = knownTime(script.timer.stop);
    if (start !== undefined && stop !== undefined && stop < start)
      issues.push('timer.stop: must be >= timer.start');
  }
  // Known lower bounds catch definite numeric overlaps without guessing TTS length.
  let earliestEnd = 0;
  script.lines.forEach((line, i) => {
    if (typeof line.at === 'number') {
      if (line.at < earliestEnd)
        issues.push(
          `lines[${i}].at: must be >= previous line end (at least ${earliestEnd}s)`,
        );
      earliestEnd = line.at;
    } else if (typeof line.at === 'string') earliestEnd = 0;
    else if (i)
      earliestEnd +=
        script.lines[i - 1].pauseAfter ?? script.defaults?.pauseAfter ?? 0.3;
    earliestEnd += line.spoken === false ? (line.duration as number) : 0;
  });
  const bottomPanel = script.panels?.some((p) => p.box === 'bottom');
  if (script.counter && bottomPanel)
    issues.push('counter: cannot share bottom with panels');
  if (
    script.timer?.position === 'right-bottom' &&
    (script.counter || bottomPanel)
  )
    issues.push(
      'timer.position: right-bottom cannot share bottom with panels/counter',
    );
  await Promise.all(
    files.map(async ([file, location]) => {
      try {
        if (!(await stat(path.resolve(baseDir, file))).isFile())
          throw new Error();
        await access(path.resolve(baseDir, file), constants.R_OK);
      } catch {
        issues.push(
          `${location}: file does not exist or is not readable (${file.startsWith(baseDir) ? path.relative(baseDir, file) : file})`,
        );
      }
    }),
  );
  if (issues.length) throw new ScriptError(issues);
  return script;
}

export async function loadScript(filename: string) {
  const baseDir = path.dirname(path.resolve(filename));
  const script = await validateScript(
    JSON.parse(await readFile(filename, 'utf8')),
    baseDir,
  );
  return { script, baseDir };
}
