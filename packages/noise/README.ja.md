# @aituber-onair/noise

![@aituber-onair/noise logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/noise/images/aituber-onair-noise.png)

AITuber OnAir Noise は、AIの返答が無難すぎるときに検出し、意味や
キャラクターを保ったまま、配信で使いやすい言葉に書き換えるための
LLM書き換えエンジンです。

AIの返答を、予定調和で終わらせない。

Noise は単なる書き換えエンジンではなく、「逸脱の演出エンジン」です。
会話分析・即興演劇・ユーモア理論・実在のAI VTuber分析を横断した調査
(`docs/design-research.md`)は、ひとつの公式に収束しました。

> 快い「思い通りにならなさ」=(確立された型)×(逸脱と同時に伝わる
> 「これは遊びだ」の合図)×(安全な標的)×(関係性で稼いだ逸脱ライセンス)
> ×(型への回帰)。どれかひとつ欠けると、同じ出力が「魅力」から「故障」に
> 反転します。

そのため Noise は書き換えに加えて、逸脱して良いタイミングの管理(リズム
制御)、関係性に応じた逸脱量の管理(関係資本)、真剣な場面での全停止
(誠実度ゲート)、イジリの遊び認定(playマーカー)、共有の思い出の再利用
(ギャグ台帳)、視聴者の反応からの学習(反応ループ)を行います。

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

## 逸脱の演出(Deviation Orchestration)

### リズム制御:平場 → ティルト → 平場

逸脱は、普段どおりのターンの連なりがあって初めて「事件」として読まれます。
内蔵のリズムコントローラーは、ティルト(ノイズ適用)直後のターンを
クールダウンとしてスキップし、必要なら平場ターンの確保も強制できます。

```ts
const contaminator = createContaminator({
  rhythm: {
    minPlatformTurns: 2, // ティルト前に必要な素のターン数
    cooldownTurns: 2, // ティルト後に強制する素のターン数
    tiltThreshold: 0.45, // ティルトに必要な診断スコア
    forcedTiltAfter: 8, // 平坦が続いたら強制ティルト
  },
});
```

スキップされたターンは `result.skipped` に理由(`'cooldown'`、
`'platform'`、`'low_predictability'`、`'repair'`、`'sincerity'`)が
入り、テキストは下書きのまま返ります。`forceTilt: true` でバイパスできます。

### 関係資本(relationship capital)

常連を笑わせるイジリも、初見には不快です。`relationshipCapital`(0-1)を
ターンごとに渡すと、Noise は実効モードと介入語彙の両方を制限します。
kizuna のような絆システムの値を、ただの数値として渡せます。

- `stranger`(< 0.25): 言い回しレベルの編集のみ(`subtle` 相当)
- `acquaintance`(< 0.55): + 柔らかい反論、非優先形応答、短文化(`performer`)
- `regular`(< 0.8): + 着地反転、コールバック、ボケ、ステータスシーソー(`inversion`)
- `companion`(>= 0.8): + ツッコミ、あえての無反応(`chaotic`)

### 誠実度ゲート

直近のユーザー発言に真剣な相談・弱さの開示・重いライフイベントの気配が
あるときは、他のすべてに優先してノイズを全停止します。真剣な瞬間への
不応答は最悪の違反だからです。`sincerityGate: false` で無効化できます。

### playマーカー(遊びの合図)

Benign Violation Theory: 違反は「これは遊びだ」という合図と同時に
届かなければなりません。イジリ系の介入(`tsukkomi`、`withheld_uptake`、
`boke_bait`、`status_seesaw`、`contrarian_reframe`)には、同じ返答内に
笑い・誇張・自虐などのマーカーが必須です。欠けた候補は減点され、
`missing_play_marker` として報告されます。

### ギャグ台帳とコールバック

コールバック(過去の共有の瞬間の再登場)は、意外でありながら「覚えている」
証明にもなる、最も価値が高く最もリスクの低いサプライズです。

```ts
await contaminator.recordMoment({
  summary: '視聴者がプリンを冷蔵庫で爆発させた事件',
  source: 'user',
});
// 以降のターンで `callback` 介入として自然に再登場します。
```

ティルトがウケた場合は、その瞬間が自動でギャグ台帳に昇格します。

### 反応ループ

逸脱は毎回「賭け」なので、結果を返してください。

```ts
const reaction = await contaminator.reportReaction({ signal: 'laughter' });
// 'laughter' | 'positive' | 'neutral' | 'silence' | 'pushback' | 'discomfort'
```

