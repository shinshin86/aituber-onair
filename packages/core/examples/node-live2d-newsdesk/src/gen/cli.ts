#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Writable } from 'node:stream';
import { resolveFrom } from '../paths.js';
import type {
  NewsdeskScript,
  RenderConfig,
  ScriptLine,
  ScriptVoice,
  TimedText,
} from '../types.js';
import {
  DEFAULT_AVATAR_FRAMING,
  DEFAULT_AVATAR_WARMUP_SECONDS,
  MAX_AVATAR_WARMUP_SECONDS,
} from '../types.js';
import {
  concatWavs,
  createMouthValues,
  decodeWav,
  writeSilenceWav,
} from './audio.js';
import { createBlinkSchedule } from './blink.js';
import * as aituberVoiceEngine from './engines/aituberVoice.js';
import * as sayEngine from './engines/say.js';
import * as sineEngine from './engines/sine.js';
import type { SynthesisResult, VoiceEngine } from './engines/types.js';
import { assertFfmpeg, encodeMp4, writeFrame } from './ffmpeg.js';
import {
  createRenderer,
  type MotionDiagnostics,
  type MouthState,
  resolveMouthState,
} from './renderer.js';
import {
  createLive2DAvatar,
  type Live2DAvatarDiagnostics,
} from './live2dAvatar.js';

const ENGINES: Record<ScriptVoice['engine'], VoiceEngine> = {
  say: sayEngine,
  sine: sineEngine,
  'aituber-voice': aituberVoiceEngine,
};

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

interface GenerationPaths {
  outputPath: string;
  outputDir: string;
  wavPath: string;
  timingsPath: string;
  configPath: string;
  tempDir: string;
}

interface LineTiming extends TimedText {
  index: number;
  chapter: string | null;
  spoken: boolean;
  durationSec: number;
  subtitleStart: number;
  subtitleEnd: number;
}

