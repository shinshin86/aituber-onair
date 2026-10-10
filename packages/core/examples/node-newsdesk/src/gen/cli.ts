#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Writable } from 'node:stream';
import { resolveFrom } from '../paths.js';
import { parseAvatarKind, resolveAvatarConfig } from '../avatars/registry.js';
import type { AvatarKind } from '../avatars/types.js';
import { validateScript } from '../script-gen/schema.js';
import { extractKeywords } from '../screen/keywords.js';
import {
  LINE_EMOTIONS,
  type LineEmotion,
  type NewsdeskScript,
  type RenderConfig,
  type ScriptLine,
  type ScriptVoice,
  type TimedLine,
} from '../types.js';
import {
  concatWavs,
  createMouthValues,
  decodeWav,
  writeSilenceWav,
} from './audio.js';
import * as aituberVoiceEngine from './engines/aituberVoice.js';
import * as sayEngine from './engines/say.js';
import * as sineEngine from './engines/sine.js';
import type { SynthesisResult, VoiceEngine } from './engines/types.js';
import { assertFfmpeg, encodeMp4, writeFrame } from './ffmpeg.js';
import { openCompositor } from './compositor/index.js';

const ENGINES: Record<ScriptVoice['engine'], VoiceEngine> = {
  say: sayEngine,
  sine: sineEngine,
  'aituber-voice': aituberVoiceEngine,
};

export interface GenArgs {
  script: string | null;
  avatar: AvatarKind;
  avatarConfig: string | null;
  output: string | null;
  dryRun: boolean;
  keepTemp: boolean;
  renderOnly: boolean;
  frame: number | null;
  png: string | null;
  help: boolean;
}

interface GenerationPaths {
  outputPath: string;
  outputDir: string;
  wavPath: string;
  timingsPath: string;
  configPath: string;
  tempDir: string;
}

interface SynthesisSummary {
  segments: string[];
  lines: TimedLine[];
  duration: number;
  voice: ScriptVoice;
}

interface RenderSummary {
  output?: string;
  png?: string;
  frame?: number;
  frames?: number;
  totalFrames?: number;
  duration?: number;
  launchMode: string;
  scheduledActions: number;
  avatarDiagnostics?: Record<string, unknown>;
  renderPerformance: {
    measuredFrames: number;
    totalMs: number;
    averageMsPerFrame: number;
  };
  speakingFrames: number;
}

function takeValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--'))
    throw new Error(`${flag} requires a value.`);
  return value;
}

