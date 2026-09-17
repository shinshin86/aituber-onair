# @aituber-onair/noise

![@aituber-onair/noise logo](https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/noise/images/aituber-onair-noise.png)

AITuber OnAir Noise は、AIの返答が無難すぎることを検出し、意味や
キャラクターを保ちながら、配信で使いやすい言葉に書き換えるライブラリです。
会話の状況や視聴者との関係に応じて、書き換えるタイミングと強さを調整します。

任意で組み込む神経連携アダプターでは、原文の意味も変えられます。
キャラクターらしさと会話のつながりを保ちながら、返す内容を揺らがせます。

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
`relationshipCapital`(0-1)をターンごとに渡すと、Noise は実効モードと
介入語彙の両方を制限します。kizuna のような絆システムの値も、数値として渡せます。

- `stranger`(< 0.25): 言い回しレベルの編集のみ(`subtle` 相当)
- `acquaintance`(< 0.55): + 柔らかい反論、非優先形応答、短文化(`performer`)
- `regular`(< 0.8): + 着地反転、コールバック、ボケ、ステータスシーソー(`inversion`)
- `companion`(>= 0.8): + ツッコミ、あえての無反応(`chaotic`)

`@aituber-onair/kizuna` を使っている場合は、ポイントを 0-1 に正規化する
だけで接続できます:

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

## 失敗時の挙動

Noise は生成後のエフェクトです。配信では「ノイズがかからない」ことは
許容できても「返答が消える」ことは許容できません。そのため書き換え用
LLM の失敗で `contaminate()` が throw することはなく、モデルエラー時は
下書きをそのまま返します(`skipped.reason === 'model_error'`)。候補
JSON が壊れている・途中で切れている場合も、生の出力ではなく下書きに
フォールバックします。さらに次の 2 つのオプションで挙動を締められます:

```ts
const contaminator = createContaminator({
  // ハングした書き換え呼び出しを打ち切って下書きを返す。
  modelTimeoutMs: 4000,
  // 全候補が品質チェックに落ちたら、失敗した書き換えではなく
  // 下書きを返す(skipped.reason === 'quality_fail')。
  fallbackToDraftOnQualityFail: true,
});
```

保護対象(コードブロック・URL・数値)は書き換え前にプレースホルダー
トークンへ置換され、モデルにはトークンを一字一句維持するよう指示されます。
トークンを落とした・崩した候補は下書きへ退避します。

## 品質レポート

`contaminate()` は毎回 `quality` を返します。

```ts
if (!result.quality.passed) {
  console.warn(result.quality.issues);
}
```

このレポートは、まだ無難な言い回しが残っている返答、キャラクターを変えすぎた
返答、言い方を変えすぎた返答、文脈にない情報を足した返答を検出します。

## カスタムレキシコン

内蔵の検出語彙は「一般的なアシスタント口調」しか知りません。キャラクター
固有の口癖・定番の締め・遊びの合図はアプリ側の知識なので、レキシコンとして
渡してください(大文字小文字を無視した部分一致):

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
自動的に診断へ還流されます。

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
興奮性・抑制性の接続を通して刺激を伝え、活動量と4つの決定的な射影から、
介入の強さや人格パラメータへの補正を作ります。
会話から刺激への変換も、活動から文体への変換も人工的な対応づけです。
ハエが言葉や褒め言葉、侮辱を理解することを意味しません。

計算は近似的な発火モデルです。初期値では時間刻み1ms、減衰の時定数20ms、
発火閾値1、不応期2ms、伝播遅延1ステップ、伝播ゲイン4とし、4ステップごとに
刺激します。仮想回路では接続元の80%を興奮性、20%を抑制性とする確率で生成します。
学習や可塑性はありません。

補正はsincerity・rhythmの判定を通過し、relationshipで許可された介入が
存在する場合だけ実行します。強度の倍率は0.75〜1.25、介入への加算は±0.25、
人格パラメータへの加算は±0.20に制限し、最終値も0〜1に収めます。
不正な値や実行エラーでは補正を使わず、元の計画を続行します。
保護対象の文字列や品質判定の既存処理は維持します。
品質不合格時に原文へ戻すには、従来どおり `fallbackToDraftOnQualityFail: true`
を指定してください。

`output.modulation` には、適用した補正と小さな活動サマリーが入ります。
非同期の補正処理は初期値1,000msで打ち切ります (`modulatorTimeoutMs`)。
タイマーでは同期的なCPU処理を中断できないため、フロントではWorkerの利用を
推奨します。

### 任意のMaleCNS v1.0実配線バックエンド

MaleCNS版は、実際の配線を使う実験的なリザバーです。
生きたハエを正確に再現するものではなく、配線上の近似的な点ニューロン計算です。
元データと変換済みグラフはnpmに同梱しません。

このリポジトリで `npm ci` を実行した後、開発者が明示的に準備します。

```sh
npm -w @aituber-onair/noise run malecns:prepare -- \
  --source data/malecns-source --out data/malecns-v1 --download
```

