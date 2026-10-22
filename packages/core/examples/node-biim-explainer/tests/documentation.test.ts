import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Ajv from 'ajv';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { validateScript } from '../src/schema.js';
import { decodeWav } from '../src/gen/audio.js';
import { synthesize } from '../src/gen/engines/sine.js';
import { performanceOptions } from '../src/gen/avatarStates.js';
import { resolveTimeline } from '../src/timeline.js';
import type { BiimScript } from '../src/types.js';

type Node = Record<string, unknown>;
const schema: Node = JSON.parse(
  await readFile('schema/biim-script.schema.json', 'utf8'),
);
function walk(
  value: unknown,
  visit: (node: Node, pointer: string) => void,
  pointer = '#',
) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, visit, `${pointer}/${i}`));
    return;
  }
  const node = value as Node;
  visit(node, pointer);
  for (const [key, child] of Object.entries(node)) {
    if (!['default', 'examples'].includes(key))
      walk(child, visit, `${pointer}/${key}`);
  }
}

// Genuine shared types use $ref. Add exact text + pointers here only if an
// intentional same-meaning property description must be duplicated later.
const sharedDescriptions = new Map<string, string[]>();
function auditDescriptions(value: unknown): string[] {
  const issues: string[] = [];
  const used = new Map<string, string>();
  walk(value, (node, pointer) => {
    if (
      !pointer.includes('/properties/') ||
      pointer.split('/').at(-2) !== 'properties'
    )
      return;
    for (const key of ['description', 'x-description-ja']) {
      const text = node[key];
      if (typeof text !== 'string' || !text.trim()) {
        issues.push(`${pointer}: missing ${key}`);
        continue;
      }
      if (/(?:setting\.|placeholder|TODO|TBD|説明未設定)/i.test(text))
        issues.push(`${pointer}: placeholder ${key}`);
      const first = used.get(text);
      if (
        first &&
        ![first, pointer].every((p) =>
          sharedDescriptions.get(text)?.includes(p),
        )
      )
        issues.push(`${pointer}: duplicate description from ${first}`);
      used.set(text, pointer);
    }
  });
  return issues;
}

function fieldPaths(node: Node, prefix = '', result = new Set<string>()) {
  for (const [key, value] of Object.entries((node.properties ?? {}) as Node)) {
    const next = prefix ? `${prefix}.${key}` : key;
    result.add(next);
    fieldPaths(value as Node, next, result);
  }
  if (node.items) fieldPaths(node.items as Node, `${prefix}[]`, result);
  if (
    node.additionalProperties &&
    typeof node.additionalProperties === 'object'
  )
    fieldPaths(node.additionalProperties as Node, `${prefix}.*`, result);
  for (const branch of [
    ...((node.oneOf ?? []) as Node[]),
    ...((node.allOf ?? []) as Node[]),
  ])
    fieldPaths(branch, prefix, result);
  for (const key of ['if', 'then', 'else'])
    if (node[key]) fieldPaths(node[key] as Node, prefix, result);
  return result;
}
function samplePaths(value: unknown, prefix = '', result = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) samplePaths(item, `${prefix}[]`, result);
  } else if (value && typeof value === 'object')
    for (const [key, child] of Object.entries(value)) {
      const next =
        prefix === 'speakers'
          ? 'speakers.*'
          : prefix
            ? `${prefix}.${key}`
            : key;
      result.add(next);
      samplePaths(child, next, result);
    }
  return result;
}

