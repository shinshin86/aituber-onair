import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateScript } from '../schema.js';
import type { BiimScript, ScriptSpeaker } from '../types.js';
import { synthesizeLine } from '../synthesis.js';
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
import { audioSlot, eventWidgets, type ExternalEvent } from './events.js';
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
  events?: ExternalEvent[];
  voice?: ScriptSpeaker['voice'];
  voiceCache?: string;
  measure?: (text: string, speaker: ScriptSpeaker) => Promise<number>;
}
export async function generateScript(options: PipelineOptions) {
  const audioTemporary = await mkdtemp(
    path.join(os.tmpdir(), 'biim-autoscript-audio-'),
  );
  try {
    const { profile, transport, frames, duration } = options;
    const director = new Director(profile, duration, {
      silence: options.silence,
      stale: options.stale ?? 5,
      overlap: 0.35,
    });
    const models = { ...DEFAULT_MODELS, ...options.models };
    const rolePrompts = prompts(profile);
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
        voice: options.voice ?? {
          engine: 'sine',
          options: {
            secondsPerChar: 0.2,
            frequency: id === 'dango' ? 440 : 330,
          },
        },
      };
    await validateScript({ speakers, lines: [] }, base);
    let audioIndex = 0;
    const measure =
      options.measure ??
      (async (text: string, speaker: ScriptSpeaker) =>
        (
          await synthesizeLine(
            { speaker: 'measure', text },
            speaker,
            path.join(audioTemporary, String(audioIndex++)),
            options.voiceCache ?? path.resolve('work/voice-cache'),
          )
        ).duration);
    const currentEvents = (at: number) =>
      (options.events ?? []).filter((e) => Math.abs(e.at - at) < 1e-6);
    const observations: { at: number; scene: SceneState }[] = [];
    const rejected: {
      at: number;
      role: Role;
      candidate: string;
      reason: string;
    }[] = [];
    const events: { at: number; value: number; text?: string }[] = [];
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
        if (
          role === 'observer' &&
          ++visionCalls > (options.maxVisionCalls ?? 48)
        )
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
        {
          at: frame.at,
          memo: options.memo,
          previous,
          ...(options.events ? { events: currentEvents(frame.at) } : {}),
        },
        (v) => parseScene(v, options.memo),
        frame.image,
      );
      if (!scene) throw new Error('Missing SceneState');
      observations.push({ at: frame.at, scene });
      previous = scene;
    }
    for (const [index, frame] of frames.entries()) {
      const scene = observations[index].scene;
      const candidate = await ask(
        'panels',
        { at: frame.at, scene, current: director.current },
        (v) => parsePanels(v, profile, scene),
      );
      if (candidate) director.edit(frame.at, candidate, scene);
      const counter = director.counterState(scene);
      if (
        counter &&
        (counter.value !== events.at(-1)?.value ||
          counter.text !== events.at(-1)?.text)
      )
        events.push({ at: frame.at, ...counter });
      const input = {
        at: frame.at,
        scene,
        current: director.current,
        lastLines: director.lines.slice(-5).map((l) => l.text),
        ...(options.events ? { events: currentEvents(frame.at) } : {}),
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
        if (!line.text) {
          director.commentary(frame.at, null, scene, speaker);
          break;
        }
        const event = line.eventId
          ? (options.events ?? []).find((e) => e.id === line.eventId)
          : undefined;
        if (line.eventId && (!event || event.at > frame.at + 1e-6)) {
          director.decisions.push({
            at: frame.at,
            role: 'commentary',
            candidate: line.text,
            accepted: false,
            reason: 'invalid-or-future-event',
          });
          break;
        }
        const priority =
          event?.importance ??
          (scene.events.some((e) => e.importance === 3) || scene.sceneChanged
            ? 3
            : 1);
        const eventAt = event?.at ?? (priority === 3 ? frame.at : undefined);
        const deadlines = options.events
          ? options.events
              .filter((e) => e.importance >= Math.max(2, priority))
              .map((e) => e.at)
          : observations
              .filter(
                (v) =>
                  v.scene.sceneChanged ||
                  v.scene.events.some((e) => e.importance === 3),
              )
              .map((v) => v.at);
        const nextImportant =
          deadlines.find((at) => at > frame.at + 1e-6) ??
          Number.POSITIVE_INFINITY;
        let text = line.text;
        let measured = await measure(text, speakers[speaker]);
        let slot = audioSlot({
          at: frame.at,
          eventAt,
          duration: measured,
          priority,
          nextImportant,
          sourceEnd: duration,
          available: director.nextAvailable,
          stale: options.stale ?? 5,
        });
        let shortened = false;
        if (slot.reason !== 'accepted' && line.shortText) {
          director.decisions.push({
            at: frame.at,
            role: 'commentary',
            candidate: text,
            accepted: false,
            reason: slot.reason,
            audioDuration: measured,
            eventAt,
          });
          text = line.shortText;
          measured = await measure(text, speakers[speaker]);
          shortened = true;
          slot = audioSlot({
            at: frame.at,
            eventAt,
            duration: measured,
            priority,
            nextImportant,
            sourceEnd: duration,
            available: director.nextAvailable,
            stale: options.stale ?? 5,
          });
        }
        if (slot.reason !== 'accepted') {
          director.decisions.push({
            at: frame.at,
            role: 'commentary',
            candidate: text,
            accepted: false,
            reason: slot.reason,
            audioDuration: measured,
            eventAt,
            scheduledAt: slot.start,
          });
          break;
        }
        const decision = director.commentary(frame.at, text, scene, speaker, {
          duration: measured,
          eventAt,
          start: slot.start,
          shortened,
        });
        Object.assign(director.decisions.at(-1) ?? {}, {
          audioDuration: measured,
          eventAt,
          shortened,
          delta: eventAt === undefined ? undefined : slot.start - eventAt,
        });
        if (decision !== 'retry') break;
        feedback =
          'Panel overlap. Choose an unrelated reaction or null; do not paraphrase the panels.';
      }
    }
    // Source video already establishes the tail. A trailing narration pause must
    // not extend the timeline past it and introduce black frames at the end.
    const lastLine = director.lines.at(-1);
    if (lastLine) lastLine.pauseAfter = 0;
    const script: BiimScript = {
      $schema: relative(
        path.join(exampleRoot, 'schema/biim-script.schema.json'),
      ),
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
      ...(options.events
        ? eventWidgets(options.events, 'dango', duration)
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
        'Speech durations were synthesized/measured using the selected voice cache. Numeric starts never precede their event; lower-priority lines that do not fit are shortened or dropped.',
    };
    const sidecar = `${options.output.replace(/\.json$/i, '')}.debug.json`;
    await mkdir(base, { recursive: true });
    await writeFile(options.output, serialized);
    await writeFile(
      sidecar,
      redact(`${JSON.stringify(debug, null, 2)}\n`, secrets),
    );
    return { script: clean, debug, sidecar };
  } finally {
    await rm(audioTemporary, { recursive: true, force: true });
  }
}
