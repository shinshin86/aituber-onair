# @aituber-onair/kizuna

![AITuber OnAir Kizuna - logo](./images/aituber-onair-kizuna.png)

AITuber OnAirでユーザーとAIキャラクターの関係性を管理するための高度な絆システム（Kizuna）です。柔軟なポイントベースのエンゲージメントシステムを提供し、カスタマイズ可能なルール、実績、しきい値を設定できます。

[English README is here](./README.md)

## 特徴

- **ポイントシステム**: ユーザーのインタラクションに基づいてポイントを付与
- **感情ベースボーナス**: AIの感情（happy、excited等）に基づく動的ポイント計算
- **プラットフォーム対応**: YouTube、Twitch、WebSocketチャット用の異なるポイントルール
- **カスタマイズ可能ルール**: 条件とクールダウンを持つ独自のポイント計算ルールを作成
- **レベルシステム**: 10段階の進行システム（レベルごと100ポイント）
- **実績システム**: 特定のポイントしきい値で実績をアンロック
- **Owner特権**: AITuber運営者向けの特別ボーナスと倍率
- **クールダウン管理**: 時間ベースと日次制限でスパムを防止
- **永続ストレージ**: 設定可能な保持ポリシーでユーザーデータを保存
- **デバッグモード**: 開発とトラブルシューティング用の詳細ログ

## インストール

```bash
npm install @aituber-onair/kizuna
```

## クイックスタート

```typescript
import { KizunaManager, LocalStorageProvider } from '@aituber-onair/kizuna';

// ストレージプロバイダーを作成
const storageProvider = new LocalStorageProvider({
  enableCompression: false,
  enableEncryption: false,
  maxStorageSize: 10 * 1024 * 1024, // 10MB
});

// 設定
const config = {
  enabled: true,
  owner: {
    initialPoints: 100,
    pointMultiplier: 2,
    dailyBonus: 10,
    specialCommands: ['reset_points', 'grant_points'],
    exclusiveAchievements: ['master_of_aituber'],
  },
  platforms: {
    youtube: {
      basePoints: {
        comment: 1,
        superChat: 20,
        membership: 5,
      },
    },
    twitch: {
      basePoints: {
        chat: 1,
        subscription: 10,
        bits: 5,
      },
    },
  },
  thresholds: [
    {
      points: 50,
      action: {
        type: 'special_response',
        data: { message: '🎉 いつもありがとう！' },
      },
      repeatable: false,
    },
  ],
  storage: {
    maxUsers: 1000,
    dataRetentionDays: 90,
    cleanupIntervalHours: 24,
  },
  dev: {
    debugMode: false,
    logLevel: 'info',
    showDebugPanel: false,
  },
  customRules: [
    {
      id: 'emotion_happy',
      name: 'Happy emotion bonus',
      condition: (context) => context.emotion === 'happy',
      points: 1,
      description: '楽しい感情表現ボーナス',
    },
  ],
};

// Kizunaシステムを初期化
const kizuna = new KizunaManager(config, storageProvider, 'your_storage_key');
await kizuna.initialize();

// ユーザーインタラクションを処理
const result = await kizuna.processInteraction({
  userId: 'youtube:user123',
  platform: 'youtube',
  message: 'こんにちは！',
  emotion: 'happy',
  isOwner: false,
  timestamp: Date.now(),
  metadata: {
    userName: 'user123',
    chatProvider: 'openai',
    chatModel: 'gpt-4',
  },
});

console.log(`ユーザーが${result.pointsAdded}ポイント獲得しました！`);
```

## 設定

### ポイントルール

柔軟な条件でカスタムポイントルールを作成：

```typescript
const customRules = [
  {
    id: 'long_message',
    name: 'Long message bonus',
    condition: (context) => context.message.length > 100,
    points: 2,
    cooldown: 60000, // 1分間のクールダウン
    description: '100文字以上のメッセージボーナス',
  },
  {
    id: 'first_daily_interaction',
    name: 'First daily interaction',
    condition: (context, user) => {
      if (!user) return true;
      const today = new Date().toDateString();
      const lastSeen = new Date(user.lastSeen).toDateString();
      return today !== lastSeen;
    },
    points: 5,
    dailyLimit: 1,
    description: 'デイリーログインボーナス',
  },
];
```

### プラットフォーム設定

