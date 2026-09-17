# @aituber-onair/noise

![@aituber-onair/noise logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/noise/images/aituber-onair-noise.png)

AITuber OnAir Noise は、AIの返答が無難すぎることを検出し、意味や
キャラクターを保ちながら、配信で使いやすい言葉に書き換えるライブラリです。
会話の状況や視聴者との関係に応じて、書き換えるタイミングと強さを調整します。

任意で組み込む神経連携アダプターでは、原文の意味も変えられます。
キャラクターらしさと会話のつながりを保ちながら、返す内容を揺らがせます。
実配線を試す場合は、[データのセットアップ手順](#malecns-setup)を参照してください。

## なぜ必要か(背景)

AIキャラクターの配信で、返答が毎回きれいにまとまったり、同じような同意や
締めの言葉が続いたりすると、次の反応を予想しやすくなります。
Noise は、こうした返答に、ツッコミ、あえて同意しない反応、過去の会話への
言及などを加えられるようにするものです。

ただし、意外な返答がいつも喜ばれるとは限りません。同じ辛口の返しでも、
親しい視聴者と初めて来た視聴者では受け取り方が違います。真剣な相談には、
返答を崩すことが適さない場合もあります。そのため、文章の書き換えと合わせて、
会話の状況や関係性を確認し、視聴者の反応を次の判断に反映します。

設計では、会話分析・即興演劇・ユーモア理論・AI VTuberの事例を参考にしています
(`docs/design-research.md`)。キャラクターの普段の話し方、冗談だと伝わる表現、
からかう対象、視聴者との関係を考慮し、変化を加えた後は通常の応答に戻す方針です。

## 仕組み(1ターンの流れ)

通常の書き換えでは、LLMが下書きを作った後に次の処理を行います。
ブラウザサンプルの「ノイズの判断を見る」でも、この流れを確認できます。

1. **診断**: 締めの定型表現、謝りすぎ、同調しすぎなどを検出してスコア化します。
2. **適用条件の確認**: 真剣な相談などでは書き換えを停止します(誠実度ゲート)。
   視聴者との関係に応じて変更の範囲を制限し(関係資本)、書き換えが続かないよう
   間隔を調整します(リズム制御)。
3. **方針の決定**: 適用条件で許可された範囲から、書き換え方を決めます。
4. **候補生成と採点**: LLMで複数の候補を生成し、定型的な表現が減ったか、
   キャラクターを保っているか、必要な遊びの合図があるかなどを評価します。
5. **選択と品質チェック**: 評価に基づいて候補を選び、変更の程度や内容を検査します。
6. **反応の反映**: 適用した変更を記録します。`reportReaction()` で視聴者の反応を
   渡すと、次回以降の変更の強さに反映されます。好意的な反応があった場面は、
   後の会話で参照するためにギャグ台帳へ記録します。

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

## 書き換えのタイミングと強さの調整

### リズム制御

毎回返答を変えるのではなく、通常の応答を間に挟むための機能です。
ノイズを適用するターンを「ティルト」、適用しない通常のターンを「平場」と呼びます。
内蔵のリズムコントローラーは、ティルト直後のターンをクールダウンとして
スキップします。必要に応じて、次のティルトまでに確保する平場のターン数も指定できます。

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

`tiltThreshold` のデフォルトは `0.35` です。すでに自然に着地している
下書きは、素の状態では書き換えられません。毎ターンを対象にしたい場合は
`0` を指定してください。

スキップされたターンは `result.skipped` に理由(`'cooldown'`、
`'platform'`、`'low_predictability'`、`'repair'`、`'sincerity'`、
`'no_licensed_intervention'`、`'model_error'`、`'quality_fail'`)が
入り、テキストは下書きのまま返ります。`forceTilt: true` でバイパスできます。

### 関係資本(relationship capital)

常連には喜ばれるからかいでも、初めて来た視聴者には不快に受け取られることがあります。
`relationshipCapital`(0-1)をターンごとに渡すと、Noise は実際に適用する書き換えモードと
使える書き換え方の両方を制限します。kizuna のような絆システムの値も、数値として渡せます。

- `stranger`(< 0.25): 言い回しレベルの編集のみ(`subtle` 相当)
- `acquaintance`(< 0.55): + 柔らかい反論、ためらいや部分的な同意を含む返答、短文化(`performer`)
- `regular`(< 0.8): + 着地反転、コールバック、ボケ、強気に出てから自分にツッコミを入れる返し(`inversion`)
- `companion`(>= 0.8): + ツッコミ、あえての無反応(`chaotic`)

`@aituber-onair/kizuna` を使っている場合は、ポイントを 0-1 の範囲の数値に変換して渡せます:

```ts
const user = await kizuna.getUser(userId);
const relationshipCapital = Math.min(1, (user?.points ?? 0) / 1000);
```

### 誠実度ゲート

直近のユーザー発言から、真剣な相談、つらさの打ち明け、深刻な生活上の出来事などを
検出したときは、他の条件より優先してノイズを停止します。
`sincerityGate: false` で無効化できます。

### playマーカー(遊びの合図)

Benign Violation Theoryを参考に、からかいが冗談として伝わる表現を確認します。
イジリ系の介入(`tsukkomi`、`withheld_uptake`、
`boke_bait`、`status_seesaw`、`contrarian_reframe`)には、同じ返答内に
笑い・誇張・自虐などのマーカーが必須です。欠けた候補は減点され、
`missing_play_marker` として報告されます。

### ギャグ台帳とコールバック

コールバックは、過去の会話や出来事を後の返答で再び取り上げることです。
ギャグ台帳に記録した内容を使い、以前のやり取りに触れる返答を作れます。

```ts
await contaminator.recordMoment({
  summary: '視聴者がプリンを冷蔵庫で爆発させた事件',
  source: 'user',
});
// 以降のターンで `callback` 介入として自然に再登場します。
```

ティルトに好意的な反応があった場合は、その場面が自動でギャグ台帳に記録されます。

### 反応ループ

返答に対する視聴者の反応を渡すと、次回以降の書き換えの強さを調整できます。

```ts
const reaction = await contaminator.reportReaction({ signal: 'laughter' });
// 'laughter' | 'positive' | 'neutral' | 'silence' | 'pushback' | 'discomfort'
```

配信ではコメント欄から反応を推定できるため、手動でラベルを付けずに
利用できます。出力の `turnId` を渡しておくと、遅れて届いた反応が別の
ティルトの評価に使われることを防げます:

```ts
import { inferReactionFromComments } from '@aituber-onair/noise';

const output = await contaminator.contaminate({ ... });
// ...ティルト後の数秒間に届いたコメントを集める...
await contaminator.reportReaction({
  ...inferReactionFromComments(commentsAfterTilt),
  turnId: output.turnId,
});
```

ポジティブな反応があると、変更をどこまで許すかを表す「逸脱バジェット」を広げ、
直前のティルトをギャグ台帳に記録します。ネガティブな反応があるとバジェットを縮め、
ノイズを停止するリペアターンを挟みます。`onNoiseEvent` でライフサイクルイベント
(`tilt_applied`、`noise_skipped`、`repair_advised`、`moment_recorded`、
`callback_used`)を購読でき、アプリ側の演出に使えます。

### 「ウケた/スベった」や「ギャグ台帳」という名前について

Noise の目的は、LLMの返答がいつも同じようにまとまることを減らすことです。
笑いを取ることだけを目的にはしていません。ユーモア研究は、意外な返答や
からかいが受け入れられる条件を考えるために参考にしています。

ブラウザサンプルでは、配信で使う言葉に合わせて反応ボタンを「ウケた/スベった」と
表示しています。コメント欄の「草」や「w」も、反応を推定する手がかりです。
APIでは笑いだけでなく、好意的な反応、沈黙、反発、不快感なども扱い、
`reportReaction()` を通じて次の書き換えに反映します。

ギャグ台帳も、面白い出来事だけを保存する機能ではありません。
過去に共有した会話や出来事を記録し、後の返答から参照するために使えます。

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
  このターンで書き換えるか、どこまで変更を許すかを判定します。
- `buildInterventionPlan()` と `buildFrictionParameters()` で、直近コメントに
  接続する、謝りすぎを弱める、配信者として判断する、ためらいや部分的な同意を含む返答、
  ボケ/ツッコミ、強気に出てから自分にツッコミを入れる返し、ギャグ台帳からのコールバックなどの
  介入方針を構造化します。
- `generateRewriteCandidates()` で、構造化されたパラメーターをLLMに渡し、
  複数候補を生成します。LLMは各候補について、どのくらい定型的な返答かを
  typicality(典型度)として申告します。この値を候補の選択に使います。
- `evaluateRewriteCandidates()` で、無難さ、文脈接続、具体性、キャラクター維持、
  意味の維持、攻撃性、文脈にない情報の追加、汎用返答度(どんな入力にも
  言えそうな返答や自分の直近出力の繰り返し)、playマーカーの有無、
  返答の最後の文が実際に変わったかを評価します。
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
LLMの代わりに固定ルールで文章を書き換える処理は廃止しています。

## 失敗時の挙動

Noise は生成後のエフェクトです。配信では「ノイズがかからない」ことは
許容できても「返答が消える」ことは許容できません。そのため書き換え用
LLM の失敗で `contaminate()` が throw することはなく、モデルエラー時は
下書きをそのまま返します(`skipped.reason === 'model_error'`)。候補
JSON が壊れている・途中で切れている場合も、その出力を使わず下書きを返します。
呼び出しの制限時間や、品質検査に失敗したときの動作は、次の 2 つのオプションで指定できます:

```ts
const contaminator = createContaminator({
  // ハングした書き換え呼び出しを打ち切って下書きを返す。
  modelTimeoutMs: 4000,
  // 全候補が品質チェックに落ちたら、失敗した書き換えではなく
  // 下書きを返す(skipped.reason === 'quality_fail')。
  fallbackToDraftOnQualityFail: true,
});
```

保護対象(コードブロック・URL・数値)は、書き換え前に一時的な目印の文字列へ
置き換えます。モデルには、この目印を一字一句維持するよう指示します。
目印が抜けたり変わったりした候補は使わず、下書きを返します。

## 品質レポート

`contaminate()` は毎回 `quality` を返します。

```ts
if (!result.quality.passed) {
  console.warn(result.quality.issues);
}
```

このレポートは、まだ無難な言い回しが残っている返答、キャラクターを変えすぎた
返答、言い方を変えすぎた返答、文脈にない情報を足した返答を検出します。

## キャラクター固有の表現を登録する

標準では、一般的なアシスタントによく見られる表現を検出します。
キャラクター固有の口癖・定番の締め・遊びの合図は、`lexicon` に文字列の一覧として
登録できます。判定には、大文字と小文字を区別しない部分一致を使います。

```ts
const contaminator = createContaminator({
  lexicon: {
    // 診断で「予定調和な言い回し」として扱うフレーズ。
    predictablePhrases: ['それでは今日のまとめコーナー'],
    // ジェネリック度ペナルティの対象にする定型返答。
    stockReplies: ['ナイスファイトです'],
    // イジリ系介入の「遊びの合図」として認めるマーカー。
    playMarkers: ['にゃはは'],
  },
});
```

同じオプションは単体関数(`scorePredictability()`、
`diagnosePredictability()`、`scoreGenericity()`、`hasPlayMarker()`、
`evaluateRewriteCandidates()`)でも使えます。また適応メモリがこれを実行時に
補完します。キャラクターが実際に繰り返した締めやフレーズは学習され、
その後の診断に使われます。

## 繰り返し表現の記録

Noise は、よく繰り返される締め方や表現を小さな記録として保存できます。
デフォルトでは会話全文ではなく、よく使う締め方、繰り返し表現、自分自身の
直近の返答(汎用返答ペナルティ用)、直近で使った書き換え指示、話題ごとの
ループを記録します。さらに、逸脱の演出に必要な状態(リズムカウンター、
反応から学習した逸脱バジェット、ギャグ台帳)も同じメモリに永続化されます。

保存先を設定しない場合も、`createContaminator()` で作ったオブジェクトが
保持されている間は状態がメモリに残ります。リズム制御と反応ループは、
保存先の設定なしでも機能します。

ブラウザとNode.jsの両方で使える、メモリ内だけの保存先:

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

`detectNoiseRuntime()` で `browser`、`node`、`unknown` を判定できます。ただし
本番では `@aituber-onair/noise/web` または `@aituber-onair/noise/node` を
明示的に import する方が安全です。ブラウザ bundle に Node.js モジュールが
混ざるのを避けられます。

このパッケージは ESM(`dist/esm`)と CommonJS(`dist/cjs`)のデュアル
ビルドを同梱しているため、Node.js では `import` と `require` の両方が
使えます。

## 実験的な神経回路による補正

脳機能を使う場合は、外部データが不要な `createVirtualNoiseBrain()` を
標準の選択肢にできます。`modulator` を指定しなければ、従来のNoiseと
同じ動作です。インストール時や通常の起動時にデータを自動取得しません。

```ts
import { createContaminator, createVirtualNoiseBrain } from '@aituber-onair/noise';

const brain = createVirtualNoiseBrain({ seed: 42 });
const contaminator = createContaminator({
  model, // 既存のRewriteModel
  modulator: brain,
  fallbackToDraftOnQualityFail: true,
});
```

仮想回路は1,024ニューロン、各ニューロンから16接続、24ステップを初期値と
しています。同じseedから同じ配線を生成し、毎ターン状態をリセットします。
配線の配列は143,380バイトで、計算状態には別途メモリが必要です。
`neurons`、`connectionsPerNeuron`、`steps`、`dtMs` で規模や計算時間を
調整できます。仮想回路は独自に設計したもので、ハエの実配線の再現ではありません。

入力には、Noiseが計算した勢い、緊張、反復度、予測しやすさ、人格の変動度、
視聴者の意図を使います。追加のLLM呼び出しはありません。
神経細胞が反応しやすくなる接続(興奮性)と、反応しにくくなる接続(抑制性)を通して
刺激を伝えます。活動量と、同じseedなら同じ計算方法になる4種類の集計値を使い、
書き換えの強さやキャラクターに関するパラメータを調整します。
会話から刺激への変換も、活動から文体への変換も人工的な対応づけです。
ハエが言葉や褒め言葉、侮辱を理解することを意味しません。

このシミュレーションでは、神経細胞が受け取った刺激を内部の数値として蓄積し、
一定の値に達すると信号を出します。この信号を出す動作を「発火」と呼びます。
計算に使う初期値は次のとおりです。

| 設定 | 初期値と意味 |
| --- | --- |
| 時間刻み | 1msずつ計算を進める |
| 減衰の時定数 | 20ms。蓄積した値が時間とともに減る速さを決める |
| 発火閾値 | 蓄積した値が1に達すると発火する |
| 不応期 | 発火後の2msは再び発火しない |
| 伝播遅延 | 出した信号が次の細胞へ届くまで1ステップかかる |
| 伝播ゲイン | 信号の強さに掛ける倍率は4 |
| 刺激の間隔 | 4ステップごとに刺激を与える |

仮想回路では接続元の80%を興奮性、20%を抑制性とする確率で生成します。
活動に応じて配線や接続の強さを学習・変更する機能はありません。

補正はsincerity・rhythmの判定を通過し、relationshipで許可された介入が
存在する場合だけ実行します。強度の倍率は0.75〜1.25、介入への加算は±0.25、
人格パラメータへの加算は±0.20に制限し、最終値も0〜1に収めます。
不正な値や実行エラーでは補正を使わず、元の計画を続行します。
保護対象の文字列や品質判定の既存処理は維持します。
品質不合格時に原文へ戻すには、従来どおり `fallbackToDraftOnQualityFail: true`
を指定してください。

`output.modulation` には、適用した補正と神経活動の集計結果が入ります。
非同期の補正処理は初期値1,000msで打ち切ります (`modulatorTimeoutMs`)。
タイマーでは同期的なCPU処理を中断できないため、ブラウザでは画面の操作を止めないよう、
別スレッドで処理するWorkerの利用を推奨します。

### ハエの実配線データを使う(MaleCNS v1.0)

MaleCNS版は、ハエの脳の配線データを使って、入力に対する神経細胞の反応を計算します。
各細胞を簡略化した数式で表す実験的なシミュレーションで、生きたハエの脳全体を
正確に再現するものではありません。
元データと変換済みグラフはnpmに同梱しません。

<a id="malecns-setup"></a>

#### 実配線データのセットアップ

仮想回路だけを使う場合、この準備は不要です。実配線を使う場合は、
公式データをダウンロードし、付属のスクリプトでNoise用に変換します。
変換スクリプトとCLI・WebUIサンプルはnpmパッケージに含まれないため、
このGitHubリポジトリを取得して実行してください。

**1. リポジトリと依存パッケージを準備する**

Node.js 20以上、npm、Gitを使います。新しく作業用のフォルダーを用意する場合は、
次のコマンドを実行してください。取得済みの場合は、そのリポジトリのルートへ移動し、
`npm ci` 以降を実行します。

```sh
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair
npm ci
npm -w @aituber-onair/chat run build
npm -w @aituber-onair/noise run build
```

**2. 公式データを取得して変換する**

引き続きリポジトリのルートで実行します。

```sh
npm -w @aituber-onair/noise run malecns:prepare -- \
  --source data/malecns-source --out data/malecns-v1 --download
```

`--download` を付けると、MaleCNS公式のGoogle Cloud Storageから必要な元データを
取得し、そのまま変換します。このリポジトリからデータ本体を取得する処理ではありません。
npmのインストール時や仮想回路の起動時には、ダウンロードしません。

このコマンドの相対パスは `packages/noise` が基準です。
元データは `packages/noise/data/malecns-source`、変換結果は
`packages/noise/data/malecns-v1` に保存されます。配線だけで約207MBあり、
元データ・座標・注釈にも別途保存領域が必要です。

公式の元ファイルを `--source` のフォルダーに用意済みなら、`--download` を省略できます。
出力先には、まだ存在しないフォルダーを指定してください。途中で失敗した場合も、
再実行では `--out data/malecns-v1-retry` など別の出力先を使います。

変換の最後に `manifest.json` が書き出され、正常終了すると件数などのJSONが表示されます。
変換先には次のファイルができます。

| ファイル | 用途 |
| --- | --- |
| `manifest.json` | バージョン・件数・ハッシュ・変換条件 |
| `graph.bin` | Noiseが読み込む配線 |
| `metadata.json` | WebUI用の神経細胞の注釈 |
| `soma-positions.f32` | WebUI用の細胞体座標 |
| `ATTRIBUTION.txt` | 出典・ライセンス名・変換内容 |

**3. 読み込みを確認する**

次のコマンドはLLMと通信せず、実配線の読み込みと神経回路の動作を確認します。
表示される文章は接続確認用で、文章品質の比較には使えません。

```sh
MALECNS_DATA_DIR=./packages/noise/data/malecns-v1 \
  node packages/noise/scripts/brain-example.mjs
```

この `node` コマンドの相対パスは、実行するリポジトリのルートが基準です。
`MALECNS_DATA_DIR` を省略すると仮想回路を使うため、実配線の確認では指定してください。

**4. WebUIまたはCLIで使う**

WebUIを起動するには、次を実行します。

```sh
npm -w @aituber-onair/noise run example:brain-chat
```

`http://127.0.0.1:5183` を開き、「設定」で「ハエの脳の実データ（MaleCNS）」を選びます。
データURLは既定の `/brain-data/manifest.json` のまま、
「選んだ脳で会話を始め直す」を押してください。「動きを試す」で、APIキーなしで
活動表示を確認できます。AIと会話する場合は、同じ設定画面でサービス・モデルを選び、
必要なAPIキーを入力します。

別のフォルダーに変換した場合は、起動時に保存先を指定します。
このnpmワークスペースのコマンドでは、相対パスは `packages/noise` が基準です。

```sh
MALECNS_DATA_DIR=./data/malecns-v1-retry \
  npm -w @aituber-onair/noise run example:brain-chat
```

Codex SDKで実際の返答を確認する場合は、[CLIの接続手順](examples/neural-rewrite-cli/README.ja.md#codex-sdkで試す)へ進んでください。
SDKは別の実行環境にインストールし、実配線は `MALECNS_DATA_DIR` で指定します。
WebUIのデータ配置や操作の詳細は[WebUIのREADME](examples/noise-brain-chat/README.ja.md)にあります。

自分のNode.jsアプリで使う場合は、変換先のフォルダーを配置し、後述の
`loadMaleCnsNoiseBrain({ dataDir })` にその保存先を渡します。
変換を終えた後の読み込みには、元のFeatherファイルは不要です。

**配信・再配布する場合**

データは [MaleCNS](https://male-cns.janelia.org/) の
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) に従って扱います。
変換済みデータを配布する場合は `ATTRIBUTION.txt` も添え、出典、ライセンスへのリンク、
変換したことが分かる説明を維持してください。Webアプリで配信する場合も、
データの説明やクレジットからこれらを確認できるようにします。
ローカル開発サーバーが配信するのは上記のデータ4ファイルで、`ATTRIBUTION.txt` は配信しません。

#### 変換と読み込みの仕様

変換にはApache Arrow 21.2とLZ4デコーダーを使います。依存パッケージは
上記の `npm ci` で入ります。接続表をバッチ単位で2回走査し、
接続ごとのJavaScriptオブジェクトは生成しません。

保持対象は `superclass` が空でない神経細胞で、明示的なグリアを除外します。
保持対象同士の接続は自己接続を含めて残し、重みの閾値は設けません。
このリリースでは166,700ニューロン・25,582,938接続との一致を要求し、
異なれば変換を停止します。

伝達物質には `consensus_nt` を使い、アセチルコリンを正、GABA・グルタミン酸・
ヒスタミンを負、それ以外や不明なものを0とする近似を採用しています。
各接続の重み(信号の伝わる強さ)を、その接続先に入る重みの絶対値の合計で割り、
入力全体の大きさを調整します。
生物学的な作用を普遍的に表す規則ではありません。
`--signs signs.json` で符号表を置き換えられます。値は-1・0・1で、未定義の名前は
0です。実効重みが0になった接続もグラフには残します。

注釈でLC4・LPLC2・LPLC1・LC10aとされた神経細胞を、同じ条件なら同じ結果になる
規則で6つのグループに分け、それぞれに刺激を与えます。これを入力チャンネルと呼びます。
反応を集計する対象には、`superclass` が `descending_neuron` の細胞を使います。
神経活動から値を取り出す処理を「読み出し」、その対象の細胞を「読み出し集団」と呼びます。
これらの細胞が会話の意味や感情を担当するという主張ではありません。

```ts
import { loadMaleCnsNoiseBrain } from '@aituber-onair/noise/node';

const brain = await loadMaleCnsNoiseBrain({
  dataDir: './packages/noise/data/malecns-v1',
  seed: 42,
});
// createContaminator({ model, modulator: brain }) に渡す
```

実行時はmanifestのバージョン・件数とグラフのSHA-256を確認します。
manifestには元ファイルのハッシュ、変換条件、生成日時も記録します。
ハッシュは破損検出用で、配布元の認証ではないため、信頼できるmanifestを使ってください。

### ブラウザで使うためのデータ配置とWorker

開発者が変換済みファイルを準備し、アプリから参照できる明示的なURLに
`manifest.json` と `graph.bin` を配置します。
GitHub Releasesは開発者向けの配布元にできますが、この試作はReleaseの公開や
自動取得を行いません。アプリと同じ配信先に置いても、ブラウザで読み込む際の
転送は必要です。通常は仮想回路を使い、実配線版の読み込みはアプリ側で明示的に
選択する構成にしてください。

```ts
// brain.worker.ts: 読み込み中の要求も受け取れるよう、Promiseのまま渡す
import { exposeNoiseBrainWorker, loadMaleCnsNoiseBrain } from '@aituber-onair/noise/web';
exposeNoiseBrainWorker(self, loadMaleCnsNoiseBrain({
  manifestUrl: '/data/malecns-v1/manifest.json',
}));
// 仮想回路の場合はcreateVirtualNoiseBrain()を渡す
```

```ts
// アプリ側。大きなグラフの初回読み込みを考慮した待ち時間の例
import { createWorkerNoiseModulator } from '@aituber-onair/noise/web';
const worker = new Worker(new URL('./brain.worker.ts', import.meta.url), {
  type: 'module',
});
const modulator = createWorkerNoiseModulator(worker, 30_000);
const contaminator = createContaminator({
  model, modulator, modulatorTimeoutMs: 31_000,
  fallbackToDraftOnQualityFail: true,
});
// 不要になったらmodulator.dispose()を呼ぶ
```

Workerの異常時は待機中の要求を失敗として扱い、タイムアウト時はWorkerを終了します。
その後もNoiseは補正なしで応答できます。再試行する場合はWorkerを作り直します。
同梱の通信処理が返すのは補正に使う少量の集計値だけです。
ニューロン単位のスナップショットを画面へ送る場合は、アプリ側で通信処理を追加します。
ハッシュ検証にはHTTPSまたはlocalhostが必要です。
SharedArrayBufferやcross-origin isolation用のヘッダーは使いません。

### 活動の取得とデータ形式

`brain.getActivitySnapshot()` は直近のターンの発火回数をコピーして返します。
`brain.getBodyIds()` の同じ位置が対応するIDです。仮想回路のIDは人工的なものです。
発火回数はシミュレーション上の活動であり、その細胞が出力を引き起こしたことの
証明ではありません。

変換時には、任意の可視化用に `metadata.json` と `soma-positions.f32` も保存します。
後者は1ニューロンにつきXYZのFloat32で、追加容量は2,000,400バイトです。
座標はMaleCNS EMの8nmボクセル単位で、欠損はNaNです。シミュレータはこの2ファイルを
読み込みません。IDと座標を使えば活動を点で表示できますが、神経の枝、脳のメッシュ、
ハエの身体や動作には別の形状データと描画処理が必要です。
今回のパッケージには描画UIやNeuroMechFlyを含めていません。

`graph.bin` はリトルエンディアン形式です。32ビットのヘッダー4値
(magic `0x3142524e`、形式バージョン1、ニューロン数N、接続数E)の後に、
offsets (N+1)、body IDs (N)、flags (N)、targets (E)、Float32 weights (E)が続きます。
flagsはbit 0が下降ニューロン、bit 1が左、bit 2が右、bit 8〜15が入力チャンネル
(255は入力なし)です。今回の実配線グラフは206,663,924バイトです。

```sh
npm -w @aituber-onair/noise run example:brain
# ビルド後、実データを読み込んで検証する場合
MALECNS_DATA_DIR=./packages/noise/data/malecns-v1 \
  node packages/noise/scripts/brain-example.mjs
```

サンプルは補正の有無による計画の違い、読み込み時間、計算時間、活動、メモリを表示します。
オフラインの書き換えモデルは原文を返すスタブです。接続処理の確認用であり、
文章の品質が改善したことを示す比較ではありません。
CIでは小さな人工グラフを使い、実データを必要としません。
計算部分はTypeScriptで、Wasmやネイティブコードのコンパイルは不要です。

データの出典は[MaleCNSプロジェクト](https://male-cns.janelia.org/)です。
FlyEM (HHMI Janelia)、University of Cambridge、MRC Laboratory of Molecular Biology、
Google Researchによるデータで、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
が適用されます。変換結果には帰属表示と変換内容を添付します。
シミュレータは独自に実装し、他のハエシミュレータからコードをコピーしていません。

### チャットと神経活動のサンプル

```sh
npm -w @aituber-onair/noise run example:brain-chat
```

`@aituber-onair/chat` のプロバイダーとモデルを選択し、AIとのチャット、
Noise前後の返答比較、ニューロンの活動再生を試せます。
仮想回路とMaleCNSを切り替え、点や活動リストからID・注釈・発火回数を確認できます。
記録には `captureActivity: true` と `brain.getActivityTrace()` を使います。
通常の利用では記録を有効にする必要はありません。
接続設定・データ配置・表示の意味は
[サンプルのREADME](./examples/noise-brain-chat/README.ja.md)を参照してください。

神経反応に沿った文章構成をCodex SDKで反復評価する場合は、
[CLIサンプル](./examples/neural-rewrite-cli/README.ja.md)を参照してください。

### 神経状態から返答を作る

```ts
import { createContaminator, createVirtualNoiseBrain,
  createNeuralReactionModel, createChatRewriteModel } from '@aituber-onair/noise';

const brain = createVirtualNoiseBrain({
  seed: 42, steps: 32, captureReadout: true, retainState: true,
});
const noise = createContaminator({
  model: createNeuralReactionModel({
    brain,
    model: createChatRewriteModel({ service: chatService }),
    onTrace: (trace) => console.log(trace.state),
  }),
  mode: 'chaotic',
  intensity: 0.9,
  relationshipCapital: 0.8,
  quality: { minLengthRatio: 0.8, maxLengthRatio: 1.1 },
  fallbackToDraftOnQualityFail: true,
});
```

`chatService` は設定済みのAITuber OnAir Chatサービスです。
コメントを6種類の刺激値へ変換して回路を動かします。原文を文のまとまり(節)に区切り、各節の文字列から一定の計算方法で数値を求めます(固定ハッシュ)。その値を使って、節ごとに集計する神経活動を対応づけます。対象の細胞の発火を初期・後半に分けて集計し、原文のどの部分に注目するかを示す数値(注意の重み)を作ります。区切りと対応先はコードで決まります。ただし、この対応は人工的なものです。語句が変われば対応先も変わり、意味を学習した回路やハエの言語機能を再現するものではありません。

発話を作るLLMには原文、キャラクター、内容ごとの注意の重みを渡します。原文は返答の下案として扱い、受け取り方、意見、その場の気持ちや判断、返す内容を変えられます。原文の全情報を残す必要はありません。キャラクターらしさと会話のつながりを保ち、過去の出来事や外部の事実は作りません。数字・URL・コードなどの保護は維持します。通常の介入計画に代えて `shift_attention` を使い、誠実度・関係性・リズムの判定は維持します。

文字数は原文の0.8〜1.1倍です。通常は刺激分類、発話、話のつながり・キャラクター・注意の監査で3回のLLM呼び出しを行います。2候補を順に検査し、全候補が落ちた場合は1回だけ再生成します。最大7回で通らなければ原文を返します。注意の偏りが小さい場合も `neural_unfocused` として原文を返します。モデル検査の通過は、複数出力の多様性や神経状態の寄与を証明しません。

`captureReadout: true` が必要です。独自の補正処理(modulator)では `readoutKeys` を受け取り、同じ順序の `contentKeys` と各フレームの `contentAxes` を返してください。対応する読み出しがない場合は原文へ戻ります。

`retainState: true` は各細胞に蓄積した値(膜電位)と、伝達中の信号を次のターンへ残します。ターン間にはシミュレーション上の8msの無刺激期間を置きます。実時間の経過には対応しません。会話ごとに別のインスタンスを使い、新しい会話では `brain.reset()` してください。既定値の `false` は従来どおり各回リセットします。

`onTrace` は刺激、原文の節（`facts` / `anchors`）、注意の重み（`attention`）、発火集計、候補と不採用理由を返します。従来の `state` は診断用に残していますが、発話生成には使いません。採用結果は `output.text` と `output.rewriteTrace` で確認します。回路そのものをLLMへ送ることはありません。

`captureReadout` は小さな時系列集計だけを保存します。実配線を使う場合はローダーにも同じオプションを渡してください。新しい方式は明示的に指定したときだけ働き、通常のNoiseの動作は変わりません。CLIの実行方法と評価項目は[CLIサンプル](examples/neural-rewrite-cli/README.ja.md)を参照してください。

### 実験的な神経作業記憶

`createNeuralWorkingMemory` は、以前の反応が残る小さな神経回路を使って、返答時に参照する過去の会話を選びます。利用側で、会話と現在の入力を同じ処理(エンコーダー)により数値の配列(ベクトル)へ変換し、選ばれた会話を任意のLLMへ渡します。この経路では原文の書き換えや文体の指定を行いません。変わるのはLLMが参照する会話であり、LLM内部の神経活動に直接介入する機能ではありません。

会話としての品質や通常の類似度検索に対する利点は未確認です。既存の書き換え経路とは別に指定する仮想回路で、モデルや実配線を自動ダウンロードすることはありません。入力形式、状態の管理、LLMへの接続方法と制限は[作業記憶CLIのREADME](examples/neural-memory-cli/README.md)を参照してください。
