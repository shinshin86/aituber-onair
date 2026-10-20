#!/usr/bin/env node
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFrom } from '../paths.js';
import { parseScript } from '../schema.js';
import type { ExplainerScript, RenderConfig, TimedLine } from '../types.js';
import { concatWavs, decodeWav, writeSilenceWav } from './audio.js';
import { openCompositor } from './compositor.js';
import { resolveImagePaths } from './avatarStates.js';
import * as aituberVoice from './engines/aituberVoice.js';
import * as sine from './engines/sine.js';
import { assertFfmpeg, encodeMp4, writeFrame } from './ffmpeg.js';

export interface GenArgs {
  script: string | null;
  output: string | null;
  dryRun: boolean;
  keepTemp: boolean;
  renderOnly: boolean;
  frame: number | null;
  png: string | null;
  help: boolean;
}

export function parseArgs(argv: string[]): GenArgs {
  const args: GenArgs = {
    script: null,
    output: null,
    dryRun: false,
    keepTemp: false,
    renderOnly: false,
    frame: null,
    png: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (['--script', '--out', '--output', '--frame', '--png'].includes(flag)) {
      const value = argv[++i];
      if (!value || value.startsWith('--'))
        throw new Error(`${flag} requires a value.`);
      if (flag === '--script') args.script = value;
      else if (flag === '--frame') args.frame = Number(value);
      else if (flag === '--png') args.png = value;
      else args.output = value;
    } else if (flag === '--dry-run') args.dryRun = true;
    else if (flag === '--keep-temp') args.keepTemp = true;
    else if (flag === '--render-only') args.renderOnly = true;
    else if (flag === '--help' || flag === '-h') args.help = true;
    else if (!flag.startsWith('-') && !args.script) args.script = flag;
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (args.help) return args;
  if (!args.script) throw new Error('A JSON script path is required.');
  if ((args.frame === null) !== (args.png === null))
    throw new Error('--frame and --png must be used together.');
  if (args.frame !== null && (!Number.isInteger(args.frame) || args.frame < 0))
    throw new Error('--frame must be a non-negative integer.');
  if (args.dryRun && (args.renderOnly || args.png))
    throw new Error('--dry-run cannot be combined with rendering flags.');
  return args;
}

/** Select a voice per line and concatenate the normalized speech and silence. */
export async function synthesizeLines(
  script: ExplainerScript,
  tempDir: string,
) {
  const segments: string[] = [];
  const lines: TimedLine[] = [];
  let cursor = 0;
  const silence = async (name: string, duration: number) => {
    if (duration <= 0) return;
    const file = path.join(tempDir, `${name}.wav`);
    cursor += await writeSilenceWav(file, duration);
    segments.push(file);
  };
  await silence('lead-in', script.leadIn ?? 0);
  for (const [index, line] of script.lines.entries()) {
    const voice = script.speakers[line.speaker].voice;
    const workDir = path.join(tempDir, `line-${index}`);
    await mkdir(workDir, { recursive: true });
    const start = cursor;
    const spoken = line.spoken !== false;
    if (spoken) {
      const engine = voice.engine === 'sine' ? sine : aituberVoice;
      try {
        const result = await engine.synthesize(
          line.reading || line.text,
          voice.options ?? {},
          workDir,
        );
        segments.push(result.wavPath);
        cursor += result.durationSec;
      } catch (error) {
        throw new Error(
          `Synthesis failed for lines[${index}], speaker "${line.speaker}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    } else await silence(`silent-${index}`, line.duration ?? 0);
    lines.push({ ...line, index, spoken, start, end: cursor });
    await silence(
      `pause-${index}`,
      line.pauseAfter ?? script.defaultPauseAfter ?? 0.35,
    );
  }
  await silence('lead-out', script.leadOut ?? 0);
  return { segments, lines, duration: cursor };
}

export async function render(config: RenderConfig, args: GenArgs) {
  const audio = await decodeWav(config.audio);
  const stage = await openCompositor(config, audio);
  const totalFrames = Math.ceil(config.duration * config.fps);
  if (args.png && args.frame !== null) {
    const image = stage.renderFrame(args.frame);
    await mkdir(path.dirname(path.resolve(args.png)), { recursive: true });
    await writeFile(args.png, image.png());
    return { png: args.png, frame: args.frame };
  }
  await encodeMp4({
    config,
    writeFrames: async (stdin) => {
      for (let frame = 0; frame < totalFrames; frame++) {
        await writeFrame(stdin, stage.renderFrame(frame).bytes);
        if (frame % 150 === 0) console.error(`frame ${frame}/${totalFrames}`);
      }
    },
  });
  return {
    output: config.output,
    frames: totalFrames,
    duration: totalFrames / config.fps,
  };
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(
      'Usage: npm run gen -- <script.json> [--out video.mp4] [--dry-run | --render-only] [--frame 45 --png work/frame.png] [--keep-temp]',
    );
    return;
  }
  const scriptPath = path.resolve(args.script ?? '');
  const script = parseScript(await readFile(scriptPath, 'utf8'));
  const output = args.output
    ? path.resolve(args.output)
    : resolveFrom(scriptPath, script.output || '../work/yukkuri.mp4');
  const parsed = path.parse(output);
  const audio = path.join(parsed.dir, `${parsed.name}.wav`);
  const configPath = path.join(
    parsed.dir,
    `${parsed.name}.yukkuri-gen.config.json`,
  );
  const timingsPath = path.join(parsed.dir, `${parsed.name}.timings.json`);
  await assertFfmpeg();
  await mkdir(parsed.dir, { recursive: true });
  if (args.renderOnly) {
    const config = JSON.parse(
      await readFile(configPath, 'utf8'),
    ) as RenderConfig;
    console.log(
      JSON.stringify(await render({ ...config, output }, args), null, 2),
    );
    return;
  }
  const speakers = Object.fromEntries(
    Object.entries(script.speakers).map(([id, speaker]) => [
      id,
      {
        ...speaker,
        image: resolveImagePaths(speaker.image, path.dirname(scriptPath)),
      },
    ]),
  );
  for (const [id, speaker] of Object.entries(speakers)) {
    for (const [state, file] of Object.entries(speaker.image)) {
      try {
        await access(file);
      } catch {
        throw new Error(
          `Image ${state} not found for speaker "${id}": ${file}`,
        );
      }
    }
  }
  const resolvedScript = {
    ...script,
    speakers,
    lines: script.lines.map((line) => ({
      ...line,
      slide:
        line.slide && 'image' in line.slide
          ? { image: resolveFrom(scriptPath, line.slide.image) }
          : line.slide,
    })),
  };
  const tempDir = await mkdtemp(path.join(parsed.dir, '.yukkuri-gen-'));
  try {
    const synthesis = await synthesizeLines(resolvedScript, tempDir);
    await concatWavs(synthesis.segments, audio);
    const config: RenderConfig = {
      width: 1920,
      height: 1080,
      fps: 30,
      speakers,
      mouthMode: script.mouthMode,
      flapInterval: script.flapInterval,
      mouthThreshold: script.mouthThreshold,
      motion: script.motion,
      show: {
        title: script.show?.title ?? 'ゆっくり解説',
        subtitle: script.show?.subtitle ?? 'AITuber OnAir',
      },
      seed: script.seed ?? 42,
      audio,
      output,
      lines: synthesis.lines,
      duration: synthesis.duration,
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));
    await writeFile(
      timingsPath,
      JSON.stringify(
        { duration: synthesis.duration, lines: synthesis.lines },
        null,
        2,
      ),
    );
    const result = args.dryRun ? null : await render(config, args);
    console.log(
      JSON.stringify(
        { audio, timings: timingsPath, config: configPath, render: result },
        null,
        2,
      ),
    );
  } finally {
    if (!args.keepTemp) await rm(tempDir, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