/** Parse video generation CLI arguments. */
export function parseArgs(argv: string[]): GenArgs {
  const args: GenArgs = {
    script: null,
    avatar: 'pngtuber',
    avatarConfig: null,
    output: null,
    dryRun: false,
    keepTemp: false,
    renderOnly: false,
    frame: null,
    png: null,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--script')
      args.script = takeValue(argv, index++, argument);
    else if (argument === '--avatar')
      args.avatar = parseAvatarKind(takeValue(argv, index++, argument));
    else if (argument === '--avatar-config')
      args.avatarConfig = takeValue(argv, index++, argument);
    else if (argument === '--output')
      args.output = takeValue(argv, index++, argument);
    else if (argument === '--dry-run') args.dryRun = true;
    else if (argument === '--keep-temp') args.keepTemp = true;
    else if (argument === '--render-only') args.renderOnly = true;
    else if (argument === '--frame')
      args.frame = Number(takeValue(argv, index++, argument));
    else if (argument === '--png')
      args.png = takeValue(argv, index++, argument);
    else if (argument === '--help' || argument === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return args;
}

function usage(): string {
  return `Usage:
  npm run gen -- --script <script.json> [--avatar pngtuber|purupuru|mesh|vrm|live2d|inochi2d|psd] [--avatar-config config.json] [--output <video.mp4>]
  npm run gen -- --script <script.json> [--output <video.mp4>] --dry-run
  npm run gen -- --script <script.json> [--output <video.mp4>] --render-only
  npm run gen -- --script <script.json> --frame 45 --png work/frame45.png`;
}

function validateArgs(
  args: GenArgs,
): asserts args is GenArgs & { script: string } {
  if (!args.script) throw new Error('--script is required.');
  if ((args.frame === null) !== (args.png === null))
    throw new Error('--frame and --png must be used together.');
  if (args.frame !== null && (!Number.isFinite(args.frame) || args.frame < 0))
    throw new Error('--frame must be a non-negative number.');
  if (args.dryRun && args.png)
    throw new Error('--dry-run cannot be combined with --frame/--png.');
  if (args.renderOnly && (args.dryRun || args.png)) {
    throw new Error(
      '--render-only cannot be combined with --dry-run or --frame/--png.',
    );
  }
}

function createPaths(
  scriptPath: string,
  scriptOutput: string | undefined,
  cliOutput: string | null,
): GenerationPaths {
  const outputPath = cliOutput
    ? path.resolve(cliOutput)
    : resolveFrom(scriptPath, scriptOutput || 'out.mp4');
  const parsed = path.parse(outputPath);
  return {
    outputPath,
    outputDir: parsed.dir,
    wavPath: path.join(parsed.dir, `${parsed.name}.wav`),
    timingsPath: path.join(parsed.dir, `${parsed.name}.timings.json`),
    configPath: path.join(
      parsed.dir,
      `${parsed.name}.newsdesk-gen.config.json`,
    ),
    tempDir: path.join(
      parsed.dir,
      `.newsdesk-gen-${parsed.name}-${process.pid}`,
    ),
  };
}

function requireFiniteDuration(line: ScriptLine, index: number): number {
  if (
    typeof line.duration !== 'number' ||
    !Number.isFinite(line.duration) ||
    line.duration < 0
  ) {
    throw new Error(
      `lines[${index}].duration is required when spoken is false.`,
    );
  }
  return line.duration;
}

export function normalizeEmotion(value: unknown): LineEmotion {
  return LINE_EMOTIONS.includes(value as LineEmotion)
    ? (value as LineEmotion)
    : 'neutral';
}

async function synthesizeLines(
  script: NewsdeskScript,
  tempDir: string,
): Promise<SynthesisSummary> {
  const voice: ScriptVoice = script.voice || {
    engine: 'sine',
    options: {},
  };
  const engine = ENGINES[voice.engine];
  if (!engine) {
    throw new Error(
      `Unsupported voice engine "${voice.engine}". Supported: ${Object.keys(ENGINES).join(', ')}`,
    );
  }
  const segments: string[] = [];
  const lines: TimedLine[] = [];
  let cursor = 0;
  const defaultPause = Number(script.defaultPauseAfter ?? 0.35);

  if (Number(script.leadIn ?? 0) > 0) {
    const wavPath = path.join(tempDir, 'lead-in.wav');
    cursor += await writeSilenceWav(wavPath, Number(script.leadIn));
    segments.push(wavPath);
  }

  for (let index = 0; index < script.lines.length; index += 1) {
    const line = script.lines[index];
    if (typeof line.text !== 'string' || !line.text) {
      throw new Error(`lines[${index}].text must be a non-empty string.`);
    }
    const workDir = path.join(
      tempDir,
      `line-${String(index + 1).padStart(3, '0')}`,
    );
    await mkdir(workDir, { recursive: true });
    const spoken = line.spoken !== false;
    const start = cursor;
    let result: SynthesisResult;
    if (spoken) {
      result = await engine.synthesize(
        line.reading || line.text,
        voice.options || {},
        workDir,
      );
    } else {
      const wavPath = path.join(workDir, 'silence.wav');
      result = {
        wavPath,
        durationSec: await writeSilenceWav(
          wavPath,
          requireFiniteDuration(line, index),
        ),
      };
    }
    segments.push(result.wavPath);
    cursor += result.durationSec;
    lines.push({
      index,
      text: line.text,
      chapter:
        typeof line.chapter === 'string' && line.chapter.trim()
          ? line.chapter
          : null,
      point:
        typeof line.point === 'string' && line.point.trim() ? line.point : null,
      keywords: Array.isArray(line.keywords)
        ? line.keywords
            .filter((k) => typeof k === 'string' && k.trim())
            .slice(0, 3)
        : extractKeywords(line.text),
      emotion: normalizeEmotion(line.emotion),
      spoken,
      start,
      end: cursor,
    });
    const pause = Number(line.pauseAfter ?? defaultPause);
    if (pause > 0) {
      const wavPath = path.join(workDir, 'pause.wav');
      segments.push(wavPath);
      cursor += await writeSilenceWav(wavPath, pause);
    }
  }

  if (Number(script.leadOut ?? 0) > 0) {
    const wavPath = path.join(tempDir, 'lead-out.wav');
    segments.push(wavPath);
    cursor += await writeSilenceWav(wavPath, Number(script.leadOut));
  }
  return { segments, lines, duration: cursor, voice };
}

async function render(
  config: RenderConfig,
  args: GenArgs,
): Promise<RenderSummary> {
  const audio = await decodeWav(config.audio);
  const totalFrames = Math.max(1, Math.ceil(config.duration * config.fps));
  const mouthValues =
    config.avatar === 'mesh'
      ? (await import('../avatars/mesh/mouth.js')).createMouthValues(
          audio,
          config.fps,
          totalFrames,
        )
      : createMouthValues(audio, config.fps, totalFrames);
  const stage = await openCompositor(config, mouthValues);
  let measuredFrames = 0;
  let totalMs = 0;
  let speakingFrames = 0;
  const renderOne = async (frame: number) => {
    const time = frame / config.fps;
    if (config.lines.some((l) => l.spoken && time >= l.start && time < l.end))
      speakingFrames += 1;
    const result = await stage.renderFrame(frame, mouthValues[frame]);
    measuredFrames += 1;
    totalMs += result.elapsedMs;
    return result;
  };
  const summary = (): Omit<RenderSummary, 'output'> => ({
    launchMode: stage.launchMode,
    scheduledActions: stage.actions,
    avatarDiagnostics: stage.avatarDiagnostics,
    renderPerformance: {
      measuredFrames,
      totalMs,
      averageMsPerFrame: measuredFrames ? totalMs / measuredFrames : 0,
    },
    speakingFrames,
  });

  try {
    if (args.png && args.frame !== null) {
      const target = Math.max(
        0,
        Math.min(totalFrames - 1, Math.floor(args.frame)),
      );
      // Stateful browser avatars replay their fixed clock before capture.
      if (stage.frameFormat === 'png') {
        for (let frame = 0; frame < target; frame++) await renderOne(frame);
      }
      const result = await renderOne(target);
      const pngPath = path.resolve(args.png);
      await mkdir(path.dirname(pngPath), { recursive: true });
      await writeFile(pngPath, result.png());
      return { png: pngPath, frame: target, totalFrames, ...summary() };
    }
    await encodeMp4({
      config,
      frameFormat: stage.frameFormat,
      writeFrames: async (stdin: Writable) => {
        for (let frame = 0; frame < totalFrames; frame += 1) {
          await writeFrame(stdin, (await renderOne(frame)).bytes);
          if (frame % 150 === 0) console.error(`frame ${frame}/${totalFrames}`);
        }
      },
    });
  } finally {
    await stage.close();
  }
  return {
    output: config.output,
    frames: totalFrames,
    duration: totalFrames / config.fps,
    ...summary(),
  };
}

export function parseScript(raw: string): NewsdeskScript {
  const value: unknown = JSON.parse(raw);
  const errors = validateScript(value);
  if (errors.length)
    throw new Error(`Invalid newsdesk script:\n- ${errors.join('\n- ')}`);
  return value as NewsdeskScript;
}

/** Execute the video generation CLI. */
export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  validateArgs(args);

  const scriptPath = path.resolve(args.script);
  const script = parseScript(await readFile(scriptPath, 'utf8'));
  const configFile = args.avatarConfig
    ? path.resolve(args.avatarConfig)
    : scriptPath;
  const rawConfig: unknown = args.avatarConfig
    ? JSON.parse(await readFile(configFile, 'utf8'))
    : {};
  const avatarConfig = await resolveAvatarConfig(
    args.avatar,
    rawConfig,
    configFile,
  );
  const paths = createPaths(scriptPath, script.output, args.output);
  await mkdir(paths.outputDir, { recursive: true });
  await assertFfmpeg();

  if (args.renderOnly) {
    const config = JSON.parse(
      await readFile(paths.configPath, 'utf8'),
    ) as RenderConfig;
    config.avatar = args.avatar;
    config.avatarConfig = avatarConfig;
    const result = await render(config, args);
    console.log(
      JSON.stringify(
        { config: paths.configPath, renderOnly: true, render: result },
        null,
        2,
      ),
    );
    return;
  }

  await mkdir(paths.tempDir, { recursive: true });
  try {
    const synthesis = await synthesizeLines(script, paths.tempDir);
    await concatWavs(synthesis.segments, paths.wavPath);
    const config: RenderConfig = {
      width: 1080,
      height: 1920,
      fps: 30,
      avatar: args.avatar,
      avatarConfig,
      show: {
        title: script.show?.title || 'AI NEWS DESK',
        subtitle: script.show?.subtitle || 'AITuber OnAir',
        clock: /^\d{1,2}:\d{2}$/.test(script.show?.clock ?? '')
          ? String(script.show?.clock)
          : '10:00',
      },
      seed: Number(script.seed ?? 42),
      audio: paths.wavPath,
      output: paths.outputPath,
      lines: synthesis.lines,
      duration: synthesis.duration,
    };
    await writeFile(paths.configPath, JSON.stringify(config, null, 2), 'utf8');
    await writeFile(
      paths.timingsPath,
      JSON.stringify(
        {
          script: scriptPath,
          voice: synthesis.voice,
          audio: paths.wavPath,
          output: paths.outputPath,
          duration: synthesis.duration,
          lines: synthesis.lines,
        },
        null,
        2,
      ),
      'utf8',
    );
    const result = args.dryRun ? null : await render(config, args);
    console.log(
      JSON.stringify(
        {
          audio: paths.wavPath,
          timings: paths.timingsPath,
          config: paths.configPath,
          output: args.dryRun || args.png ? null : paths.outputPath,
          duration: synthesis.duration,
          dryRun: args.dryRun,
          render: result,
        },
        null,
        2,
      ),
    );
  } finally {
    if (!args.keepTemp)
      await rm(paths.tempDir, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
