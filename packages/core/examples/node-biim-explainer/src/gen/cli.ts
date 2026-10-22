import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCompositor } from '../compositor.js';
import { mixAudio, prepareVideos, resolveMedia } from '../media.js';
import { loadScript } from '../schema.js';
import { synthesizeTimeline } from '../synthesis.js';
import { estimateDurations, resolveTimeline, seekTime } from '../timeline.js';
import type { RenderConfig, Timeline } from '../types.js';
import { SAMPLE_RATE } from './audio.js';
import { assertFfmpeg, encodeMp4, writeFrame } from './ffmpeg.js';

export async function runCli(args: string[]) {
  const [command, filename, ...flags] = args;
  if (
    !['validate', 'plan', 'preview', 'gen'].includes(command) ||
    !filename ||
    filename.startsWith('-')
  )
    throw new Error(
      'Usage: gen.js validate|plan|preview|gen script.json [--out path] [--at seconds|@id] [--estimate] [--json] [--chars-per-second 8]',
    );
  let output: string | undefined;
  let estimate = false;
  let json = false;
  let charsPerSecond = 8;
  const at: string[] = [];
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    if (flag === '--estimate') estimate = true;
    else if (flag === '--json') json = true;
    else if (['--out', '--at', '--chars-per-second'].includes(flag)) {
      const value = flags[++i];
      if (!value || value.startsWith('--'))
        throw new Error(`${flag}: missing value`);
      if (flag === '--out') output = value;
      else if (flag === '--at') at.push(value);
      else charsPerSecond = Number(value);
    } else throw new Error(`Unknown option ${flag}`);
  }
  if (!Number.isFinite(charsPerSecond) || charsPerSecond <= 0)
    throw new Error('--chars-per-second must be positive');
  if (command === 'gen' && estimate)
    throw new Error(
      'gen requires actual audio; --estimate is for plan/preview',
    );
  const { script, baseDir } = await loadScript(filename);
  if (command === 'validate') {
    console.log(
      'Valid schema, references, and files. Audio-dependent overlaps are checked by plan/gen.',
    );
    return;
  }
  if (command === 'preview' && !at.length)
    throw new Error('preview requires one or more --at times');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'biim-render-'));
  try {
    if (!estimate) await assertFfmpeg();
    const prepared = estimate
      ? undefined
      : await synthesizeTimeline(
          script,
          temporary,
          path.resolve('work/voice-cache'),
        );
    const timeline =
      prepared?.timeline ??
      resolveTimeline(script, estimateDurations(script, charsPerSecond), true);
    await resolveMedia(timeline, baseDir);
    if (command === 'plan') {
      const serialized = `${JSON.stringify(timeline, null, 2)}\n`;
      if (output) {
        await mkdir(path.dirname(path.resolve(output)), { recursive: true });
        await writeFile(output, serialized);
      }
      if (json) console.log(serialized.trimEnd());
      else printPlan(timeline);
      return;
    }
    const narration = prepared?.narration ?? {
      samples: new Float32Array(Math.ceil(timeline.duration * SAMPLE_RATE)),
      sampleRate: SAMPLE_RATE,
      duration: timeline.duration,
    };
    const target = path.resolve(
      output ??
        (command === 'preview'
          ? 'work/preview'
          : path.resolve(baseDir, script.output ?? '../work/out.mp4')),
    );
    const audio = `${target.replace(/\.[^.\/]+$/, '')}.mixed.wav`;
    const config: RenderConfig = {
      ...script,
      ...timeline,
      timer: timeline.timer,
      counter: timeline.counter,
      seed: script.seed ?? 1,
      audio,
      output: target,
    };
    const videos = await prepareVideos(timeline, baseDir, temporary);
    const compositor = await createCompositor(
      config,
      narration,
      baseDir,
      videos,
    );
    if (command === 'preview') {
      await mkdir(target, { recursive: true });
      for (const [i, value] of at.entries()) {
        const seconds = seekTime(value, timeline);
        if (seconds < 0 || seconds >= timeline.duration)
          throw new Error(
            `--at ${value}: outside timeline [0, ${timeline.duration})`,
          );
        // An anchor requests the newly active event, which may start between
        // frame boundaries. Numeric seeks retain ordinary floor semantics.
        const index = value.startsWith('@')
          ? Math.min(
              Math.ceil(timeline.duration * timeline.fps) - 1,
              Math.ceil(seconds * timeline.fps - 1e-8),
            )
          : Math.floor(seconds * timeline.fps);
        const frame = await compositor.renderFrame(index);
        const file = path.join(
          target,
          `${String(i + 1).padStart(2, '0')}-${seconds.toFixed(3)}.png`,
        );
        await writeFile(file, frame.png());
        console.log(file);
      }
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      await mixAudio(script, timeline, narration, baseDir, temporary, audio);
      await writeFile(
        `${target.replace(/\.[^.\/]+$/, '')}.timeline.json`,
        `${JSON.stringify(timeline, null, 2)}\n`,
      );
      await encodeMp4({
        config,
        writeFrames: async (stdin) => {
          for (
            let frame = 0;
            frame < Math.ceil(timeline.duration * timeline.fps);
            frame++
          )
            await writeFrame(
              stdin,
              (await compositor.renderFrame(frame)).bytes,
            );
        },
      });
      console.log(
        `Generated ${target} (${timeline.duration.toFixed(3)}s), mixed WAV, and timeline JSON.`,
      );
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

function printPlan(timeline: Timeline) {
  console.log(
    `${timeline.estimated ? 'ESTIMATE' : 'AUDIO'} ${timeline.duration.toFixed(3)}s / ${timeline.width}x${timeline.height} @ ${timeline.fps}fps`,
  );
  for (const line of timeline.lines) {
    console.log(
      `line ${line.id ?? line.index} (${line.speaker}): ${line.start.toFixed(3)}–${line.end.toFixed(3)}s`,
    );
    for (const page of line.pages)
      console.log(
        `  page ${page.start.toFixed(3)}–${page.end.toFixed(3)}s: ${page.rows.join(' / ')}`,
      );
  }
  for (const item of timeline.main)
    console.log(
      `main[${item.index}]: ${item.start.toFixed(3)}–${item.end.toFixed(3)}s${item.playbackEnd === undefined ? '' : ` / playback ends ${item.playbackEnd.toFixed(3)}s; hold thereafter`}`,
    );
  for (const item of timeline.panels)
    console.log(
      `panel.${item.box}: ${item.start.toFixed(3)}–${item.end.toFixed(3)}s`,
    );
  if (timeline.timer)
    console.log(
      `timer: ${timeline.timer.start.toFixed(3)}–${timeline.timer.stop.toFixed(3)}s (then frozen)`,
    );
  for (const item of timeline.counter?.events ?? [])
    console.log(
      `counter: ${item.at.toFixed(3)}–${item.end.toFixed(3)}s = ${item.value}`,
    );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runCli(process.argv.slice(2)).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
