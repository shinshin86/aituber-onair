import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAutoscript } from '../src/autoscript/cli.js';
import {
  loadProfile,
  parseCommentary,
  parsePanels,
  parseProfile,
  parseScene,
} from '../src/autoscript/contracts.js';
import { dungeonFixture } from '../src/autoscript/demo-cache.js';
import { Director, overlapScore } from '../src/autoscript/director.js';
import {
  difference,
  sampleVideo,
  selectFrames,
} from '../src/autoscript/frames.js';
import {
  cachedTransport,
  openAITransport,
  requestHash,
  type Request,
  type Transport,
} from '../src/autoscript/llm.js';
import { generateScript } from '../src/autoscript/pipeline.js';
import { loadScript } from '../src/schema.js';
import { synthesizeTimeline } from '../src/synthesis.js';
import { resolveTimeline } from '../src/timeline.js';

const profile = await loadProfile('profiles/game.json');
const mockChat = vi.hoisted(() => ({
  chatOnce: vi.fn(),
  visionChatOnce: vi.fn(),
  dispose: vi.fn(),
  create: vi.fn(),
  visionLevel: vi.fn(),
}));
vi.mock('@aituber-onair/core', () => ({
  ChatServiceFactory: {
    createChatService: mockChat.create,
    getVisionSupportLevelForModel: mockChat.visionLevel,
  },
}));
const scene = parseScene(
  {
    sceneChanged: false,
    context: { phase: '探索', location: '入口', goal: '進む' },
    facts: [{ text: '鍵は奥にある', source: 'screen', confidence: 0.9 }],
    events: [],
    metrics: { retry: 0 },
  },
  '',
);
const request: Request = {
  version: 1,
  role: 'panels',
  model: 'gpt-4.1-mini',
  prompt: 'JSON',
  input: { at: 0 },
};
const temps: string[] = [];
async function temporary() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'biim-auto-test-'));
  temps.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(
    temps.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
  vi.restoreAllMocks();
});

