# @aituber-onair/kizuna

![AITuber OnAir Kizuna - logo](./images/aituber-onair-kizuna.png)

Kizuna は、AI キャラクターとの接触の積み重ねを、キャラクターが応答に
使える「絆」へ変えるパッケージです。

最初のメッセージでは `stranger`。接触が続くと `acquaintance`、`regular`、
そして `companion` へ育ちます。しばらく離れると、履歴を消さずに温かさだけが
下がります。再び触れ合えば温かさが戻ります。`getBondContext()` は各時点の
状態を LLM 向けの短いプロンプトへ変換します。

[English README](./README.md)

## 全体ワークフロー

Kizuna は、ある LLM ターンと次のターンの間に入ります。1メッセージの往復は
次のように流れます。

```text
視聴者コメント
      |
      v
chat パッケージ + LLM
  - system prompt には前回の getBondContext() がすでに入っている
  - キャラクターの反応感情を付けて返信する
      |
      | emotion
      v
アプリケーション
  - kizuna.processInteraction({ emotion, ... }) を呼ぶ
  - moderation 結果やアプリ規則で valence / severity を上書きできる
      |
      v
Kizuna
  - 絆スコア、温かさ、傷を決定論的に更新する。ここで LLM は動かない
      |
      v
更新後の getBondContext() -> 次ターンの system prompt -> 態度が変わる
```

LLM は、キャラクターがどう感じたかを伝える**センサー**であり、更新された
文脈を読んで振る舞いを変える**アクチュエーター**です。Kizuna は、その間に
置く決定論的な状態機械です。絆の増減量を LLM が決めることはありません。
計算を LLM の外に置く理由は次の3つです。

- プロンプトインジェクションに強い。視聴者が会話で親密度をつり上げられない。
- 関係の変化を再現・テストできる。
- 絆の計算に追加の LLM コストや待ち時間がかからない。

分類器の層は差し替えられます。moderation API やアプリ独自規則の結果を
`valence` / `severity` の上書きとして渡せます。
[`chat-bond-sample`](./examples/chat-bond-sample/) の小さな辞書は、まさにこの
入力層を LLM なしで代用するものです。実際のチャットフローでは通常、
キャラクターの反応感情を valence の信号に使います。

## 絆の物語

デフォルト設定で得られる日本語コンテキストの例です。

```text
# 最初の接触
Akiとの絆: stranger（レベル1、1ポイント）。関係の流れ: 育っている。現在の空気: 温かい（温かさ1.00）。継続: 1バケット。好みの感情: curious。この関係性の深さと現在の空気に合わせ、罪悪感を促さずに応答してください。

# 接触を重ねる
Akiとの絆: regular（レベル3、500ポイント）。関係の流れ: 育っている。現在の空気: 温かい（温かさ1.00）。継続: 12バケット。好みの感情: happy, curious。この関係性の深さと現在の空気に合わせ、罪悪感を促さずに応答してください。

# しばらく離れる
Akiとの絆: regular（レベル3、500ポイント）。関係の流れ: 育っている。現在の空気: 落ち着いている（温かさ0.50）。継続: 12バケット。好みの感情: happy, curious。この関係性の深さと現在の空気に合わせ、罪悪感を促さずに応答してください。

# 再び触れ合う
Akiとの絆: regular（レベル3、501ポイント）。関係の流れ: 育っている。現在の空気: 温かい（温かさ0.95）。継続: 1バケット。好みの感情: happy, curious。この関係性の深さと現在の空気に合わせ、罪悪感を促さずに応答してください。

# 長く続く相棒になる
Akiとの絆: companion（レベル4、1000ポイント）。関係の流れ: 安定している。現在の空気: 温かい（温かさ1.00）。継続: 20バケット。好みの感情: happy, curious。この関係性の深さと現在の空気に合わせ、罪悪感を促さずに応答してください。
```

符号付きの絆スコアはゆっくり動く履歴、温かさは現在の空気、継続は日・週・
セッション・独自バケットをまたぐ接触を表します。これらを分けて持つため、
深い絆が冷えたり、修復したり、重大な傷を覚えたりしても、すぐ初対面には
戻りません。

## 関係はどう動くか

