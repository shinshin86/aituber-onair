import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { parseScript } from '../src/schema.js';
import { parseArgs, synthesizeLines } from '../src/gen/cli.js';
import {
  concatWavs,
  decodeWav,
  SAMPLE_RATE,
  writePcm16Wav,
} from '../src/gen/audio.js';
import { synthesize } from '../src/gen/engines/aituberVoice.js';
import { buildMotion } from '../src/gen/motion.js';
import { openCompositor } from '../src/gen/compositor.js';
import { resolveImagePaths } from '../src/gen/avatarStates.js';
import type { RenderConfig } from '../src/types.js';

const fixture = JSON.parse(
  await readFile(
    new URL('../samples/yukkuri-hello-sine.json', import.meta.url),
    'utf8',
  ),
);
const dirs: string[] = [];
async function temp() {
  const dir = await mkdtemp(path.join(tmpdir(), 'yukkuri-test-'));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  vi.unstubAllGlobals();
  for (const dir of dirs.splice(0))
    await rm(dir, { recursive: true, force: true });
});

describe('script and CLI validation', () => {
  it('accepts both sample scripts and different voices', async () => {
    for (const file of ['yukkuri-hello-sine.json', 'yukkuri-hello-aqtp.json']) {
      const script = parseScript(
        await readFile(new URL(`../samples/${file}`, import.meta.url), 'utf8'),
      );
      expect(script.lines).toHaveLength(8);
      expect(script.speakers.dango.voice.options).not.toEqual(
        script.speakers.bob.voice.options,
      );
    }
  });
  it.each(['missing', 'toString', '__proto__'])(
    'rejects unknown speaker %s',
    (speaker) => {
      const value = structuredClone(fixture);
      value.lines[0].speaker = speaker;
      expect(() => parseScript(JSON.stringify(value))).toThrow(
        /lines\[0\].speaker: unknown speaker/,
      );
    },
  );
  it('rejects overlapping positions, invalid timing and invalid voices before synthesis', () => {
    const value = structuredClone(fixture);
    value.speakers.bob.position = 'left';
    value.lines[0].pauseAfter = -1;
    value.speakers.dango.voice.engine = 'invalid';
    expect(() => parseScript(JSON.stringify(value))).toThrow(
      /different positions/,
    );
    expect(() => parseScript(JSON.stringify(value))).toThrow(/pauseAfter/);
    expect(() => parseScript(JSON.stringify(value))).toThrow(/voice.engine/);
  });
  it('requires positive duration for silent subtitles', () => {
    const value = structuredClone(fixture);
    value.lines[0].spoken = false;
    expect(() => parseScript(JSON.stringify(value))).toThrow(/duration/);
  });
  it('accepts positional paths and aliases, and rejects obsolete avatar flags', () => {
    expect(parseArgs(['sample.json', '--out', 'out.mp4']).output).toBe(
      'out.mp4',
    );
    expect(
      parseArgs(['--script', 'sample.json', '--output', 'out.mp4']).script,
    ).toBe('sample.json');
    expect(() => parseArgs(['sample.json', '--avatar', 'vrm'])).toThrow(
      /Unknown argument/,
    );
    expect(() =>
      parseArgs(['sample.json', '--frame', 'NaN', '--png', 'out.png']),
    ).toThrow(/integer/);
    expect(() => parseArgs(['sample.json', '--frame', '1'])).toThrow(
      /together/,
    );
  });
});