describe('sampling', () => {
  it('combines interval and changed frames and caps across the full recording', () => {
    const deltas = [0, 0.5, 0.01, 0.6, 0, 0, 0];
    expect(
      selectFrames(deltas, 2, 0.2, 20).map((s) => [s.at, s.reasons]),
    ).toEqual([
      [0, ['interval']],
      [1, ['scene-change']],
      [2, ['interval']],
      [3, ['scene-change']],
      [4, ['interval']],
      [6, ['interval']],
    ]);
    expect(selectFrames(deltas, 2, 0.2, 3).map((s) => s.at)).toEqual([0, 3, 6]);
    expect(difference(new Uint8Array([0, 255]), new Uint8Array([255, 0]))).toBe(
      1,
    );
    expect(() => selectFrames(deltas, 0, 0.2, 3)).toThrow();
  });
});
describe('defensive contracts', () => {
  it('removes unsupported memo/low-confidence facts and invalid metrics', () => {
    const result = parseScene(
      {
        ...scene,
        facts: [
          {
            text: 'invented',
            source: 'memo',
            confidence: 1,
            evidence: 'missing',
          },
          { text: 'low', source: 'screen', confidence: 0.4 },
          { text: 'known', source: 'memo', confidence: 1, evidence: 'known' },
        ],
        metrics: { retry: 2, broken: '3', infinite: Number.POSITIVE_INFINITY },
      },
      'known',
    );
    expect(result.facts).toHaveLength(1);
    expect(result.metrics).toEqual({ retry: 2 });
    expect(() => parseScene({ ...scene, sceneChanged: 'yes' }, '')).toThrow();
    expect(() =>
      parseScene(
        { ...scene, events: [{ kind: 'x', text: 'x', importance: 8 }] },
        '',
      ),
    ).toThrow();
  });
  it('loads both profiles and rejects overflow, bad citations and broken profiles', async () => {
    expect((await loadProfile('profiles/generic.json')).scoreboard.metric).toBe(
      'progress',
    );
    expect(() =>
      parseProfile({ ...profile, map: { ...profile.map, maxChars: 100 } }),
    ).toThrow();
    expect(() =>
      parsePanels({ top: '長'.repeat(17) }, profile, scene),
    ).toThrow();
    expect(() =>
      parsePanels({ main: [{ text: '不明', fact: 5 }] }, profile, scene),
    ).toThrow();
    expect(() => parseCommentary({ text: '長'.repeat(51) }, profile)).toThrow();
    expect(parseCommentary({ text: null }, profile)).toEqual({ text: null });
  });
});
describe('director', () => {
  it('keeps top for 30 seconds and main for 8 seconds', () => {
    const d = new Director(profile, 75);
    d.edit(0, { top: '入口', main: [{ text: '鍵を探す', fact: 0 }] });
    d.edit(7, { top: '奥', main: [{ text: '罠に注意', fact: 0 }] });
    d.edit(8, { top: '奥', main: [{ text: '罠に注意', fact: 0 }] });
    d.edit(30, { top: '奥' });
    expect(d.panels.map((p) => [p.at, p.box])).toEqual([
      [0, 'top'],
      [0, 'main'],
      [8, 'main'],
      [30, 'top'],
    ]);
    expect(
      d.decisions.filter((d) => !d.accepted).map((d) => d.reason),
    ).toContain('minimum-display-30s');
  });
  it('triggers for importance, silence and scene changes, and schedules sequentially', () => {
    const d = new Director(profile, 75);
    expect(d.trigger(0, scene)).toBe(true);
    d.commentary(0, '行こう！', scene, 'dango');
    expect(d.trigger(1, scene)).toBe(false);
    expect(d.trigger(10, scene)).toBe(true);
    expect(d.trigger(1, { ...scene, sceneChanged: true })).toBe(true);
    expect(
      d.trigger(1, {
        ...scene,
        events: [{ kind: 'failure', text: 'あっ', importance: 3 }],
      }),
    ).toBe(true);
    d.commentary(1, '危ない！', { ...scene, sceneChanged: true }, 'dango');
    expect(d.lines[1].at).toMatch(/^@auto-1:end\+/);
    expect(() =>
      resolveTimeline({ speakers: {}, lines: d.lines }, [2, 3], false),
    ).not.toThrow();
  });
  it('drops queued stale lines, repeated panel facts and number reading', () => {
    const d = new Director(profile, 100, {
      silence: 0,
      stale: 1,
      overlap: 0.35,
    });
    d.commentary(0, '驚いた！'.repeat(10), scene, 'dango');
    d.commentary(1, 'あっ！', scene, 'dango');
    expect(d.decisions.at(-1)?.reason).toBe('stale');
    const fresh = new Director(profile, 75);
    fresh.edit(0, { main: [{ text: '鍵は奥にある', fact: 0 }] });
    expect(fresh.commentary(0, '鍵は奥にあるね', scene, 'dango')).toBe('retry');
    expect(fresh.lines).toHaveLength(0);
    fresh.commentary(0, 'リトライは3回です', scene, 'dango');
    expect(fresh.decisions.at(-1)?.reason).toBe('number-reading');
    fresh.commentary(0, '一緒に行こう！', scene, 'dango');
    expect(fresh.decisions.at(-1)?.accepted).toBe(true);
    expect(overlapScore('鍵は奥にあるね', '鍵は奥にある')).toBe(1);
  });
  it('uses only configured metrics and leaves absent counters hidden', () => {
    const d = new Director(profile, 75);
    expect(d.counterValue(scene)).toBe(0);
    expect(
      d.counterValue({ ...scene, metrics: { progress: 4 } }),
    ).toBeUndefined();
    d.commentary(74, '間に合わないかも！', scene, 'dango');
    expect(d.decisions.at(-1)?.reason).toBe('past-video-end');
  });
});
describe('cache and output isolation', () => {
  it('hashes full semantic requests, records hits and fails closed on misses', async () => {
    const dir = await temporary();
    const live = vi.fn(async () => '{"text":null}');
    await cachedTransport({ record: dir }, live)(request);
    const network = vi.fn(async () => {
      throw new Error('must not call');
    });
    await expect(
      cachedTransport({ replay: dir }, network)(request),
    ).resolves.toBe('{"text":null}');
    await expect(
      cachedTransport(
        { replay: dir },
        network,
      )({ ...request, image: 'different' }),
    ).rejects.toThrow('No network request');
    expect(network).not.toHaveBeenCalled();
    expect(requestHash(request)).toBe(
      requestHash({ ...request, input: { at: 0 } }),
    );
    expect(requestHash(request)).not.toBe(
      requestHash({ ...request, model: 'other' }),
    );
  });
  it('never stores a key in cache, debug or scripts and retries long panels', async () => {
    const dir = await temporary();
    const key = 'test-private-credential';
    let calls = 0;
    const fake: Transport = async (r) => {
      if (r.role === 'observer')
        return JSON.stringify({
          ...scene,
          facts: [{ text: key, source: 'screen', confidence: 1 }],
        });
      if (r.role === 'panels')
        return JSON.stringify(
          calls++
            ? { top: '探索', main: [{ text: '補足', fact: 0 }] }
            : { top: '長'.repeat(40) },
        );
      return JSON.stringify({ text: key });
    };
    const output = path.join(dir, 'auto.json');
    const result = await generateScript({
      input: path.resolve('work/demo.mp4'),
      output,
      duration: 15,
      frames: [{ at: 0, difference: 0, reasons: ['interval'], image: 'fake' }],
      profile,
      memo: '',
      secrets: [key],
      transport: cachedTransport(
        { record: path.join(dir, 'cache'), secrets: [key] },
        fake,
      ),
    });
    expect(result.debug.rejected).toHaveLength(1);
    for (const file of [
      output,
      result.sidecar,
      ...(await readdir(path.join(dir, 'cache'))).map((f) =>
        path.join(dir, 'cache', f),
      ),
    ])
      expect(await readFile(file, 'utf8')).not.toContain(key);
  });
  it('regenerates commentary once on overlap and then drops it', async () => {
    const dir = await temporary();
    const responses: string[] = [];
    const fake: Transport = async (r) => {
      if (r.role === 'observer') return JSON.stringify(scene);
      if (r.role === 'panels')
        return JSON.stringify({ main: [{ text: '鍵は奥にある', fact: 0 }] });
      responses.push(r.prompt);
      return JSON.stringify({ text: '鍵は奥にあるね' });
    };
    const result = await generateScript({
      input: path.resolve('work/demo.mp4'),
      output: path.join(dir, 'auto.json'),
      duration: 15,
      frames: [{ at: 0, difference: 0, reasons: ['interval'], image: 'fake' }],
      profile,
      memo: '',
      transport: fake,
    });
    expect(responses).toHaveLength(2);
    expect(result.script.lines).toHaveLength(0);
    const audio = await synthesizeTimeline(
      result.script,
      dir,
      path.join(dir, 'audio'),
    );
    expect(audio.timeline.duration).toBe(15);
    expect(audio.narration.samples.every((value) => value === 0)).toBe(true);
    expect(
      result.debug.decisions.filter((d) => d.reason === 'panel-overlap'),
    ).toHaveLength(2);
  });
  it('enforces the observer budget across retries without an extra call', async () => {
    const dir = await temporary();
    const transport = vi.fn(async () => '{}');
    await expect(
      generateScript({
        input: 'work/demo.mp4',
        output: path.join(dir, 'auto.json'),
        duration: 4,
        frames: [
          { at: 0, difference: 0, reasons: ['interval'], image: 'fake' },
        ],
        profile,
        memo: '',
        transport,
        maxVisionCalls: 1,
      }),
    ).rejects.toThrow('Vision call budget exhausted');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('passes separate role models and image messages through Core with no SDK', async () => {
    mockChat.visionLevel.mockReturnValue('supported');
    mockChat.create.mockReturnValue(mockChat);
    mockChat.visionChatOnce.mockResolvedValue({
      blocks: [{ type: 'text', text: '{"context":{}}' }],
    });
    mockChat.chatOnce.mockResolvedValue({
      blocks: [{ type: 'text', text: '{"text":null}' }],
    });
    const transport = openAITransport('fake-test-key');
    await transport({
      ...request,
      role: 'observer',
      model: 'gpt-4.1-mini',
      image: 'image-bytes',
    });
    expect(mockChat.create).toHaveBeenLastCalledWith(
      'openai',
      expect.objectContaining({
        model: 'gpt-4.1-mini',
        visionModel: 'gpt-4.1-mini',
        responseFormat: { type: 'json_object' },
      }),
    );
    expect(
      mockChat.visionChatOnce.mock.calls[0][0][1].content[1].image_url.url,
    ).toBe('data:image/png;base64,image-bytes');
    await expect(transport({ ...request, model: 'gpt-4.1' })).resolves.toBe(
      '{"text":null}',
    );
    expect(mockChat.create).toHaveBeenLastCalledWith(
      'openai',
      expect.objectContaining({ model: 'gpt-4.1' }),
    );
    mockChat.chatOnce.mockRejectedValue(new Error('fake-test-key'));
    await expect(transport(request)).rejects.toThrow(
      'OpenAI panels request failed',
    );
    expect(mockChat.dispose).toHaveBeenCalledTimes(3);
  });
  it('runs autoscript replay through real ffmpeg and validate without a key', async () => {
    const dir = await temporary();
    const cache = path.join(dir, 'cache');
    const sampled = await sampleVideo(
      'work/demo.mp4',
      path.join(dir, 'frames'),
      { interval: 2, threshold: 0.12, cap: 48 },
    );
    const memo = await readFile('samples/dungeon-memo.md', 'utf8');
    await generateScript({
      ...sampled,
      input: path.resolve('work/demo.mp4'),
      output: path.join(dir, 'recorded.json'),
      profile,
      memo,
      transport: cachedTransport({ record: cache }, dungeonFixture),
    });
    const envfile = path.join(dir, '.env');
    await writeFile(envfile, 'BIIM_OBSERVER_MODEL=gpt-4.1-mini\n');
    const result = await runAutoscript(
      [
        'work/demo.mp4',
        '--profile',
        'game',
        '--memo',
        'samples/dungeon-memo.md',
        '--out',
        path.join(dir, 'replayed.json'),
        '--replay',
        cache,
        '--env-file',
        envfile,
      ],
      {},
    );
    expect((await loadScript(path.join(dir, 'replayed.json'))).script).toEqual(
      result.script,
    );
    expect(result.script.counter?.events).toEqual([{ at: 0, value: 0 }]);
  }, 30000);
});