デフォルトの `human` プリセットは、成長と悪化をどちらも関係の一部として
扱います。配信向けに傷つきにくく修復が速い `forgiving`、境界を厳しくする
`strict` も選べます。

| 接触 | 絆スコア | 温かさと記憶 |
| --- | --- | --- |
| 親切な接触 | ゆっくり増える。同じバケット内の反復ほど増加量が小さくなる。 | 温かさが戻り、バケットをまたぐ継続には小さなボーナスが付く。 |
| 軽い不和 | 初回割引と深いステージの緩衝を受けて下がる。 | すぐ冷えるが、数回の穏やかな接触で修復する。 |
| 重大な違反 | ステージ緩衝を無視して大きく下がる。 | ユーザー・バケットごとに1つの傷を作り、贈り物では消せない。 |
| 温かさが低いときの贈り物 | 通常より増加量が小さくなる。 | お金や物で直後の許しを買えない。 |
| 会わない時間 | **絆スコアもステージも下げない。** | 温かさだけが下限へ近づき、再会で戻る。 |
| 継続的な仲直り | スコアと温かさを徐々に戻す。 | 複数バケットにまたがる肯定的な積み重ねだけが傷を癒す。 |
| 遅れて届いた接触 | 元のバケットの不正防止規則でスコア効果を記録する。 | 現在の空気、不和履歴、傷のライフサイクルは巻き戻さない。 |

`angry` などの否定的な感情、明示した `valence`、ルールが設定した valence で
否定的接触を表せます。`severity: 'grave'` は、アプリケーションが重大な
信頼違反と確認した場合だけ指定してください。

```typescript
config.dynamics = {
  preset: 'human', // 'human' | 'forgiving' | 'strict'
  negativityBias: 3,
  maxTrackedBuckets: 128, // 永続化する不正防止履歴の上限
};

await kizuna.processInteraction({
  userId: 'person-42',
  kind: 'reaction',
  emotion: 'angry',
  valence: 'negative',
  severity: 'light',
  isOwner: false,
  timestamp: Date.now(),
});
```

### 設計ノートと倫理方針

デフォルト値は関係性研究を参考にしたプロダクト上のヒューリスティックであり、
ソフトウェアが人間関係を再現・診断できるという主張ではありません。