describe('schema documentation contract', () => {
  it('requires specific English/Japanese descriptions for every property', () => {
    expect(auditDescriptions(schema)).toEqual([]);
  });
  it('detects missing, placeholder and copied descriptions', () => {
    const broken = structuredClone(schema);
    const properties = broken.properties as Record<string, Node>;
    properties.canvas.description = undefined;
    properties.fps.description = '$schema setting.';
    properties.output.description = properties.seed.description;
    expect(auditDescriptions(broken).join('\n')).toContain(
      'missing description',
    );
    expect(auditDescriptions(broken).join('\n')).toContain(
      'placeholder description',
    );
    expect(auditDescriptions(broken).join('\n')).toContain(
      'duplicate description',
    );
  });
  it('keeps both generated references in sync', () => {
    expect(
      execFileSync(process.execPath, ['scripts/reference.mjs', '--check'], {
        encoding: 'utf8',
      }),
    ).toContain('up to date');
  });
  it('publishes schema-valid defaults and examples', () => {
    const ajv = new Ajv({ strict: false });
    walk(schema, (node, pointer) => {
      const values = [
        ...((node.examples ?? []) as unknown[]),
        ...(Object.hasOwn(node, 'default') ? [node.default] : []),
      ];
      if (!values.length) return;
      const validate = ajv.compile({ ...node, $defs: schema.$defs });
      for (const value of values)
        expect(
          validate(value),
          `${pointer}: ${JSON.stringify(validate.errors)}`,
        ).toBe(true);
    });
  });
  it('validates every sample and covers every public schema field across variants', async () => {
    const observed = new Set<string>();
    for (const filename of (await readdir('samples')).filter((name) =>
      name.endsWith('.json'),
    )) {
      const input = JSON.parse(
        await readFile(path.join('samples', filename), 'utf8'),
      );
      await expect(
        validateScript(input, path.resolve('samples')),
        filename,
      ).resolves.toEqual(input);
      for (const field of samplePaths(input)) observed.add(field);
    }
    expect(
      [...fieldPaths(schema)].filter((field) => !observed.has(field)),
    ).toEqual([]);
  });
  it('documents runtime defaults without inserting annotations into input', async () => {
    const input: BiimScript = {
      speakers: {
        a: {
          name: 'A',
          image: '../assets/yukkuri/dango',
          voice: { engine: 'sine' },
        },
      },
      lines: [{ speaker: 'a', text: 'a' }],
    };
    const original = structuredClone(input);
    await validateScript(input, path.resolve('samples'));
    expect(input).toEqual(original);
    const timeline = resolveTimeline(input, [1], false);
    expect([
      timeline.width,
      timeline.height,
      timeline.fps,
      timeline.duration,
    ]).toEqual([1920, 1080, 30, 1.3]);
    expect(performanceOptions({}, {})).toEqual({
      mouthMode: 'flap',
      flapInterval: 0.12,
      mouthThreshold: 0.08,
      motion: 'subtle',
    });
    expect(performanceOptions({}, { flapInterval: 0.2 }).flapInterval).toBe(
      0.2,
    );
  });
  it('keeps the authoring guide error examples equal to actual validator output', async () => {
    const base: BiimScript = {
      speakers: {
        a: {
          name: 'A',
          image: '../assets/yukkuri/dango',
          voice: { engine: 'sine' },
        },
      },
      lines: [{ id: 'intro', speaker: 'a', text: 'a' }],
    };
    const cases: [string, (script: BiimScript) => void][] = [
      [
        'lines[1].speaker: unknown speaker missing',
        (s) => s.lines.push({ speaker: 'missing', text: 'b' }),
      ],
      [
        'lines[1].id: duplicate ID intro',
        (s) => s.lines.push({ id: 'intro', speaker: 'a', text: 'b' }),
      ],
      [
        'main[0].at: unknown line anchor @missing',
        (s) => {
          s.main = [{ at: '@missing', color: '#000000' }];
        },
      ],
      [
        'lines[0].at: cyclic line timing dependency',
        (s) => {
          s.lines[0].at = '@later';
          s.lines.push({ id: 'later', speaker: 'a', text: 'b' });
        },
      ],
      [
        "lines[0].duration: must have required property 'duration'",
        (s) => {
          s.lines[0].spoken = false;
        },
      ],
      [
        'main[0]: must match exactly one schema in oneOf',
        (s) => {
          s.main = [{ at: 0, video: '../work/demo.mp4', color: '#000000' }];
        },
      ],
      [
        'main[0].image: file does not exist or is not readable (missing.png)',
        (s) => {
          s.main = [{ at: 0, image: 'missing.png' }];
        },
      ],
      [
        'lines[1].at: must be >= previous line end (at least 2s)',
        (s) => {
          s.lines[0].spoken = false;
          s.lines[0].duration = 2;
          s.lines.push({ at: 1, speaker: 'a', text: 'b' });
        },
      ],
      [
        'main[1].at: overlaps previous main slot',
        (s) => {
          s.main = [
            { at: 0, until: 2, color: '#000000' },
            { at: 1, color: '#ffffff' },
          ];
        },
      ],
      [
        'counter: cannot share bottom with panels',
        (s) => {
          s.counter = { label: 'count', events: [{ at: 0, value: 1 }] };
          s.panels = [{ at: 0, box: 'bottom', text: 'b' }];
        },
      ],
      [
        'timer.position: right-bottom cannot share bottom with panels/counter',
        (s) => {
          s.timer = { start: 0, position: 'right-bottom' };
          s.panels = [{ at: 0, box: 'bottom', text: 'b' }];
        },
      ],
    ];
    for (const [message, mutate] of cases) {
      const script = structuredClone(base);
      mutate(script);
      await expect(
        validateScript(script, path.resolve('samples')),
      ).rejects.toThrow(message);
      for (const file of [
        'docs/authoring-guide.md',
        'docs/authoring-guide.ja.md',
      ])
        expect(await readFile(file, 'utf8')).toContain(message);
    }
  });
  it('exposes the existing sine amplitude option and respects its default', async () => {
    const script: BiimScript = JSON.parse(
      await readFile('samples/biim-hello-sine.json', 'utf8'),
    );
    script.speakers.dango.voice.options = { amplitude: 0 };
    await expect(
      validateScript(script, path.resolve('samples')),
    ).resolves.toBeDefined();
    script.speakers.dango.voice.options.amplitude = 1.1;
    await expect(
      validateScript(script, path.resolve('samples')),
    ).rejects.toThrow('amplitude');
    const dir = await mkdtemp(path.join(os.tmpdir(), 'biim-tone-'));
    try {
      const result = await synthesize('a', {}, dir);
      const decoded = await decodeWav(result.wavPath);
      expect(decoded.duration).toBe(0.5);
      expect(
        decoded.samples.reduce(
          (peak, value) => Math.max(peak, Math.abs(value)),
          0,
        ),
      ).toBeCloseTo(0.22, 3);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('decodes the documented PNG and JPEG still formats', async () => {
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#14283d';
    ctx.fillRect(0, 0, 32, 32);
    for (const buffer of [
      canvas.toBuffer('image/png'),
      canvas.toBuffer('image/jpeg'),
    ]) {
      const decoded = await loadImage(buffer);
      expect([decoded.width, decoded.height]).toEqual([32, 32]);
    }
  });
});
