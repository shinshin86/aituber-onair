# @aituber-onair/noise

![@aituber-onair/noise logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/noise/images/aituber-onair-noise.png)

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
  streamContext: {
    currentSituation: '配信の締めがきれいにまとまりすぎている',
  },
  seed: 'ending-1',
  constraints: {
    preserveCodeBlocks: true,
    preserveUrls: true,
    preserveNumbers: true,
    maxAddedChars: 120,
  },
});

console.log(result.text);
console.log(result.diagnosis);
console.log(result.plan);
console.log(result.applied);
console.log(result.quality);
```

## 必要なときだけ通す

Noise は、すべてのLLM返答に必ず通す必要はありません。実運用では、先に
返答の無難さを診断し、スコアが一定以上のときだけ書き換える使い方ができます。

```ts
import {
  createContextFingerprint,
  createContaminator,
  diagnosePredictability,
} from '@aituber-onair/noise';

const context = createContextFingerprint({
  systemPrompt,
  messages,
  streamContext,
});
const diagnosis = diagnosePredictability({
  draft: llmReply,
  context,
});
const shouldUseNoise = diagnosis.score >= 0.45;

const finalReply = shouldUseNoise
  ? (
      await contaminator.contaminate({
        systemPrompt,
        messages,
        draft: llmReply,
        streamContext,
      })
    ).text
  : llmReply;
```

この形にすると、Noise は常時フィルターではなく、生成後の返答が無難な着地に
寄ったときだけ使う後段エフェクトとして扱えます。きれいすぎる締め、繰り返し
表現、無理なポジティブ化、配信の空気が平坦になりそうな場面では通し、正確な
告知、システム通知、慎重に扱うべき話題では通さない、という使い分けができます。

## ブラウザサンプル

LLMによる書き換えと、繰り返し表現を記録する機能を試せる
ブラウザサンプルを含めています。

```sh
npm -w @aituber-onair/noise run example:noise-sample
```

## 書き換えモード

`mode` で、返答の着地をどこまで動かすかを選べます。

- `subtle`: 明らかに整いすぎた部分だけを控えめに直します。
- `performer`: キャラクターを保ちながら、配信中の言葉に寄せます。
- `bold`: 配信者としての判断や、その場の緊張を強めに出します。
- `inversion`: 事実は保ったまま、無難な感情の着地を反転させます。
- `chaotic`: 自己修正や言い切らない余白を使い、最も強く崩します。

## 方針

Noise は、LLM が返答を生成したあとに動きます。会話の流れや繰り返しを
生成前に見る `@aituber-onair/manneri` とは独立したパッケージです。
Manneri が会話の流れを見るなら、Noise は返答の着地を見ます。

- `createContextFingerprint()` でキャラクター、直近コメント、任意の
  `streamContext` を読みます。
- `diagnosePredictability()` で、返答がなぜ無難に見えるのかを分類します。
- `buildInterventionPlan()` と `buildFrictionParameters()` で、直近コメントに
  接続する、謝りすぎを弱める、配信者として判断するなどの介入方針を
  構造化します。
- `generateRewriteCandidates()` で、構造化されたパラメーターをLLMに渡し、
  複数候補を生成します。
- `evaluateRewriteCandidates()` で、無難さ、文脈接続、具体性、キャラクター維持、
  意味の維持、攻撃性、文脈にない情報の追加を評価します。
- `selectBestCandidate()` で安全な最良候補を選びます。

Noise は Manneri を import しません。外部で分かっている配信状況がある場合は、
パッケージ固有の連携ではなく、通常の `streamContext` として渡します。

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