- デフォルト3倍の否定性重みは Baumeister らの
  [“Bad Is Stronger Than Good”](https://doi.org/10.1037/1089-2680.5.4.323)、
  信頼の非対称性は Slovic の
  [“Perceived Risk, Trust, and Democracy”](https://doi.org/10.1111/j.1539-6924.1993.tb01329.x)
  を参考にしています。
- 軽微・重大の区別と継続的な修復は、能力型と誠実性型の信頼違反を区別した
  [Kim らの研究](https://doi.org/10.1037/0021-9010.89.1.104)を参考にしています。
- バケット内の飽和は Zajonc の
  [単純接触研究](https://doi.org/10.1037/h0025848)を参考にし、同一セッションの
  強度を無制限に報酬せず、頻度と継続を重視します。
- 温かさの下限と再会時の回復は Levin、Walter、Murnighan の
  [休眠関係の研究](https://doi.org/10.1287/orsc.1100.0576)を参考にしています。
- 視聴者別の追跡は、バーチャル配信者への疑似社会的つながりと感情的愛着が
  参加・支援に関係する研究
  ([VTuber寄付研究](https://doi.org/10.1108/JRIM-11-2024-0512)、
  [AI VTuberファンダム研究](https://arxiv.org/abs/2509.10427))と整合します。
- CHI 2025 の
  [AIコンパニオンの有害行動分類](https://doi.org/10.1145/3706598.3713429)
  を踏まえ、**不在は絆スコアを決して傷つけず、罪悪感を誘う仕組みを入れず、
  温かさの低下は透明で説明可能にする**ことを強い倫理制約とします。

一般に広まった「Gottman 5:1」はパラメーターや設計根拠に使いません。
デフォルトは明記した `negativityBias: 3` であり、社会科学上の比率を普遍則と
せず、アプリケーションごとのシーンテストで調整してください。

## 特徴

- `message`、`reaction`、`gift`、`presence`、`touch`、または独自文字列による
  汎用的な接触
- `owner` と `guest` の安定した役割
- ポイント、ルール、クールダウン、バケット内上限、しきい値の設定
- 符号付き絆スコア、ステージのヒステリシス、温かさ、傷、継続ストリーク
- 構造化スナップショットと、英語・日本語・独自テンプレートの LLM 文脈
- 下流システムで使える `0..1` の関係値
- ブラウザストレージまたは注入したアダプターによる任意の永続化
- ランタイム依存ゼロ、接触元固有のユーザー ID 解析なし
- テストやシミュレーション向けの差し替え可能な時計

## インストール

```bash
npm install @aituber-onair/kizuna
```

## クイックスタート

```typescript
import {
  KizunaManager,
  createDefaultKizunaConfig,
} from '@aituber-onair/kizuna';

const config = createDefaultKizunaConfig();
const kizuna = new KizunaManager(config, undefined, 'my-character-bond');

await kizuna.processInteraction({
  userId: 'person-42',
  kind: 'message',
  message: 'おはよう！',
  emotion: 'curious',
  isOwner: false,
  timestamp: Date.now(),
  metadata: { displayName: 'Aki' },
});

const snapshot = kizuna.getBondSnapshot('person-42');
const context = kizuna.getBondContext('person-42', { language: 'ja' });

console.log(snapshot?.stage); // stranger
console.log(context); // Akiとの絆: stranger ...

kizuna.destroy();
```

`processInteraction()` はマネージャーを遅延初期化します。永続ストレージを使う
場合は、保存済みデータを先に読み込むため、状態を読む前に
`await kizuna.initialize()` を呼んでください。インメモリで使う場合も、空でない
ストレージキーが必要です。

終了時またはアンマウント時には `destroy()` を呼び、自動クリーンアップ用タイマーと
イベントリスナーを解放してください。

## 絆を設定する

将来追加される任意項目にも安全なデフォルトを適用できるよう、
`createDefaultKizunaConfig()` から始め、キャラクターに必要な箇所だけを
上書きします。

```typescript
const config = createDefaultKizunaConfig();

config.basePoints = {
  message: 10,
  reaction: 4,
  gift: 80,
  presence: 2,
  touch: 6,
};

config.stages = [
  { id: 'stranger', minPoints: 0 },
  { id: 'acquaintance', minPoints: 100 },
  { id: 'regular', minPoints: 500 },
  { id: 'companion', minPoints: 1_000 },
];

config.warmth = {
  halfLifeMs: 7 * 24 * 60 * 60 * 1_000,
  floor: 0.2,
};

config.continuity = {
  unit: 'day',
  grace: 1,
};

config.dynamics = {
  preset: 'human',
};
```

最上位ステージのしきい値は、`toRelationshipCapital()` の正規化基準にも
使われます。返り値は、正規化したポイントに現在の温かさを掛けた値です。

### ポイントルール

ルールは接触種別の基本ポイントへ加算されます。`cooldown` は時間、
`bucketLimit` は設定した継続バケット内での適用回数を制限します。

```typescript
config.rules = [
  {
    id: 'thoughtful-message',
    name: 'Thoughtful message',
    condition: (interaction) =>
      interaction.kind === 'message' &&
      (interaction.message?.length ?? 0) >= 80,
    points: 5,
    cooldown: 60_000,
    bucketLimit: 3,
    description: 'Recognizes a longer message without rewarding spam.',
  },
];
```

ルールのポイントは、接触と現在のユーザーを受け取る関数にもできます。
`valence` と `severity` もルールで指定でき、接触側の明示値が優先されます。
不正な数値は無視されます。絆スコアは増減しますが0未満にはならず、
`stats.totalPointsEarned` は正の増加だけを数えます。

### しきい値アクションと実績

```typescript
config.thresholds = [
  {
    id: 'trusted-companion',
    points: 1_000,
    repeatable: false,
    action: {
      type: 'achievement',
      data: {
        id: 'trusted-companion',
        title: '信頼できる相棒',
        description: '長く続く絆を築きました。',
        icon: '✨',
      },
    },
  },
];
```

可能な限り、しきい値には明示的な `id` を付けてください。表示文言を変えても、
一度きりのしきい値判定を安定して保てます。

### セッション単位の継続

1回の訪問を自然な単位として扱う場合は、セッションバケットを使います。

```typescript
config.continuity = { unit: 'session', grace: 0 };

const kizuna = new KizunaManager(config, undefined, 'session-bond');

await kizuna.beginSession('visit-1');
await kizuna.processInteraction({
  userId: 'person-42',
  kind: 'presence',
  isOwner: false,
  timestamp: Date.now(),
});
kizuna.endSession();
```

`unit` には `day`、`week`、`session`、または安全な整数のバケット番号を返す
関数を指定できます。

## 出力を使う

### 構造化された状態

```typescript
const snapshot = kizuna.getBondSnapshot('person-42');

if (snapshot) {
  console.log(snapshot.stage);
  console.log(snapshot.points);
  console.log(snapshot.warmth);
  console.log(snapshot.continuity.streak);
  console.log(snapshot.favoriteEmotions);
  console.log(snapshot.achievements);
}
```

### LLM コンテキスト

```typescript
const context = kizuna.getBondContext('person-42', {
  language: 'ja',
  maxFavoriteEmotions: 2,
});
```

`config.context.templates` には独自テンプレートを設定できます。テンプレートは
完全な `BondSnapshot` を受け取ります。

### 関係値

```typescript
const relationshipCapital = kizuna.toRelationshipCapital('person-42');
```

Kizuna に豊かな状態を残したまま、別システムへ単一の範囲値を渡したい場合に
使えます。

## 統合パターン

### Core のシステムプロンプトを更新する

```typescript
await kizuna.processInteraction(interaction);

const bondContext = kizuna.getBondContext(interaction.userId, {
  language: 'ja',
});
core.updateChatOptions({
  systemPrompt: `${baseSystemPrompt}\n\n現在の絆コンテキスト:\n${bondContext}`,
});

await core.processChat(interaction.message ?? '');
```

Core の `react-pngtuber-app` サンプルにはこの統合があり、否定的な関係変化を
含め、アシスタント応答イベントの感情も記録します。

### Noise の関係性ゲートを制御する

```typescript
const result = await noise.contaminate({
  systemPrompt,
  messages,
  draft,
  relationshipCapital: kizuna.toRelationshipCapital(interaction.userId),
});
```

Noise のセッションサンプルはこの橋渡しを使い、診断用の手動上書きも残して
います。

### アプリケーションのイベントを対応付ける

接触元固有の情報は `metadata` に残し、汎用的な接触種別へ対応付けます。
たとえば、会話文は `message`、絵文字は `reaction`、`gift` はアイテム購入や
スーパーチャットを表せます。Kizuna 自身は接触元固有の ID を解析・生成しません。

## 永続化

ブラウザでは `LocalStorageProvider` を使えます。ほかのランタイムでは、
`ExternalStorageAdapter` を `ExternalStorageProvider` へ注入できます。

```typescript
import {
  KizunaManager,
  LocalStorageProvider,
  createDefaultKizunaConfig,
} from '@aituber-onair/kizuna';

const storage = new LocalStorageProvider();
const kizuna = new KizunaManager(
  createDefaultKizunaConfig(),
  storage,
  'character:bond:v1',
);

await kizuna.initialize();
```

圧縮、暗号化、アダプター例、永続化形式、セキュリティ上の制限は
[ストレージ](./docs/storage.md)を参照してください。

## イベント

```typescript
kizuna.on('points_updated', (event) => {
  console.log(event);
});

kizuna.on('achievement_earned', (event) => {
  console.log(event);
});
```

マネージャーが現在送出するイベントは `user_created`、`points_updated`、
`level_up`、`stage_down`、`scar_created`、`scar_healed`、
`threshold_reached`、`achievement_earned`、`error` です。
`KizunaEventType` は互換性のため `user_updated` と `action_executed` も保持して
いますが、現在のマネージャーは送出しません。リスナーは `type`、`userId`、
`data`、`timestamp` を持つ `KizunaEventData` を受け取ります。

## API リファレンス

### `KizunaManager`

| メソッド | 用途 |
| --- | --- |
| `initialize()` | 保存状態を読み込み、クリーンアップを開始します。 |
| `processInteraction(interaction)` | 接触を記録し、ポイントと絆を更新して保存します。 |
| `getBondSnapshot(userId)` | 構造化された絆、または `null` を返します。 |
| `getBondContext(userId, options?)` | プロンプト向け文脈、または空文字列を返します。 |
| `toRelationshipCapital(userId)` | 温かさを反映した `0..1` の値を返します。 |
| `beginSession(id?)` / `endSession()` | セッション継続バケットを管理します。 |
| `getUser(userId)` / `getAllUsers()` | ユーザー情報を読みます。 |
| `addPoints(userId, points)` | 既存ユーザーへ符号付きの増減を適用し、0を下限にします。 |
| `calculateLevel(points)` | 現在の設定からレベルを求めます。 |
| `getStats()` | 人数やポイント合計を返します。 |
| `destroy()` | クリーンアップを止め、リスナーを解除します。 |

### 主な型とヘルパー

- `Interaction`、`InteractionKind`、`InteractionValence`、
  `NegativeSeverity`、`UserRole`、`KizunaUser`、`PointRule`、
  `PointResult`、`Threshold`、`Achievement`
- `KizunaConfig`、`BondStage`、`WarmthConfig`、`ContinuityConfig`、
  `BondDynamicsConfig`、`BondDynamicsPreset`
- `BondSnapshot`、`BondContextOptions`、`BondContextTemplate`
- `createDefaultKizunaConfig()`、`DEFAULT_BOND_STAGES`
- `BondEvaluator`、`BondContextBuilder`、`PointCalculator`、`UserManager`
- `LocalStorageProvider`、`ExternalStorageProvider`、
  `createStorageProvider()`、`createDefaultStorageProvider()`
- `detectEnvironment()`、`isBrowser()`、`isNode()`

`PointContext` と `UserType` は非推奨の別名として残ります。新しいコードでは
`Interaction` と `UserRole` を使ってください。

## 0.0.3 への移行

0.0.3 では、接触元固有の interaction と user の形を、汎用的な絆モデルへ
置き換えます。

```typescript
// Before
await kizuna.processInteraction({
  userId: 'person-42',
  platform: 'chat',
  message: 'こんにちは',
  isOwner: false,
  timestamp: Date.now(),
});

// 0.0.3
await kizuna.processInteraction({
  userId: 'person-42',
  kind: 'message',
  message: 'こんにちは',
  isOwner: false,
  timestamp: Date.now(),
  metadata: { source: 'chat' },
});
```

設定は `platforms` と `customRules` ではなく `basePoints` と `rules` を使います。
`KizunaUser.type` は `role` に変わり、メッセージ数は汎用的な接触・継続の統計へ
変わります。`PointRule.dailyLimit` は `bucketLimit` に変わります。公開されていた
`ChatType` と `PlatformPointConfig` は削除されたため、`InteractionKind` と
`KizunaConfig.basePoints` を使ってください。`generateUserId()` と
`parseUserId()` も削除され、アプリケーションが不透明なユーザー ID と接触元の
対応を管理します。

`UserManager` または `PointCalculator` を直接使っている場合は、コンストラクターと
メソッドの変更も CHANGELOG で確認してください。統合には引き続き
`KizunaManager` の利用を推奨します。

破壊的変更の一覧は [CHANGELOG.md](./CHANGELOG.md) を参照してください。

## ブラウザラボ

リポジトリを checkout した環境では、成長、不和、仲直り、ステージ、温かさ、傷、
コンテキスト出力、時間経過を試せる対話型サンプルを起動できます。

```bash
npm -w @aituber-onair/kizuna run example:kizuna-sample
```

## 開発

```bash
npm -w @aituber-onair/kizuna run fmt
npm -w @aituber-onair/kizuna run lint
npm -w @aituber-onair/kizuna run test
npm -w @aituber-onair/kizuna run build
```

テストでは、絆評価、ポイント計算、永続化、環境判定、ストレージファクトリー、
出力アダプター、マネージャーのライフサイクルを確認しています。すべての統合や
独自設定を網羅する保証ではありません。

## ライセンス

MIT
