# @aituber-onair/noise

![@aituber-onair/noise logo](./images/aituber-onair-noise.png)

AITuber OnAir Noise は、AIの返答が無難すぎるときに検出し、意味や
キャラクターを保ったまま、配信で使いやすい言葉に書き換えるための
LLM書き換えエンジンです。

AIの返答を、予定調和で終わらせない。

## 使い方

```ts
import { createContaminator } from '@aituber-onair/noise';

const contaminator = createContaminator({
  intensity: 0.42,
  mode: 'performer',
  chat: {
    provider: 'openai',
    options: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini',
    },
  },
});

const result = await contaminator.contaminate({
  systemPrompt: '少し気まぐれなAITuberです。',
  messages: [{ role: 'user', content: '今日も楽しかった！！' }],
  draft:
    '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。',
  seed: 'ending-1',
  constraints: {
    preserveCodeBlocks: true,
    preserveUrls: true,
    preserveNumbers: true,
    maxAddedChars: 120,
  },
});

console.log(result.text);
console.log(result.applied);
console.log(result.quality);
```

## ブラウザサンプル

LLMによる書き換えと、繰り返し表現を記録する機能を試せる
ブラウザサンプルを含めています。

```sh
npm -w @aituber-onair/noise run example:noise-sample
```

## 方針

- 返答の無難さをルールベースで計算します。
- `intensity`、`mode`、会話文脈、記録から書き換え指示を決めます。
- `@aituber-onair/chat` を内部で使い、OpenAI、OpenAI-compatible、
  Gemini、Claude、OpenRouter、xAI、Kimi、DeepSeek、Mistral、
  Gemini Nano などのAIサービスを利用できます。
- コードブロック、URL、数値はデフォルトで保護します。
- `evaluateNoiseQuality()` で、無難さが下がったか、キャラクターが
  変わりすぎていないか、文脈にない情報を足していないかを検査します。

```ts
const contaminator = createContaminator({
  chat: {
    provider: 'claude',
    options: {
      apiKey: process.env.CLAUDE_API_KEY!,
      model: 'claude-3-5-haiku-latest',
    },
  },
});
```

`chat`、`llm`、`model` のいずれも指定されていない場合、`contaminate()`
はエラーを返します。キャラクターの性格を固定文で壊しやすいため、
ローカルのルールベース書き換えフォールバックは廃止しています。

## 品質レポート

`contaminate()` は毎回 `quality` を返します。

```ts
if (!result.quality.passed) {
  console.warn(result.quality.issues);
}
```

このレポートは、まだ無難な言い回しが残っている返答、キャラクターを変えすぎた
返答、言い方を変えすぎた返答、文脈にない情報を足した返答を検出します。

## 繰り返し表現の記録

Noise は、よく繰り返される締め方や表現を小さな記録として保存できます。
デフォルトでは会話全文ではなく、よく使う締め方、繰り返し表現、直近で
使った書き換え指示、話題ごとのループを記録します。

共通のインメモリストア:

```ts
import {
  InMemoryNoiseMemoryStore,
  createContaminator,
} from '@aituber-onair/noise';

const store = new InMemoryNoiseMemoryStore();

const contaminator = createContaminator({
  memory: {
    scopeId: 'stream-session',
    store,
  },
});
```

Web ブラウザ向け:

```ts
import { LocalStorageNoiseMemoryStore } from '@aituber-onair/noise/web';

const store = new LocalStorageNoiseMemoryStore();
```

Node.js 向け:

```ts
import { JsonFileNoiseMemoryStore } from '@aituber-onair/noise/node';

const store = new JsonFileNoiseMemoryStore({
  filePath: './noise-memory.json',
});
```

`detectNoiseRuntime()` で `browser`、`node`、`unknown` は判定できます。ただし
本番では `@aituber-onair/noise/web` または `@aituber-onair/noise/node` を
明示的に import する方が安全です。ブラウザ bundle に Node.js モジュールが
混ざるのを避けられます。
