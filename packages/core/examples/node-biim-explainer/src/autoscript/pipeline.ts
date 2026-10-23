import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateScript } from '../schema.js';
import type { BiimScript } from '../types.js';
import {
  type Profile,
  type SceneState,
  parseCommentary,
  parseJson,
  parsePanels,
  parseScene,
} from './contracts.js';
import { Director } from './director.js';
import type { Sample } from './frames.js';
import {
  DEFAULT_MODELS,
  type Request,
  type Role,
  type Transport,
  prompts,
  redact,
} from './llm.js';

export interface PipelineOptions {
  input: string;
  output: string;
  duration: number;
  frames: (Sample & { image: string })[];
  profile: Profile;
  memo: string;
  transport: Transport;
  models?: Partial<Record<Role, string>>;
  speakers?: 1 | 2;
  secrets?: string[];
  silence?: number;
  stale?: number;
  maxVisionCalls?: number;
}
export async function generateScript(options: PipelineOptions) {
  const { profile, transport, frames, duration } = options;
  const director = new Director(profile, duration, {
    silence: options.silence ?? 10,
    stale: options.stale ?? 5,
    overlap: 0.35,
  });
  const models = { ...DEFAULT_MODELS, ...options.models };
  const rolePrompts = prompts(profile);
  const observations: { at: number; scene: SceneState }[] = [];
  const rejected: {
    at: number;
    role: Role;
    candidate: string;
    reason: string;
  }[] = [];
  const events: { at: number; value: number }[] = [];
  let previous: SceneState | null = null;
  let visionCalls = 0;
  async function ask<T>(
    role: Role,
    input: Record<string, unknown>,
    parse: (value: unknown) => T,
    image?: string,
    attempts = 2,
  ): Promise<T | undefined> {
    let feedback: string | undefined;
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (role === 'observer' && ++visionCalls > (options.maxVisionCalls ?? 48))
        throw new Error(
          'Vision call budget exhausted (including retries); increase --max-vision-calls or reduce --max-frames',
        );
      const request: Request = {
        version: 1,
        role,
        model: models[role],
        prompt: rolePrompts[role],
        input: { ...input, ...(feedback ? { feedback } : {}) },
        ...(image ? { image } : {}),
      };
      const response = await transport(request);
      try {
        return parse(parseJson(response));
      } catch (error) {
        feedback = (error as Error).message;
        rejected.push({
          at: input.at as number,
          role,
          candidate: response,
          reason: feedback,
        });
      }
    }
    // A broken observer should stop instead of silently describing a blank scene.
    if (role === 'observer')
      throw new Error(`Invalid SceneState at ${input.at}s after one retry`);
    return undefined;
  }
  for (const frame of frames) {
    const scene: SceneState | undefined = await ask<SceneState>(
      'observer',
      { at: frame.at, memo: options.memo, previous },
      (v) => parseScene(v, options.memo),
      frame.image,
    );
    if (!scene) throw new Error('Missing SceneState');
    observations.push({ at: frame.at, scene });
    previous = scene;
    const candidate = await ask(
      'panels',
      { at: frame.at, scene, current: director.current },
      (v) => parsePanels(v, profile, scene),
    );
    if (candidate) director.edit(frame.at, candidate);
    const counter = director.counterValue(scene);
    if (counter !== undefined && counter !== events.at(-1)?.value)
      events.push({ at: frame.at, value: counter });
    const input = {
      at: frame.at,
      scene,
      current: director.current,
      lastLines: director.lines.slice(-5).map((l) => l.text),
    };
    const speaker =
      options.speakers === 2 && director.lines.length % 2 ? 'bob' : 'dango';
    let feedback: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const line = await ask(
        'commentary',
        { ...input, ...(feedback ? { feedback } : {}) },
        (v) => parseCommentary(v, profile),
        undefined,
        1,
      );
      if (!line) {
        feedback =
          'Invalid commentary. Return one short line within the character limit, or null.';
        continue;
      }
      if (director.commentary(frame.at, line.text, scene, speaker) !== 'retry')
        break;
      feedback =
        'Panel overlap. Choose an unrelated reaction or null; do not paraphrase the panels.';
    }
  }
  const base = path.dirname(path.resolve(options.output));
  const exampleRoot = fileURLToPath(
    new URL(
      import.meta.url.includes('/src/autoscript/') ? '../../' : '../',
      import.meta.url,
    ),
  );
  const relative = (file: string) =>
    path.relative(base, path.resolve(file)).split(path.sep).join('/');
  const speakers: BiimScript['speakers'] = {};
  for (const id of options.speakers === 2 ? ['dango', 'bob'] : ['dango'])
    speakers[id] = {
      name: id === 'dango' ? 'だんご' : 'ぼぶ',
      image: relative(path.join(exampleRoot, 'assets/yukkuri', id)),
      mirror: true,
      voice: {
        engine: 'sine',
        options: { secondsPerChar: 0.2, frequency: id === 'dango' ? 440 : 330 },
      },
    };
  const script: BiimScript = {
    $schema: relative(path.join(exampleRoot, 'schema/biim-script.schema.json')),
    canvas: '16:9',
    fps: 30,
    seed: 1,
    speakers,
    defaults: { pauseAfter: 0.3 },
    lines: director.lines,
    main: [
      {
        at: 0,
        until: duration,
        video: relative(options.input),
        from: 0,
        to: duration,
        audio: false,
        fit: 'contain',
      },
    ],
    panels: director.panels,
    timer: { start: 0, stop: duration, position: 'main-bottom-right' },
    ...(events.length
      ? { counter: { label: profile.scoreboard.label, events } }
      : {}),
  };
  // The renderer accepts an empty narration list. Silence stays silence.
  const secrets = options.secrets ?? [];
  const serialized = redact(`${JSON.stringify(script, null, 2)}\n`, secrets);
  const clean = JSON.parse(serialized) as BiimScript;
  await validateScript(clean, base);
  const debug = {
    version: 1,
    models,
    profile: profile.name,
    duration,
    visionCalls,
    samples: frames.map(({ image: _image, ...sample }) => sample),
    observations,
    decisions: director.decisions,
    rejected,
    timing:
      'Sequential end anchors use a 5-character/sec planning estimate. Review actual TTS timing before rendering.',
  };
  const sidecar = `${options.output.replace(/\.json$/i, '')}.debug.json`;
  await mkdir(base, { recursive: true });
  await writeFile(options.output, serialized);
  await writeFile(
    sidecar,
    redact(`${JSON.stringify(debug, null, 2)}\n`, secrets),
  );
  return { script: clean, debug, sidecar };
}