ポジティブな反応は逸脱バジェットを広げ、直前のティルトをギャグ台帳に
昇格させます。ネガティブな反応はバジェットを縮め、ノイズを止める
リペアターンを差し込みます。`onNoiseEvent` でライフサイクルイベント
(`tilt_applied`、`noise_skipped`、`repair_advised`、`moment_recorded`、
`callback_used`)を購読でき、アプリ側の演出に使えます。AIのカオスは
単体では意味不明で、見える「リアクター」がいて初めてコメディになります。

### 立ち位置:なぜ「ウケた/スベった」という言葉を使うのか

Noise は、AIキャラクターに**ギャグをさせるためのライブラリではありません**。
目的は一貫して「LLMの返答が平均的で無難な着地に収束するのを崩すこと」です。
それでもコメディ寄りの語彙(「ウケた」という反応、ボケ/ツッコミ介入、
ネタ帳)が本体に入っているのは、次の3つの構造的な理由によります。

1. **逸脱は毎回「賭け」であり、その成否はテキストの中ではなく受け手の側に
   しか存在しないから。** 同じ期待外れが「魅力」になるか「故障」になるかは、
   期待違反理論が示す通り受け手の評価で決まります。受け取られ方を観測しない
   ノイズ注入は、出力が強すぎても弱すぎても気づけないオープンループ制御に
   なってしまう。`reportReaction()` はそのセンサーで、逸脱バジェットが
   フィードバックループです。APIのシグナル名自体は中立です
   (`laughter` / `positive` / `silence` / `pushback` / `discomfort`)。
2. **ユーモア研究を「目的」ではなく「計測と安全化の科学」として借りている
   から。** 規範からの逸脱が不快ではなく快として受け取られる条件を最も精密に
   研究してきた分野がユーモア理論(Benign Violation Theory、逸脱を遊びとして
   認定するボケ/ツッコミの文法)でした。Noise はこれを逸脱の安全管理に
   使っているだけで、会話分析を応答の形に使うのと同じ「借用」であり、
   出力をお笑いにするためではありません。
3. **配信という文脈では、「逸脱が受け入れられた」ことの最も観測しやすい
   代理指標が笑いだから。** 「視聴者が逸脱を好意的に評価した」は直接
   測れませんが、コメント欄の「草」や「w」は文字どおり数えられます。
   ブラウザサンプルの反応ボタンが「ウケた/スベった」という配信者の言葉に
   なっているのは、サンプルが自分の文脈に合わせて行った翻訳であって、
   ライブラリの目的の記述ではありません。同様に「ネタ帳」の本質は
   **共有された過去の瞬間を再参照する装置**です。一緒に経験した瞬間を
   再登場させることは「覚えている」ことの証明であり、面白いかどうかは
   必須ではありません。

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
- `assessSincerity()`・`resolveRelationshipTier()`・`decideRhythm()` で、
  このターンに逸脱して良いか、どこまで逸脱して良いかをゲートします。
- `buildInterventionPlan()` と `buildFrictionParameters()` で、直近コメントに
  接続する、謝りすぎを弱める、配信者として判断する、非優先形応答、
  ボケ/ツッコミ、ステータスシーソー、ギャグ台帳からのコールバックなどの
  介入方針を構造化します。
- `generateRewriteCandidates()` で、構造化されたパラメーターをLLMに渡し、
  複数候補を生成します。各候補には typicality(典型度)の自己申告が付き、
  分布の裾(意外な側)を選びやすくします。
- `evaluateRewriteCandidates()` で、無難さ、文脈接続、具体性、キャラクター維持、
  意味の維持、攻撃性、文脈にない情報の追加、汎用返答度(どんな入力にも
  言えそうな返答や自分の直近出力の繰り返し)、playマーカーの有無、
  最終文(最も価値の高いサプライズ位置)が実際に変わったかを評価します。
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
デフォルトでは会話全文ではなく、よく使う締め方、繰り返し表現、自分自身の
直近の返答(汎用返答ペナルティ用)、直近で使った書き換え指示、話題ごとの
ループを記録します。さらに、逸脱の演出に必要な状態(リズムカウンター、
反応から学習した逸脱バジェット、ギャグ台帳)も同じメモリに永続化されます。

ストアを設定しない場合も、コンタミネーターのインスタンスが生きている間は
同じ状態がインメモリで動くため、リズム制御と反応ループは設定なしで機能します。

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