プラットフォームごとに異なるポイント値を設定：

```typescript
const platforms = {
  youtube: {
    basePoints: {
      comment: 1,
      superChat: 20,
      membership: 5,
      firstComment: 3,
    },
    bonusCalculator: (context) => {
      // カスタムボーナス計算
      if (context.metadata?.superChatAmount) {
        return Math.floor(context.metadata.superChatAmount * 0.1);
      }
      return 0;
    },
  },
  twitch: {
    basePoints: {
      chat: 1,
      subscription: 10,
      bits: 5,
      raid: 15,
    },
  },
};
```

### しきい値とアクション

ユーザーが特定のポイントしきい値に達したときにトリガーされるアクションを定義：

```typescript
const thresholds = [
  {
    points: 100,
    action: {
      type: 'unlock_emotion',
      data: {
        emotion: 'special_happy',
        message: '✨ 新しい感情表現が解放されました！',
      },
    },
    repeatable: false,
  },
  {
    points: 200,
    action: {
      type: 'achievement',
      data: {
        id: 'best_friend',
        title: '親友',
        description: 'AITuberと強い絆を築きました',
        icon: '💖',
      },
    },
    repeatable: false,
  },
];
```

## ストレージ機能

`LocalStorageProvider`には、ストレージ使用量の最適化とユーザーデータ保護のための圧縮・暗号化機能が組み込まれています。

### 圧縮機能

データ圧縮により、Base64エンコーディングを使用してストレージサイズを削減：

```typescript
const storageProvider = new LocalStorageProvider({
  enableCompression: true,
  enableEncryption: false,
  maxStorageSize: 5 * 1024 * 1024,
});
```

**データ変換例:**
```json
// 元データ (250バイト)
{"userId":"youtube:user123","points":150,"level":2}

// 圧縮後データ (Base64エンコード)
eyJ1c2VySWQiOiJ5b3V0dWJlOnVzZXIxMjMiLCJwb2ludHMiOjE1MCwibGV2ZWwiOjJ9
```

**注意:** 現在の実装はBase64エンコーディングを使用しています。より高い圧縮率が必要な場合は、`lz-string`や`pako`などのライブラリの統合を検討してください。

### 暗号化機能

XOR暗号を使用してユーザープライバシーを保護：

```typescript
const storageProvider = new LocalStorageProvider({
  enableCompression: false,
  enableEncryption: true,
  encryptionKey: 'your-secret-key-here',
  maxStorageSize: 5 * 1024 * 1024,
});
```

**暗号化データ例:**
```
// 元データ: {"points":150}
// 暗号化後: "H4sKDQkLGRseFBIeGQ=="
```

**セキュリティに関する注意:** 現在の実装は基本的なプライバシー保護のためのXOR暗号を使用しています。強固なセキュリティが必要な本番アプリケーションでは、`Web Crypto API`や`crypto-js`でのAES暗号化の使用を検討してください。

### 組み合わせ使用

最大の効率性とセキュリティのために：

```typescript
const storageProvider = new LocalStorageProvider({
  enableCompression: true,   // ストレージサイズを削減
  enableEncryption: true,    // ユーザーデータを保護
  encryptionKey: process.env.KIZUNA_ENCRYPTION_KEY || 'fallback-key',
  maxStorageSize: 5 * 1024 * 1024, // 5MB制限
});
```

**処理順序:**
1. **保存**: 元データ → 圧縮 → 暗号化 → 保存
2. **読み込み**: 取得 → 復号 → 展開 → 元データ

### パフォーマンスに関する考慮事項

- **圧縮**: 処理時間が約10-30%増加、ストレージ容量を15-40%節約
- **暗号化**: 処理時間が約5-15%増加、基本的なプライバシー保護を提供
- **組み合わせ**: 大規模なユーザーデータセットを持つ本番環境に最適

### 環境別設定

```typescript
// 開発環境
const devStorage = new LocalStorageProvider({
  enableCompression: false,  // デバッグを容易に
  enableEncryption: false,   // DevToolsで生データを確認可能
  maxStorageSize: 10 * 1024 * 1024,
});

// 本番環境
const prodStorage = new LocalStorageProvider({
  enableCompression: true,   // ストレージを最適化
  enableEncryption: true,    // ユーザープライバシーを保護
  encryptionKey: process.env.ENCRYPTION_KEY,
  maxStorageSize: 5 * 1024 * 1024,
});
```

