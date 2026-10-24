import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { loadProfile } from './contracts.js';
import { sampleVideo } from './frames.js';
import { cachedTransport, openAITransport, redact, type Role } from './llm.js';
import { generateScript } from './pipeline.js';
import { parseEvents } from './events.js';

export async function runAutoscript(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
) {
  const [input, ...flags] = args;
  if (!input || input.startsWith('-'))
    throw new Error(
      'Usage: autoscript <input.mp4> --profile game --memo memo.md --out work/auto.json [--replay dir|--record dir] [--interval 2] [--max-frames 48] [--max-vision-calls 48] [--scene-threshold 0.12] [--speakers 1|2] [--env-file .env] [--observer-model id] [--panels-model id] [--commentary-model id] [--silence seconds] [--stale 5] [--events events.json] [--voice-file voice.json] [--voice-cache dir]',
    );
  const values: Record<string, string> = {};
  const known = [
    'profile',
    'memo',
    'out',
    'replay',
    'record',
    'interval',
    'max-frames',
    'max-vision-calls',
    'scene-threshold',
    'speakers',
    'env-file',
    'observer-model',
    'panels-model',
    'commentary-model',
    'silence',
    'stale',
    'events',
    'voice-file',
    'voice-cache',
  ];
  for (let i = 0; i < flags.length; i++) {
    const name = flags[i].slice(2);
    const value = flags[++i];
    if (
      !flags[i - 1].startsWith('--') ||
      !known.includes(name) ||
      !value ||
      value.startsWith('--')
    )
      throw new Error(`Invalid or missing autoscript option: ${flags[i - 1]}`);
    values[name] = value;
  }
  if (values.record && values.replay)
    throw new Error('Choose --record or --replay');
  if (values.out && !values.out.endsWith('.json'))
    throw new Error('--out must end in .json');
  function number(
    key: string,
    fallback: number,
    min: number,
    max = Number.MAX_SAFE_INTEGER,
  ) {
    const value = Number(values[key] ?? fallback);
    if (!Number.isFinite(value) || value < min || value > max)
      throw new Error(`Invalid --${key}`);
    return value;
  }
  const interval = number('interval', 2, 1);
  const threshold = number('scene-threshold', 0.12, 0.001, 1);
  const cap = number('max-frames', 48, 1, 10000);
  const speakers = number('speakers', 1, 1, 2);
  if (!Number.isInteger(cap) || !Number.isInteger(speakers))
    throw new Error('--max-frames and --speakers must be integers');
  const maxVisionCalls = number('max-vision-calls', 48, 1, 10000);
  if (!Number.isInteger(maxVisionCalls))
    throw new Error('--max-vision-calls must be an integer');
  const exampleRoot = fileURLToPath(
    new URL(
      import.meta.url.includes('/src/autoscript/') ? '../../' : '../',
      import.meta.url,
    ),
  );
  let loaded: NodeJS.ProcessEnv = {};
  try {
    loaded = parseEnv(
      await readFile(
        values['env-file'] ?? path.join(exampleRoot, '.env'),
        'utf8',
      ),
    );
  } catch (error) {
    if (
      values['env-file'] ||
      (error as NodeJS.ErrnoException).code !== 'ENOENT'
    )
      throw new Error('Cannot read --env-file');
  }
  const configuration = { ...loaded, ...env };
  const apiKey = configuration.OPENAI_API_KEY ?? '';
  const secrets = [apiKey];
  const models: Partial<Record<Role, string>> = {};
  for (const role of ['observer', 'panels', 'commentary'] as const) {
    const value =
      values[`${role}-model`] ??
      configuration[`BIIM_${role.toUpperCase()}_MODEL`];
    if (value) models[role] = value;
  }
  const profileName = values.profile ?? 'generic';
  const profile = await loadProfile(
    ['game', 'generic'].includes(profileName)
      ? path.join(exampleRoot, 'profiles', `${profileName}.json`)
      : profileName,
  );
  const memo = values.memo ? await readFile(values.memo, 'utf8') : '';
  const events = values.events
    ? parseEvents(JSON.parse(await readFile(values.events, 'utf8')))
    : undefined;
  const voice = values['voice-file']
    ? JSON.parse(await readFile(values['voice-file'], 'utf8'))
    : undefined;
  if (!values.replay && !apiKey)
    throw new Error('Set OPENAI_API_KEY or use --replay <cache-dir>');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'biim-autoscript-'));
  try {
    const sampled = await sampleVideo(path.resolve(input), temporary, {
      interval,
      threshold,
      cap,
      ...(events
        ? { times: events.filter((e) => e.kind !== 'gem').map((e) => e.at) }
        : {}),
    });
    const result = await generateScript({
      ...sampled,
      input,
      output: values.out ?? 'work/auto.json',
      profile,
      memo,
      models,
      secrets,
      speakers: speakers as 1 | 2,
      silence:
        values.silence === undefined ? undefined : number('silence', 4, 0),
      stale: number('stale', 5, 0),
      maxVisionCalls,
      events: events ? parseEvents(events, sampled.duration) : undefined,
      voice,
      voiceCache: values['voice-cache']
        ? path.resolve(values['voice-cache'])
        : undefined,
      transport: cachedTransport(
        { replay: values.replay, record: values.record, secrets },
        openAITransport(apiKey),
      ),
    });
    console.log(
      `Generated ${result.script.lines.length} commentary lines from ${sampled.frames.length} frames; review script and debug sidecar before rendering.`,
    );
    return result;
  } catch (error) {
    throw new Error(redact((error as Error).message, secrets));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runAutoscript(process.argv.slice(2)).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