describe('per-speaker synthesis', () => {
  it('selects each voice and preserves silence and subtitle timing', async () => {
    const script = parseScript(JSON.stringify(fixture));
    for (const speaker of Object.values(script.speakers))
      speaker.voice.options = {
        ...speaker.voice.options,
        secondsPerChar: 0.001,
        minDuration: 0.2,
      };
    script.leadIn = 0.1;
    script.leadOut = 0.2;
    script.defaultPauseAfter = 0.1;
    script.lines = [
      script.lines[0],
      script.lines[1],
      { speaker: 'dango', text: 'silent', spoken: false, duration: 0.2 },
    ];
    const dir = await temp();
    const result = await synthesizeLines(script, dir);
    expect(result.lines.map((line) => line.speaker)).toEqual([
      'dango',
      'bob',
      'dango',
    ]);
    expect(result.lines[0].start).toBeCloseTo(0.1);
    expect(result.lines[1].start).toBeCloseTo(0.4);
    expect(result.duration).toBeCloseTo(1.2);
    const first = await decodeWav(path.join(dir, 'line-0/voice.wav'));
    const second = await decodeWav(path.join(dir, 'line-1/voice.wav'));
    const crossings = (samples: Float32Array) =>
      samples.reduce(
        (n, v, i) => n + (i > 0 && v > 0 && samples[i - 1] <= 0 ? 1 : 0),
        0,
      );
    expect(crossings(second.samples) / crossings(first.samples)).toBeCloseTo(
      1.5,
      1,
    );
    const combined = path.join(dir, 'all.wav');
    expect(await concatWavs(result.segments, combined)).toBeCloseTo(
      result.duration,
    );
    const audio = await decodeWav(combined);
    expect(audio.samples.slice(0, SAMPLE_RATE / 10).every((v) => v === 0)).toBe(
      true,
    );
    expect(
      audio.samples
        .slice(Math.ceil(result.lines[2].start * SAMPLE_RATE))
        .every((v) => v === 0),
    ).toBe(true);
  });
  it('passes aqtp presets and endpoint through Core without instructions', async () => {
    const dir = await temp();
    const wav = path.join(dir, 'input.wav');
    await writePcm16Wav(wav, new Float32Array(4800).fill(0.1));
    const bytes = await readFile(wav);
    const fetchMock = vi.fn(
      async () =>
        new Response(bytes, { headers: { 'Content-Type': 'audio/wav' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const script = parseScript(
      await readFile(
        new URL('../samples/yukkuri-hello-aqtp.json', import.meta.url),
        'utf8',
      ),
    );
    for (const [id, speaker] of Object.entries(script.speakers)) {
      const result = await synthesize(
        'こんにちは',
        speaker.voice.options ?? {},
        path.join(dir, id),
      );
      expect(result.durationSec).toBeCloseTo(0.1);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([url]) => url)).toEqual(
      Array(2).fill('http://127.0.0.1:20203/v1/audio/speech'),
    );
    const bodies = calls.map(([, options]) => JSON.parse(String(options.body)));
    expect(bodies.map((body) => body.voice)).toEqual(['れいむ', 'まりさ']);
    expect(bodies[0]).toMatchObject({
      model: 'aquestalkplayer',
      input: 'こんにちは',
      response_format: 'wav',
    });
    expect(bodies.every((body) => !('instructions' in body))).toBe(true);
  });
});

function renderConfig(): RenderConfig {
  const script = parseScript(JSON.stringify(fixture));
  for (const speaker of Object.values(script.speakers))
    speaker.image = resolveImagePaths(speaker.image, path.resolve('samples'));
  return {
    width: 1920,
    height: 1080,
    fps: 30,
    seed: 42,
    duration: 10,
    audio: '',
    output: '',
    speakers: script.speakers,
    show: { title: '音と動き', subtitle: 'Test' },
    lines: [
      { ...script.lines[0], index: 0, spoken: true, start: 0.5, end: 2 },
      { ...script.lines[1], index: 1, spoken: true, start: 4, end: 5.5 },
    ],
  };
}

describe('deterministic motion and drawing', () => {
  it('isolates each speaker, settles after speech, and repeats for the same seed', () => {
    const config = renderConfig();
    config.motion = 'bounce';
    const samples = new Float32Array(SAMPLE_RATE * 10).fill(0.12);
    const audio = { samples, sampleRate: SAMPLE_RATE, duration: 10 };
    const motion = buildMotion(config, audio);
    expect(buildMotion(config, audio)).toEqual(motion);
    expect(motion.dango.slice(0, 15).every((p) => Math.abs(p.y) <= 2)).toBe(
      true,
    );
    expect(motion.dango.slice(20, 60).some((p) => p.y < -10)).toBe(true);
    expect(
      motion.bob
        .slice(0, 120)
        .every((p) => p.level === 0 && Math.abs(p.y) <= 2),
    ).toBe(true);
    expect(motion.bob.slice(125, 165).some((p) => p.y < -10)).toBe(true);
    expect(motion.dango.slice(120).every((p) => Math.abs(p.y) <= 2)).toBe(true);
    expect(
      motion.bob
        .slice(240)
        .every((p) => Math.abs(p.y) <= 2 && Math.abs(p.rotation) < 0.001),
    ).toBe(true);
    const silent = buildMotion(config, {
      ...audio,
      samples: new Float32Array(samples.length),
    });
    expect(silent.dango.every((p) => Math.abs(p.y) <= 2)).toBe(true);
  });
  it('renders repeatable 1920x1080 PNGs when seeking between speakers', async () => {
    const config = renderConfig();
    const audio = {
      samples: new Float32Array(SAMPLE_RATE * 10).fill(0.1),
      sampleRate: SAMPLE_RATE,
      duration: 10,
    };
    const stage = await openCompositor(config, audio);
    const first = stage.renderFrame(30).png();
    const second = stage.renderFrame(140).png();
    expect(first.readUInt32BE(16)).toBe(1920);
    expect(first.readUInt32BE(20)).toBe(1080);
    expect(second.equals(first)).toBe(false);
    expect(stage.renderFrame(30).png().equals(first)).toBe(true);
    expect(() => stage.renderFrame(300)).toThrow(/outside/);
  });
});
