# @aituber-onair/kizuna

![AITuber OnAir Kizuna - logo](./images/aituber-onair-kizuna.png)

Kizuna は、AI キャラクターとの接触の積み重ねを、キャラクターが応答に
使える「絆」へ変えるパッケージです。

最初のメッセージでは `stranger`。接触が続くと `acquaintance`、`regular`、
そして `companion` へ育ちます。しばらく離れると、履歴を消さずに温かさだけが
下がります。再び触れ合えば温かさが戻ります。`getBondContext()` は各時点の
状態を LLM 向けの短いプロンプトへ変換します。

[English README](./README.md)

## 絆の物語

デフォルト設定で得られる日本語コンテキストの例です。

```text
# 最初の接触
Akiとの絆: stranger（レベル1、1ポイント）。親密さ: 1.00、継続: 1バケット。好みの感情: curious。この関係性の深さと現在の親密さに合わせて応答してください。

# 接触を重ねる
Akiとの絆: regular（レベル3、500ポイント）。親密さ: 1.00、継続: 12バケット。好みの感情: happy, curious。この関係性の深さと現在の親密さに合わせて応答してください。

# しばらく離れる
Akiとの絆: regular（レベル3、500ポイント）。親密さ: 0.50、継続: 12バケット。好みの感情: happy, curious。この関係性の深さと現在の親密さに合わせて応答してください。

# 再び触れ合う
Akiとの絆: regular（レベル3、501ポイント）。親密さ: 1.00、継続: 1バケット。好みの感情: happy, curious。この関係性の深さと現在の親密さに合わせて応答してください。

# 長く続く相棒になる
Akiとの絆: companion（レベル4、1000ポイント）。親密さ: 1.00、継続: 20バケット。好みの感情: happy, curious。この関係性の深さと現在の親密さに合わせて応答してください。
```

ポイントは積み上がった履歴、温かさは最近の接触、継続は日・週・セッション・
独自バケットをまたぐ接触を表します。これらを分けて持つため、深い絆が一度
冷めても、初対面に戻さず再び温められます。

## 特徴

- `message`、`reaction`、`gift`、`presence`、`touch`、または独自文字列による
  汎用的な接触
- `owner` と `guest` の安定した役割
- ポイント、ルール、クールダウン、バケット内上限、しきい値の設定
- 絆ステージ、レベル、時間減衰する温かさ、継続ストリーク
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

ルールのポイントは、接触と現在のユーザーを受け取る関数にもできます。不正な
数値は無視され、合計ポイントは減りません。

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

Core の `react-basic` サンプルには、この統合を有効化できる設定があります。
アシスタント応答イベントの感情も記録します。

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
`level_up`、`threshold_reached`、`achievement_earned`、`error` です。
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
| `addPoints(userId, points)` | 既存ユーザーへ非負のポイントを追加します。 |
| `calculateLevel(points)` | 現在の設定からレベルを求めます。 |
| `getStats()` | 人数やポイント合計を返します。 |
| `destroy()` | クリーンアップを止め、リスナーを解除します。 |

### 主な型とヘルパー

- `Interaction`、`InteractionKind`、`UserRole`、`KizunaUser`、`PointRule`、
  `PointResult`、`Threshold`、`Achievement`
- `KizunaConfig`、`BondStage`、`WarmthConfig`、`ContinuityConfig`
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

リポジトリを checkout した環境では、ポイント、ステージ、温かさ、継続、実績、
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