interface SynthesisSummary {
  segments: string[];
  subtitles: TimedText[];
  chapters: TimedText[];
  timings: LineTiming[];
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
  mouthFrames: Record<MouthState, number>;
  mouthExampleFrames: Record<MouthState, number | null>;
  stateFrames: Record<string, number>;
  blinkFrames?: number;
  blinkExampleFrame: number | null;
  averageMsPerFrame: number;
  avatarDiagnostics: Live2DAvatarDiagnostics;
  motionSamples: Array<
    MotionDiagnostics & {
      frame: number;
      time: number;
      mouthValue: number;
    }
  >;
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
  npm run gen -- --script <script.json> [--output <video.mp4>]
  npm run gen -- --script <script.json> [--output <video.mp4>] --dry-run
  npm run gen -- --script <script.json> [--output <video.mp4>] --render-only
  npm run gen -- --script <script.json> --frame 45 --png work/frame45.png`;
}

function validateArgs(args: GenArgs): asserts args is GenArgs & {
  script: string;
} {
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

function normalizeMotionIntensity(value: unknown): number {
  const intensity = Number(value ?? 1);
  return Number.isFinite(intensity) ? Math.max(0, Math.min(3, intensity)) : 1;
}

/** Resolve and strictly validate the pre-capture Live2D settle duration. */
export function resolveAvatarWarmupSeconds(value: unknown): number {
  if (value === undefined) return DEFAULT_AVATAR_WARMUP_SECONDS;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_AVATAR_WARMUP_SECONDS
  ) {
    throw new Error(
      `avatarWarmupSeconds must be a finite number from 0 through ${MAX_AVATAR_WARMUP_SECONDS}.`,
    );
  }
  return value;
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
    configPath: path.join(parsed.dir, `${parsed.name}.live2d-gen.config.json`),
    tempDir: path.join(parsed.dir, `.live2d-gen-${parsed.name}-${process.pid}`),
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

async function synthesizeLines(
  script: NewsdeskScript,
  tempDir: string,
): Promise<SynthesisSummary> {
  const voice: ScriptVoice = script.voice || {
    engine: 'say',
    options: { voice: 'Kyoko', rate: 200 },
  };
  const engine = ENGINES[voice.engine];
  if (!engine) {
    throw new Error(
      `Unsupported voice engine "${voice.engine}". Supported: ${Object.keys(ENGINES).join(', ')}`,
    );
  }
  const segments: string[] = [];
  const subtitles: TimedText[] = [];
  const chapters: TimedText[] = [];
  const timings: LineTiming[] = [];
  let cursor = 0;
  const defaultPause = Number(script.defaultPauseAfter ?? 0.35);

  if (Number(script.leadIn ?? 0) > 0) {
    const wavPath = path.join(tempDir, 'lead-in.wav');
    const durationSec = await writeSilenceWav(wavPath, Number(script.leadIn));
    segments.push(wavPath);
    cursor += durationSec;
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
    const end = cursor;
    const subtitleStart = Math.max(0, start - 0.05);
    const subtitleEnd = end + 0.15;
    subtitles.push({ text: line.text, start: subtitleStart, end: subtitleEnd });
    if (typeof line.chapter === 'string' && line.chapter.trim()) {
      const previous = chapters.at(-1);
      if (previous) previous.end = subtitleStart;
      chapters.push({
        text: line.chapter,
        start: chapters.length === 0 ? 0 : subtitleStart,
        end: 0,
      });
    }
    timings.push({
      index,
      text: line.text,
      chapter: typeof line.chapter === 'string' ? line.chapter : null,
      spoken,
      start,
      end,
      durationSec: result.durationSec,
      subtitleStart,
      subtitleEnd,
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
  const finalChapter = chapters.at(-1);
  if (finalChapter) finalChapter.end = cursor + 1;
  return {
    segments,
    subtitles,
    chapters,
    timings,
    duration: cursor,
    voice,
  };
}

async function render(
  config: RenderConfig,
  args: GenArgs,
): Promise<RenderSummary> {
  const audio = await decodeWav(config.audio);
  const avatar = await createLive2DAvatar(config);
  // ffmpeg uses `-shortest`, so a partial trailing frame would be dropped when
  // the WAV ends. Count only complete frames so the summary matches the MP4.
  const totalFrames = Math.max(1, Math.floor(config.duration * config.fps));
  const mouthValues = createMouthValues(audio, config.fps, totalFrames);
  const blink = createBlinkSchedule(totalFrames, config.fps, config.blinkSeed);
  const renderer = await createRenderer(config, avatar);
  const targetFrame =
    args.png && args.frame !== null
      ? Math.max(0, Math.min(totalFrames - 1, Math.floor(args.frame)))
      : null;
  const mouthFrames: Record<MouthState, number> = {
    closed: 0,
    open: 0,
  };
  const mouthExampleFrames: Record<MouthState, number | null> = {
    closed: null,
    open: null,
  };
  const stateFrames: Record<string, number> = {
    mouth_closed_eyes_open: 0,
    mouth_closed_eyes_closed: 0,
    mouth_open_eyes_open: 0,
    mouth_open_eyes_closed: 0,
  };
  let blinkExampleFrame: number | null = null;
  const samples: RenderSummary['motionSamples'] = [];
  let avatarFrameMs = 0;
  let renderedFrames = 0;
  const sampleFrames = new Set([
    0,
    Math.floor(totalFrames / 3),
    Math.floor((totalFrames * 2) / 3),
    totalFrames - 1,
  ]);

  const renderOne = async (frame: number): Promise<void> => {
    const mouthState = resolveMouthState(mouthValues[frame]);
    const eyesClosed = Boolean(blink[frame]);
    if (eyesClosed) blinkExampleFrame ??= frame;
    mouthFrames[mouthState] += 1;
    mouthExampleFrames[mouthState] ??= frame;
    stateFrames[`mouth_${mouthState}_eyes_${eyesClosed ? 'closed' : 'open'}`] +=
      1;
    const diagnostics = await renderer.render(
      frame,
      mouthValues[frame],
      eyesClosed,
    );
    avatarFrameMs += diagnostics.avatarFrameMs;
    renderedFrames += 1;
    if (sampleFrames.has(frame)) {
      samples.push({
        frame,
        time: frame / config.fps,
        mouthValue: mouthValues[frame],
        ...diagnostics,
      });
    }
  };

  const summaryFields = () => ({
    mouthFrames,
    mouthExampleFrames,
    stateFrames,
    blinkExampleFrame,
    averageMsPerFrame:
      renderedFrames === 0 ? 0 : avatarFrameMs / renderedFrames,
    avatarDiagnostics: avatar.diagnostics,
    motionSamples: samples,
  });

  try {
    if (args.png && targetFrame !== null) {
      for (let frame = 0; frame <= targetFrame; frame += 1) {
        await renderOne(frame);
      }
      const pngPath = path.resolve(args.png);
      await mkdir(path.dirname(pngPath), { recursive: true });
      await writeFile(pngPath, renderer.canvas.toBuffer('image/png'));
      return {
        png: pngPath,
        frame: targetFrame,
        totalFrames,
        ...summaryFields(),
      };
    }

    await encodeMp4({
      config,
      writeFrames: async (stdin: Writable) => {
        for (let frame = 0; frame < totalFrames; frame += 1) {
          await renderOne(frame);
          await writeFrame(stdin, renderer.rgba());
          if ((frame + 1) % config.fps === 0 || frame === totalFrames - 1) {
            console.error(
              `Rendered ${frame + 1}/${totalFrames} Live2D frames ` +
                `(${(avatarFrameMs / renderedFrames).toFixed(1)} ms/frame).`,
            );
          }
        }
      },
    });
    return {
      output: config.output,
      frames: totalFrames,
      duration: totalFrames / config.fps,
      blinkFrames: blink.reduce((sum, value) => sum + value, 0),
      ...summaryFields(),
    };
  } finally {
    await avatar.close();
  }
}

function parseScript(raw: string): NewsdeskScript {
  const value = JSON.parse(raw) as Partial<NewsdeskScript>;
  if (!Array.isArray(value.lines) || value.lines.length === 0)
    throw new Error('script.json must include a non-empty lines array.');
  if (typeof value.avatar !== 'string' || value.avatar.trim() === '') {
    throw new Error(
      'script.json must include a Live2D avatar model3.json path.',
    );
  }
  if (typeof value.cubismCore !== 'string' || value.cubismCore.trim() === '') {
    throw new Error(
      'script.json must include the local live2dcubismcore.min.js path as cubismCore.',
    );
  }
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
  const paths = createPaths(scriptPath, script.output, args.output);
  await mkdir(paths.outputDir, { recursive: true });
  await assertFfmpeg();

  if (args.renderOnly) {
    const storedConfig = JSON.parse(
      await readFile(paths.configPath, 'utf8'),
    ) as RenderConfig;
    const config: RenderConfig = {
      ...storedConfig,
      avatarWarmupSeconds: resolveAvatarWarmupSeconds(
        storedConfig.avatarWarmupSeconds,
      ),
    };
    const result = await render(config, args);
    console.log(
      JSON.stringify(
        {
          audio: config.audio,
          config: paths.configPath,
          output: config.output,
          duration: config.duration,
          renderOnly: true,
          render: result,
        },
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
      background: {
        color: '#20242c',
        ...script.background,
      },
      avatarLayout: {
        scale: 1,
        x: 0.5,
        y: 0.5,
        ...script.avatarLayout,
      },
      avatarFraming: {
        ...DEFAULT_AVATAR_FRAMING,
        ...script.avatarFraming,
      },
      avatarMotion: {
        idle: script.avatarMotion?.idle ?? null,
      },
      avatarWarmupSeconds: resolveAvatarWarmupSeconds(
        script.avatarWarmupSeconds,
      ),
      motion: {
        intensity: normalizeMotionIntensity(script.motion?.intensity),
      },
      blinkSeed: Number(script.blinkSeed ?? 42),
      avatar: resolveFrom(scriptPath, script.avatar),
      cubismCore: resolveFrom(scriptPath, script.cubismCore),
      audio: paths.wavPath,
      output: paths.outputPath,
      telop: script.telop || '',
      subtitles: synthesis.subtitles,
      chapters: synthesis.chapters,
      duration: synthesis.duration,
    };
    if (config.background.image) {
      config.background.image = resolveFrom(
        scriptPath,
        config.background.image,
      );
    }
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
          lines: synthesis.timings,
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

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
