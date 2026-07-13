import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  InMemoryNoiseMemoryStore,
  createContaminator,
  detectNoiseRuntime,
} from '../src';
import { JsonFileNoiseMemoryStore } from '../src/node';
import { LocalStorageNoiseMemoryStore } from '../src/web';

describe('noise memory stores', () => {
  it('updates in-memory noise memory after contamination', async () => {
    const store = new InMemoryNoiseMemoryStore();
    const contaminator = createContaminator({
      intensity: 0.7,
      model: {
        async generate() {
          return '今日は来てくれてありがとう。次回の前に少しだけ余白を残すね。';
        },
      },
      memory: {
        scopeId: 'stream-a',
        store,
      },
    });

    await contaminator.contaminate({
      systemPrompt: 'AITuber',
      messages: [{ role: 'user', content: '今日もありがとう！' }],
      draft: '今日は来てくれてありがとう。次回も楽しみにしていてね。',
    });

    const memory = await store.load('stream-a');

    expect(memory?.recentClosings.length).toBe(1);
    expect(memory?.usedStains.length).toBeGreaterThan(0);
    expect(memory?.repeatedPhrases.map((item) => item.phrase)).toContain(
      'ありがとう'
    );
  });

  it('persists memory in localStorage', async () => {
    const store = new LocalStorageNoiseMemoryStore({
      keyPrefix: 'noise-test',
    });

    await store.save('scope', {
      version: 1,
      recentClosings: ['また来てね。'],
      repeatedPhrases: [],
      usedStains: [],
      topicLoops: [],
      updatedAt: 1,
    });

    const loaded = await store.load('scope');

    expect(loaded?.recentClosings).toEqual(['また来てね。']);
  });

  it('persists memory in a Node.js JSON file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aituber-noise-'));
    const filePath = join(dir, 'memory.json');
    const store = new JsonFileNoiseMemoryStore({ filePath });

    await store.save('scope', {
      version: 1,
      recentClosings: ['See you next time.'],
      repeatedPhrases: [],
      usedStains: [],
      topicLoops: [],
      updatedAt: 1,
    });

    const loaded = await store.load('scope');
    const raw = await readFile(filePath, 'utf8');

    expect(loaded?.recentClosings).toEqual(['See you next time.']);
    expect(raw).toContain('See you next time.');
  });
});

describe('detectNoiseRuntime', () => {
  it('detects the current test runtime', () => {
    expect(detectNoiseRuntime()).toBe('browser');
  });
});
