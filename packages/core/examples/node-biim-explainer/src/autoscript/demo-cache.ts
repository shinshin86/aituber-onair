import { mkdtemp, readFile, readdir, rename, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProfile } from './contracts.js';
import { sampleVideo } from './frames.js';
import { cachedTransport, requestHash, type Transport } from './llm.js';
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
    '鍵は奥の部屋',
    '宝箱は使わない',
    '点滅後に通る',
    '遠回りで敵回避',
    '攻撃後に隙あり',
  ];
  const secondaryQuotes = [
    '鍵のある部屋へ直行すれば寄り道を減らせる。',
    '宝箱を開ける操作は省略できる。',
    '罠が光っている間は手前で待つ。',
    '罠が光っている間は手前で待つ。',
    '予告の帯から横へ外れて攻撃をかわす。',
  ];
  const secondaryFacts = [
    '寄り道を減らす',
    '開封操作を省く',
    '光る間は待つ',
    '手前で点滅を待つ',
    '予告の外へ移動',
  ];
  const screen =
    at >= 70
      ? 'ボスが消え出口が開く'
      : at >= 64
        ? '主人公が回復中のボスへ斬りかかる'
        : at >= 61
          ? '予告の帯を避け主人公が横へ動く'
          : at >= 58
            ? '主人公とボスが向き合う'
            : at >= 50
              ? '主人公が外周の道を進む'
              : at >= 46
                ? '点滅が終わり主人公が罠を通る'
                : at >= 42
                  ? '主人公が罠の手前で待つ'
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
    0: 'さあ、出発！知らない場所を歩く時の、\nこのわくわくする感じが好きなんだよね。',
    6: 'この先が気になるなあ。焦らず見ていこう！',
    12: 'あれ、そっちへ行くんだ！つい寄り道したくなるのに。',
    18: 'おっ、見えてきた！そのまま近づいて大丈夫かな？',
    24: 'よし、いい感じ！この調子で先へ進みたいね。',
    28: 'なんだか嫌な予感…。大丈夫かな？',
    32: 'あー！今のは悔しい！でも、まだ諦めたくないよね。',
    38: '今度こそ、落ち着いていこう。応援してるよ！',
    42: 'ここ、さっきより慎重だね。見ていると息を止めちゃう！',
    48: 'おっ、動き出した！このまま無事に抜けられるといいな。',
    54: 'ここまで来たら、もう引き返したくないね！',
    58: 'ついに来たか…。最後まで目が離せないね、がんばって！',
    64: 'おっと、危なかった！今の動き、見ててひやっとしたよ。',
    70: 'やった、お見事！最後まで見守れてよかったね！',
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
        {
          text: secondaryFacts[index],
          source: 'memo',
          evidence: secondaryQuotes[index],
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
          importance: [0, 12, 28, 32, 42, 58, 64, 70].includes(at)
            ? 3
            : moments[at]
              ? 2
              : 1,
        },
      ],
      metrics: {
        retry: at >= 32 ? 1 : 0,
        ...(at >= 12 ? { keys: at >= 20 ? 1 : 0 } : {}),
        ...(at >= 70 ? { clear: 1 } : {}),
      },
    });
  }
  if (request.role === 'panels')
    return JSON.stringify({
      top: `第1層 ${locations[index]}\n目標：${at < 20 ? '鍵を探す' : at < 58 ? '出口へ進む' : '出口を開く'}`,
      main: [
        { text: facts[index], fact: 0 },
        { text: secondaryFacts[index], fact: 1 },
      ],
    });
  return JSON.stringify({
    text: moments[at] ?? null,
    ...(moments[at]
      ? {
          shortText: {
            0: 'さあ、出発！',
            6: '先が気になるね。',
            12: 'そっちへ行くんだ！',
            18: '大丈夫かな？',
            24: 'いい感じ、その調子！',
            28: '大丈夫かな…？',
            32: 'ああ、悔しい！',
            38: '今度こそうまくいって！',
            42: '息を止めちゃう！',
            48: '無事に抜けたいね！',
            54: 'ここまで来たね！',
            58: '応援してるよ！',
            64: 'おっと、危なかった！',
            70: 'やった、お見事！',
          }[at],
        }
      : {}),
  });
};

export async function makeDemoCache() {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'biim-fixture-'));
  try {
    const hashes = new Set<string>();
    const record = cachedTransport(
      { record: 'fixtures/dungeon-replay' },
      dungeonFixture,
    );
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
      transport: async (request) => {
        hashes.add(requestHash(request));
        return record(request);
      },
    });
    await rename(result.sidecar, 'work/dungeon-fixture.debug.json');
    // This directory is exclusively the generated hand-made demo fixture.
    // Leave README/other files intact, and remove obsolete request variants.
    for (const file of await readdir('fixtures/dungeon-replay'))
      if (/^[a-f0-9]{64}\.json$/.test(file) && !hashes.has(file.slice(0, -5)))
        await rm(path.join('fixtures/dungeon-replay', file));
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
