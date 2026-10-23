import { mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProfile } from './contracts.js';
import { sampleVideo } from './frames.js';
import { cachedTransport, type Transport } from './llm.js';
import { generateScript } from './pipeline.js';

// Deliberately hand-authored fiction, not model output or a vision benchmark.
// Re-running records exact request hashes for the locally encoded demo frames.
export const dungeonFixture: Transport = async (request) => {
  const at = request.input.at as number;
  const index = at < 12 ? 0 : at < 28 ? 1 : at < 42 ? 2 : at < 58 ? 3 : 4;
  const locations = ['入口', '宝物庫', '罠の通路', '分かれ道', 'ボス部屋'];
  const quotes = [
    '鍵は奥の部屋にある。',
    '宝箱は無視する。中身は今回の攻略では使わない。',
    '罠は点滅の直後に通る。',
    '遠回りだが敵を避けられる。',
    'ボスは攻撃の後に隙ができる。',
  ];
  const facts = [
    '鍵は奥の部屋にある',
    '宝箱の中身は使わない',
    '罠は点滅の直後に通る',
    '遠回りで敵を避ける',
    '攻撃の後に隙ができる',
  ];
  const screen =
    at >= 70
      ? 'ボスが消え出口が開く'
      : at >= 64
        ? '主人公がボスの攻撃を避ける'
        : at >= 58
          ? 'ボスが槍を振る'
          : at >= 50
            ? '主人公が外周の道を進む'
            : at >= 42
              ? '罠が点滅した後で主人公が進む'
              : at >= 34
                ? '主人公が入口側で再出発する'
                : at >= 32
                  ? '罠に触れ主人公が消える'
                  : at >= 28
                    ? '床に尖った罠が見える'
                    : at >= 20
                      ? '主人公が鍵に触れ鍵が消える'
                      : at >= 12
                        ? '主人公が宝箱の前を通り過ぎる'
                        : '主人公が入口から歩く';
  const moments: Record<number, string> = {
    0: 'さあ、出発！',
    12: 'あれ、寄り道しないんだ！',
    20: '迷いがないね！',
    28: 'なんだか嫌な予感がする…',
    32: 'あー！今のは悔しい！',
    42: '今度こそうまくいきそう！',
    50: 'こっちなら安心できそう！',
    58: 'ここまで来たら応援するしかない！',
    64: 'おっと、危なかった！',
    70: 'やった！お見事！',
  };
  if (request.role === 'observer') {
    const previous = request.input.previous as {
      context?: { location?: string };
    } | null;
    return JSON.stringify({
      sceneChanged: previous?.context?.location !== locations[index],
      context: {
        phase: '第1層',
        location: locations[index],
        goal: at < 20 ? '鍵を探す' : at < 58 ? '罠を越える' : '出口を開く',
      },
      facts: [
        {
          text: facts[index],
          source: 'memo',
          evidence: quotes[index],
          confidence: 1,
        },
        { text: screen, source: 'screen', confidence: 0.9 },
      ],
      events: [
        {
          kind:
            at === 32
              ? 'failure'
              : at === 70
                ? 'clear'
                : moments[at]
                  ? 'progress'
                  : 'idle',
          text: screen,
          importance: moments[at] ? 3 : 1,
        },
      ],
      metrics: { retry: at >= 32 ? 1 : 0 },
    });
  }
  if (request.role === 'panels')
    return JSON.stringify({
      top: at < 30 ? '第1層 探索' : at < 60 ? '第1層 突破' : '第1層 決戦',
      main: [{ text: facts[index], fact: 0 }],
    });
  return JSON.stringify({ text: moments[at] ?? null });
};

export async function makeDemoCache() {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'biim-fixture-'));
  try {
    const sampled = await sampleVideo('work/dungeon-demo.mp4', temporary, {
      interval: 2,
      threshold: 0.12,
      cap: 48,
    });
    const result = await generateScript({
      ...sampled,
      input: 'work/dungeon-demo.mp4',
      output: 'samples/biim-auto-dungeon.json',
      profile: await loadProfile('profiles/game.json'),
      memo: await readFile('samples/dungeon-memo.md', 'utf8'),
      transport: cachedTransport(
        { record: 'fixtures/dungeon-replay' },
        dungeonFixture,
      ),
    });
    await rename(result.sidecar, 'work/dungeon-fixture.debug.json');
    console.log(
      'Recorded hand-made dungeon fixture and regenerated samples/biim-auto-dungeon.json. No API calls.',
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  makeDemoCache().catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