このコマンドの相対パスは `packages/noise` を基準に解釈します。
公式ファイルを取得済みなら `--download` を省略できます。
出力先には新しいディレクトリを指定してください。途中で失敗した場合も、再実行では
別の出力先を使います。完了した場合だけ最後にmanifestを書き出します。
Node.js 20以上、Apache Arrow 21.2、LZ4デコーダーを使い、接続表をバッチ単位で
2回走査します。接続ごとのJavaScriptオブジェクトは生成しません。

保持対象は `superclass` が空でない神経細胞で、明示的なグリアを除外します。
保持対象同士の接続は自己接続を含めて残し、重みの閾値は設けません。
このリリースでは166,700ニューロン・25,582,938接続との一致を要求し、
異なれば変換を停止します。

伝達物質には `consensus_nt` を使い、アセチルコリンを正、GABA・グルタミン酸・
ヒスタミンを負、それ以外や不明なものを0とする近似を採用しています。
符号付き重みを、接続先への入力重みの絶対値合計で正規化します。
生物学的な作用を普遍的に表す規則ではありません。
`--signs signs.json` で符号表を置き換えられます。値は-1・0・1で、未定義の名前は
0です。実効重みが0になった接続もグラフには残します。

注釈でLC4・LPLC2・LPLC1・LC10aとされた集団を、6つの中立的な入力チャンネルへ
決定的に分割します。読み出しには `superclass` が `descending_neuron` の集団を
含めます。これらの細胞が会話の意味や感情を担当するという主張ではありません。

```ts
import { loadMaleCnsNoiseBrain } from '@aituber-onair/noise/node';

const brain = await loadMaleCnsNoiseBrain({
  dataDir: './data/malecns-v1',
  seed: 42,
});
// createContaminator({ model, modulator: brain }) に渡す
```

実行時はmanifestのバージョン・件数とグラフのSHA-256を確認します。
manifestには元ファイルのハッシュ、変換条件、生成日時も記録します。
ハッシュは破損検出用で、配布元の認証ではないため、信頼できるmanifestを使ってください。

### フロントでの配置とWorker

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
同梱の通信処理が返すのは小さな補正サマリーだけです。
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
コメントを6種類の刺激値へ変換して回路を動かします。原文を節ごとに区切り、各節を固定ハッシュで読み出し集団へ対応づけます。その集団の発火を初期・後半に分けて集計し、内容への注意の重みを作ります。区切りと対応先はコードで決まります。ただし、この対応は人工的なものです。語句が変われば対応先も変わり、意味を学習した回路やハエの言語機能を再現するものではありません。

発話を作るLLMには原文、キャラクター、内容ごとの注意の重みを渡します。原文は返答の下案として扱い、受け取り方、意見、その場の気持ちや判断、返す内容を変えられます。原文の全情報を残す必要はありません。キャラクターらしさと会話のつながりを保ち、過去の出来事や外部の事実は作りません。数字・URL・コードなどの保護は維持します。通常の介入計画に代えて `shift_attention` を使い、誠実度・関係性・リズムの判定は維持します。

文字数は原文の0.8〜1.1倍です。通常は刺激分類、発話、話のつながり・キャラクター・注意の監査で3回のLLM呼び出しを行います。2候補を順に検査し、全候補が落ちた場合は1回だけ再生成します。最大7回で通らなければ原文を返します。注意の偏りが小さい場合も `neural_unfocused` として原文を返します。モデル検査の通過は、複数出力の多様性や神経状態の寄与を証明しません。

`captureReadout: true` が必要です。独自のmodulatorでは `readoutKeys` を受け取り、同じ順序の `contentKeys` と各フレームの `contentAxes` を返してください。対応する読み出しがない場合は原文へ戻ります。

`retainState: true` は膜電位と伝達中の信号を次のターンへ残します。ターン間にはシミュレーション上の8msの無刺激期間を置きます。実時間の経過には対応しません。会話ごとに別のインスタンスを使い、新しい会話では `brain.reset()` してください。既定値の `false` は従来どおり各回リセットします。

`onTrace` は刺激、原文の節（`facts` / `anchors`）、注意の重み（`attention`）、発火集計、候補と不採用理由を返します。従来の `state` は診断用に残していますが、発話生成には使いません。採用結果は `output.text` と `output.rewriteTrace` で確認します。回路そのものをLLMへ送ることはありません。

`captureReadout` は小さな時系列集計だけを保存します。実配線を使う場合はローダーにも同じオプションを渡してください。新しい方式は明示的に指定したときだけ働き、通常のNoiseの動作は変わりません。CLIの実行方法と評価項目は[CLIサンプル](examples/neural-rewrite-cli/README.ja.md)を参照してください。

### 実験的な神経作業記憶

`createNeuralWorkingMemory` は、小さな状態付き発火回路で過去の会話を選び、返答時に参照できるようにします。利用側が同じエンコーダーで会話と入力をベクトル化し、選ばれた会話を任意のLLMへ渡します。この経路では原文の書き換えや文体の指定を行いません。変わるのはLLMが参照する会話であり、LLM内部の神経活動に直接介入する機能ではありません。

会話としての品質や通常の類似度検索に対する利点は未確認です。既存の書き換え経路とは別に指定する仮想回路で、モデルや実配線を自動ダウンロードすることはありません。入力形式、状態の管理、LLMへの接続方法と制限は[作業記憶CLIのREADME](examples/neural-memory-cli/README.md)を参照してください。