## デバッグモード

開発用の詳細ログを有効化：

```typescript
const config = {
  // ... その他の設定
  dev: {
    debugMode: true, // デバッグログを有効化
    logLevel: 'debug',
    showDebugPanel: true,
  },
};
```

デバッグモードが有効な場合、以下のような詳細ログが表示されます：

```
[Kizuna] Processing interaction for youtube:user123 with emotion: happy
[PointCalculator] [canApplyRule] Checking rule: emotion_happy for emotion: happy
[PointCalculator] [canApplyRule] Rule emotion_happy condition result: true
[Kizuna] Interaction processed: 2 points added (1 rules applied)
[Kizuna] Applied rules: Happy emotion bonus
```

## イベントシステム

Kizunaイベントをリッスン：

```typescript
kizuna.on('points_updated', (eventData) => {
  console.log(`ユーザー ${eventData.userId} が ${eventData.data.pointsAdded} ポイント獲得！`);
});

kizuna.on('level_up', (eventData) => {
  console.log(`ユーザー ${eventData.userId} がレベル ${eventData.data.newLevel} にアップ！`);
});

kizuna.on('threshold_reached', (eventData) => {
  console.log(`ユーザー ${eventData.userId} がしきい値 ${eventData.data.threshold.points} に到達！`);
});
```

## API リファレンス

### KizunaManager

Kizunaシステムを管理するメインクラス。

#### メソッド

- `processInteraction(context: PointContext): Promise<PointResult>` - ユーザーインタラクションを処理してポイントを付与
- `getUser(userId: string): KizunaUser | null` - ユーザーデータを取得
- `getAllUsers(): KizunaUser[]` - 全ユーザーを取得
- `addPoints(userId: string, points: number): Promise<PointResult>` - 手動でポイントを追加
- `calculateLevel(points: number): number` - ポイントからレベルを計算
- `getStats(): Record<string, any>` - システム統計を取得

### LocalStorageProvider

ブラウザのlocalStorageを使用するストレージプロバイダー。

#### コンストラクターオプション

- `enableCompression: boolean` - データ圧縮を有効化
- `enableEncryption: boolean` - データ暗号化を有効化
- `encryptionKey?: string` - 暗号化キー（暗号化有効時）
- `maxStorageSize: number` - 最大ストレージサイズ（バイト）

## AITuber OnAirとの統合

このパッケージはAITuber OnAir専用に設計されていますが、他のAIキャラクターシステムにも適応可能です。感情ベースのポイント計算は、AITuber OnAirの感情検出システムとシームレスに統合されます。

## ライセンス

MIT

## Node.js対応

Kizunaは現在、ブラウザとNode.js両方の環境をサポートしています。実行時環境に基づいて適切なストレージプロバイダーが自動選択されます。

### 自動環境検出

```typescript
import { KizunaManager, createDefaultStorageProvider } from '@aituber-onair/kizuna';

// ブラウザではLocalStorageProvider、Node.jsではFileSystemStorageProviderを自動使用
const kizuna = new KizunaManager(config, createDefaultStorageProvider(), 'my_users');
```

### 手動ストレージプロバイダー選択

```typescript
import { 
  KizunaManager, 
  LocalStorageProvider, 
  FileSystemStorageProvider,
  createStorageProvider 
} from '@aituber-onair/kizuna';

// ブラウザ環境
const browserStorage = new LocalStorageProvider({
  enableCompression: false,
  enableEncryption: false,
  maxStorageSize: 5 * 1024 * 1024
});

// Node.js環境
const nodeStorage = new FileSystemStorageProvider({
  dataDir: './data',
  prettyJson: true,
  autoCreateDir: true
});

// またはファクトリーを使用してカスタムオプションを指定
const storage = createStorageProvider({
  browser: { enableCompression: false },
  node: { dataDir: './custom-data' }
});
```

### 環境検出ユーティリティ

```typescript
import { detectEnvironment, isBrowser, isNode } from '@aituber-onair/kizuna';

console.log(detectEnvironment()); // 'browser' または 'node'
console.log(isBrowser()); // ブラウザでtrue
console.log(isNode()); // Node.jsでtrue
```

## 将来のストレージプロバイダー（TODO）

以下のストレージプロバイダーが将来のリリースで計画されています：

### SQLiteStorageProvider
- **用途**: SQLクエリが必要な中規模アプリケーション
- **機能**: トランザクション、複雑なクエリ、高性能
- **例**: Discordボット、CLIツール

### MongoDBStorageProvider
- **用途**: 大規模アプリケーション、クラウドデプロイ
- **機能**: 柔軟なスキーマ、水平スケーリング、集約
- **例**: Webサービス、マイクロサービス

### RedisStorageProvider
- **用途**: 高性能、リアルタイムアプリケーション
- **機能**: インメモリストレージ、pub/sub、分散キャッシュ
- **例**: 高トラフィックストリーミングプラットフォーム

### CloudStorageProvider
- **用途**: サーバーレスアプリケーション、無制限ストレージ
- **機能**: AWS S3、Google Cloud Storage、Azure Blob
- **例**: 本番Webアプリケーション

**貢献**: これらのストレージプロバイダーが必要な場合は、issueを作成するかプルリクエストを提出してください！

## 開発

### テスト

パッケージには主要機能の包括的なテストカバレッジが含まれています：

```bash
# 全テストを実行
npm test

# カバレッジ付きでテストを実行
npm run test:coverage

# ウォッチモードでテストを実行（開発用）
npm run test:watch
```

### テスト構成

- **`src/tests/performance.test.ts`** - LocalStorageProviderの圧縮・暗号化パフォーマンスベンチマーク
- **`src/tests/FileSystemStorageProvider.test.ts`** - Node.jsファイルシステムストレージ機能
- **`src/tests/environmentDetector.test.ts`** - 環境検出ユーティリティ
- **`src/tests/storageFactory.test.ts`** - ストレージプロバイダーファクトリーと自動選択

### テストカバレッジ

- ✅ 全ストレージプロバイダー（LocalStorage、FileSystem）
- ✅ 環境検出と自動選択
- ✅ パフォーマンスベンチマークと測定
- ✅ エラーハンドリングとエッジケース
- ✅ 設定オプションとカスタマイズ
- ✅ 実データシナリオでの統合テスト

### ビルド

```bash
# 本番用ビルド
npm run build

# ウォッチモードでビルド（開発用）
npm run dev

# 型チェック
npm run typecheck

# リンティング
npm run lint
npm run lint:fix
```

## 貢献

貢献を歓迎します！プルリクエストをお気軽に提出してください。

### 開発環境の設定

1. リポジトリをクローン
2. 依存関係をインストール: `npm install`
3. テストを実行: `npm test`
4. ビルド: `npm run build`

### 新しいストレージプロバイダーの追加

新しいストレージプロバイダー（SQLite、MongoDB、Redisなど）を追加したい場合：

1. `src/storage/` に新しいファイルを作成
2. `StorageProvider` インターフェースを実装
3. `src/tests/` に包括的なテストを追加
4. 必要に応じてストレージファクトリーを更新
5. ドキュメントを更新

## 使用例

### 基本的な使用方法

```typescript
// ユーザーがコメントした時
const result = await kizuna.processInteraction({
  userId: 'youtube:viewer123',
  platform: 'youtube',
  message: '楽しい配信をありがとう！',
  emotion: 'happy', // AIが嬉しい感情で応答
  isOwner: false,
  timestamp: Date.now(),
});

// 結果: 基本1ポイント + happy感情ボーナス1ポイント = 2ポイント
```

### Owner（配信者）の場合

```typescript
const result = await kizuna.processInteraction({
  userId: 'owner:default',
  platform: 'chatForm',
  message: 'こんにちは視聴者の皆さん！',
  emotion: 'excited',
  isOwner: true,
  timestamp: Date.now(),
});

// 結果: (基本1ポイント + excited感情ボーナス2ポイント) × Owner倍率2 = 6ポイント
```

### 統計情報の取得

```typescript
const stats = kizuna.getStats();
console.log(`総ユーザー数: ${stats.totalUsers}`);
console.log(`総ポイント数: ${stats.totalPoints}`);
console.log(`今日のアクティブユーザー: ${stats.activeToday}`);
```

このREADMEにより、Kizunaシステムの機能と使用方法を理解して、AITuber OnAirでより魅力的なユーザーエクスペリエンスを構築できます。