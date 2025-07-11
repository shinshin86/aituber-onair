# @aituber-onair/manneri

![AITuber OnAir Manneri - logo](./images/aituber-onair-manneri.png)

**Manneri** は、AIチャットボットの会話における繰り返しパターンを検出し、話題変更プロンプトを提供してより魅力的な会話を実現するシンプルなJavaScriptライブラリです。

## 特徴

- 🔍 **会話の類似度分析**: テキストの類似度を計算して繰り返しを検出
- 📊 **パターン検出**: 会話の構造的なパターンを識別
- 🎯 **キーワード分析**: 頻出語彙と話題の偏りを検出
- 💡 **自動プロンプト生成**: 話題変更のための適切なプロンプトを生成
- 🌐 **フロントエンド専用**: ブラウザ環境での軽量動作
- 🌍 **多言語対応**: 日本語・英語の組み込みサポート、カスタムプロンプトで任意の言語に対応可能
- 🎨 **カスタマイズ可能なプロンプト**: 任意の言語で介入メッセージや推奨事項を設定可能
- 🇯🇵 **日本語対応**: 日本語テキストの適切な処理（ひらがな、カタカナ、漢字）
- 💾 **柔軟な永続化**: 複数のストレージバックエンドをサポートする設定可能なデータ永続化

## インストール

```bash
npm install @aituber-onair/manneri
```

## 基本的な使用方法

```typescript
import { ManneriDetector, LocalStoragePersistenceProvider } from '@aituber-onair/manneri';

// デフォルト設定でManneriDetectorを作成
const detector = new ManneriDetector();

// メッセージ配列を定義
const messages = [
  { role: 'user', content: 'こんにちは' },
  { role: 'assistant', content: 'こんにちは！今日はどのようなご用件でしょうか？' },
  { role: 'user', content: 'こんにちは' },
  { role: 'assistant', content: 'こんにちは！何かお手伝いできることはありますか？' }
];

// マンネリ化を検出
if (detector.detectManneri(messages)) {
  console.log('会話の繰り返しが検出されました');
}

// 介入が必要かチェック（クールダウン考慮）
if (detector.shouldIntervene(messages)) {
  // 話題変更プロンプトを生成
  const prompt = detector.generateDiversificationPrompt(messages);
  console.log('提案プロンプト:', prompt.content);
}
```

## 設定オプション

```typescript
const detector = new ManneriDetector({
  similarityThreshold: 0.75,     // 類似度閾値 (0-1)
  repetitionLimit: 3,            // 繰り返し検出回数
  lookbackWindow: 10,            // 分析対象のメッセージ数
  interventionCooldown: 300000,  // 介入間隔（ミリ秒）
  minMessageLength: 10,          // 分析対象の最小文字数
  excludeKeywords: ['はい', 'いいえ'], // 除外キーワード
  enableTopicTracking: true,     // 話題追跡を有効化
  enableKeywordAnalysis: true,   // キーワード分析を有効化
  debugMode: false,              // デバッグモード
  language: 'ja',                // プロンプト言語 ('ja' | 'en' | カスタム)
  customPrompts: {               // カスタム介入プロンプト（オプション）
    ja: {
      intervention: [
        '話題を変えて、新しい内容について話しましょう。',
        '別の角度から話題を展開してみませんか？',
        '違うテーマで会話を続けてみましょう。'
      ]
    }
  }
}, {
  // オプション: 永続化プロバイダーを設定
  persistenceProvider: new LocalStoragePersistenceProvider({
    storageKey: 'my_manneri_data',
    version: '1.0.0'
  })
});
```

## AITuberOnAirCoreとの統合

```typescript
import { ManneriDetector } from '@aituber-onair/manneri';

const manneriDetector = new ManneriDetector({
  similarityThreshold: 0.8,
  repetitionLimit: 3,
  interventionCooldown: 300000
});

// AITuberOnAirCoreのイベントリスナーで統合
core.on('beforeAIRequest', (requestData) => {
  const chatHistory = core.getChatHistory();
  
  if (manneriDetector.shouldIntervene(chatHistory)) {
    const diversificationPrompt = manneriDetector.generateDiversificationPrompt(chatHistory);
    
    // システムプロンプトとして話題変更指示を追加
    requestData.messages.unshift({
      role: 'system',
      content: diversificationPrompt.content
    });
    
    console.log('話題変更プロンプトを適用:', diversificationPrompt.type);
  }
});
```

## イベント処理

```typescript
// 類似度計算イベント
detector.on('similarity_calculated', (data) => {
  console.log(`類似度: ${data.score}, 閾値: ${data.threshold}`);
});

// パターン検出イベント
detector.on('pattern_detected', (result) => {
  console.log('検出されたパターン:', result.patterns);
});

// 介入実行イベント
detector.on('intervention_triggered', (prompt) => {
  console.log('介入実行:', prompt.content);
});

// 設定更新イベント
detector.on('config_updated', (newConfig) => {
  console.log('設定更新:', newConfig);
});
```

## 詳細分析

```typescript
// 詳細な会話分析を実行
const analysis = detector.analyzeConversation(messages);

console.log('分析結果:', {
  similarity: analysis.similarity,
  topics: analysis.topics,
  patterns: analysis.patterns,
  shouldIntervene: analysis.shouldIntervene,
  reason: analysis.interventionReason
});

// 統計情報を取得
const stats = detector.getStatistics();
console.log('統計:', {
  totalInterventions: stats.totalInterventions,
  averageInterval: stats.averageInterventionInterval,
  thresholds: stats.configuredThresholds
});
```

## 多言語対応

### 言語設定

```typescript
// 英語プロンプトを使用
const detectorEn = new ManneriDetector({
  language: 'en'
});

// 日本語プロンプトを使用（デフォルト）
const detectorJa = new ManneriDetector({
  language: 'ja'
});

// 中国語対応
const detectorChinese = new ManneriDetector({
  language: 'zh',
  customPrompts: {
    zh: {
      intervention: [
        '让我们换个话题，聊些新的内容。',
        '我们来探讨一个不同的主题。',
        '要不要讨论别的事情？'
      ]
    }
  }
});

// 韓国語対応
const detectorKorean = new ManneriDetector({
  language: 'ko',
  customPrompts: {
    ko: {
      intervention: [
        '새로운 주제로 변경해 주세요.',
        '다른 이야기를 해봅시다.',
        '화제를 바꿔볼까요？'
      ]
    }
  }
});

// フランス語対応の例
const detectorFrench = new ManneriDetector({
  language: 'fr',
  customPrompts: {
    fr: {
      intervention: [
        'Changeons de sujet et parlons de quelque chose de nouveau.',
        'Explorons un sujet différent.',
        'Que diriez-vous de discuter d\'autre chose?'
      ]
    }
  }
});
```

### 組み込み言語サポート

Manneriには以下の言語のプロンプトが組み込まれています：
- **日本語** (`'ja'`) - デフォルト言語
- **英語** (`'en'`) - 完全なプロンプトカバレッジ

```typescript
import { DEFAULT_PROMPTS } from '@aituber-onair/manneri';

// 組み込み言語を確認
console.log(Object.keys(DEFAULT_PROMPTS)); // ['ja', 'en']

// 特定言語のプロンプトにアクセス
const japanesePrompts = DEFAULT_PROMPTS.ja;
console.log(japanesePrompts.intervention);
```

### 任意の言語への対応

**カスタムプロンプトを提供することで、任意の言語に対応可能**です。ライブラリは任意の言語コードを受け入れ、カスタムプロンプトを使用します：

```typescript
// スペイン語対応の例
const detectorSpanish = new ManneriDetector({
  language: 'es',
  customPrompts: {
    es: {
      intervention: [
        'Cambiemos de tema y hablemos de algo nuevo.',
        'Exploremos un tema diferente.',
        '¿Qué tal si discutimos otra cosa?'
      ]
    }
  }
});

// 既存言語の拡張
import { overridePrompts, DEFAULT_PROMPTS } from '@aituber-onair/manneri';

const multilingualPrompts = overridePrompts(DEFAULT_PROMPTS, {
  zh: { intervention: ['让我们换个话题，聊些新的内容。'] },
  ko: { intervention: ['새로운 주제로 변경해 주세요。'] },
  fr: { intervention: ['Changeons de sujet.'] },
  de: { intervention: ['Lassen Sie uns das Thema wechseln.'] },
  // 必要な言語を追加
});
```

### 言語非依存設計

ライブラリはコード変更なしで**任意の言語**で動作するように設計されています：

```typescript
// 簡単な言語切り替え
const createDetectorForLanguage = (lang: string, prompts: any) => {
  return new ManneriDetector({
    language: lang,
    customPrompts: { [lang]: prompts }
  });
};

// 同一アプリケーションで複数言語サポート
const detectors = {
  japanese: createDetectorForLanguage('ja', japanesePrompts),
  english: createDetectorForLanguage('en', englishPrompts),
  chinese: createDetectorForLanguage('zh', chinesePrompts),
  korean: createDetectorForLanguage('ko', koreanPrompts),
  arabic: createDetectorForLanguage('ar', arabicPrompts),
  // 任意の言語を追加
};

// 動的言語検出
const getUserLanguage = () => navigator.language.split('-')[0];
const userDetector = detectors[getUserLanguage()] || detectors.japanese;
```

### プロンプトユーティリティ

```typescript
import { getPromptTemplate, overridePrompts } from '@aituber-onair/manneri';

// 任意の言語の介入プロンプトを取得
const interventionPrompt = getPromptTemplate(
  myCustomPrompts, 
  'zh'
);

// 複数言語のプロンプトを上書き
const globalPrompts = overridePrompts(DEFAULT_PROMPTS, {
  zh: { intervention: ['换个话题吧'] },
  ko: { intervention: ['주제를 바꿔주세요'] },
  es: { intervention: ['Cambiemos de tema'] }
});
```

## 個別機能の使用

### 類似度分析

```typescript
import { SimilarityAnalyzer } from '@aituber-onair/manneri';

const analyzer = new SimilarityAnalyzer();
const similarity = analyzer.calculateSimilarity('こんにちは', 'こんにちは、元気ですか？');
console.log('類似度:', similarity); // 0.0 - 1.0
```

### キーワード抽出

```typescript
import { KeywordExtractor } from '@aituber-onair/manneri';

const extractor = new KeywordExtractor();
const keywords = extractor.extractKeywordsFromMessages(messages);
console.log('キーワード:', keywords);
```

### パターン検出

```typescript
import { PatternDetector } from '@aituber-onair/manneri';

const detector = new PatternDetector();
const result = detector.detectPatterns(messages);
console.log('パターン:', result.patterns);
console.log('重要度:', result.severity);
console.log('信頼度:', result.confidence);
```

## データの永続化

Manneriは設定可能なプロバイダーを通じて柔軟な永続化機能を提供します。データの保存方法とタイミングを完全に制御できます。

### ブラウザ環境（LocalStorage）

```typescript
import { ManneriDetector, LocalStoragePersistenceProvider } from '@aituber-onair/manneri';

// LocalStorage永続化を設定
const detector = new ManneriDetector({
  // ... 設定オプション
}, {
  persistenceProvider: new LocalStoragePersistenceProvider({
    storageKey: 'manneri_data',  // カスタムストレージキー
    version: '1.0.0'             // データバージョン
  })
});

// 手動での永続化制御
await detector.save();    // 現在の状態を保存
await detector.load();    // 保存された状態を読込
await detector.cleanup(); // 古いデータをクリーンアップ

// 永続化が利用可能かチェック
if (detector.hasPersistenceProvider()) {
  console.log('永続化が設定されています');
  
  // ストレージ情報を取得
  const info = detector.getPersistenceInfo();
  console.log('ストレージ情報:', info);
}

// 永続化操作のイベントハンドリング
detector.on('save_success', ({ timestamp }) => {
  console.log('データ保存成功:', new Date(timestamp));
});

detector.on('save_error', ({ error }) => {
  console.error('データ保存失敗:', error);
});

detector.on('load_success', ({ data, timestamp }) => {
  console.log('データ読込成功:', data);
});

detector.on('cleanup_completed', ({ removedItems, timestamp }) => {
  console.log(`${removedItems}個の古いアイテムをクリーンアップしました`);
});
```

### カスタム永続化プロバイダー

Node.js、Deno、またはカスタムストレージソリューション用に`PersistenceProvider`インターフェースを実装：

```typescript
import type { PersistenceProvider, StorageData } from '@aituber-onair/manneri';

// 例: データベース永続化プロバイダー
class DatabasePersistenceProvider implements PersistenceProvider {
  constructor(private dbConnection: any) {}

  async save(data: StorageData): Promise<boolean> {
    try {
      await this.dbConnection.query(
        'INSERT OR REPLACE INTO manneri_data (id, data) VALUES (?, ?)',
        [1, JSON.stringify(data)]
      );
      return true;
    } catch (error) {
      console.error('データベース保存失敗:', error);
      return false;
    }
  }

  async load(): Promise<StorageData | null> {
    try {
      const result = await this.dbConnection.query(
        'SELECT data FROM manneri_data WHERE id = ?',
        [1]
      );
      return result.length > 0 ? JSON.parse(result[0].data) : null;
    } catch (error) {
      console.error('データベース読込失敗:', error);
      return null;
    }
  }

  async clear(): Promise<boolean> {
    try {
      await this.dbConnection.query('DELETE FROM manneri_data WHERE id = ?', [1]);
      return true;
    } catch (error) {
      console.error('データベースクリア失敗:', error);
      return false;
    }
  }

  async cleanup(maxAge: number): Promise<number> {
    // ストレージのクリーンアップロジックを実装
    // 削除されたアイテム数を返す
    return 0;
  }
}

// カスタム永続化プロバイダーを使用
const detector = new ManneriDetector({
  // ... 設定
}, {
  persistenceProvider: new DatabasePersistenceProvider(dbConnection)
});
```

### 手動データ管理（永続化なし）

```typescript
// 永続化プロバイダーなしで使用
const detector = new ManneriDetector();

// カスタムストレージ用の手動エクスポート/インポート
const data = detector.exportData();
// 任意の方法でデータを保存（ファイル、データベースなど）
await myCustomStorage.save(data);

// データの復元
const restoredData = await myCustomStorage.load();
detector.importData(restoredData);

// 履歴のクリア
detector.clearHistory();
```

### 環境固有の例

```typescript
// ブラウザのみでLocalStorage使用
const browserDetector = new ManneriDetector({}, {
  persistenceProvider: new LocalStoragePersistenceProvider()
});

// Node.jsでファイルストレージ
class FilePersistenceProvider implements PersistenceProvider {
  constructor(private filePath: string) {}
  
  save(data: StorageData): boolean {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
  
  load(): StorageData | null {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  clear(): boolean {
    try {
      fs.unlinkSync(this.filePath);
      return true;
    } catch {
      return false;
    }
  }
}

const nodeDetector = new ManneriDetector({}, {
  persistenceProvider: new FilePersistenceProvider('./manneri-data.json')
});

// DenoでDeno.KV使用
class DenoKvPersistenceProvider implements PersistenceProvider {
  constructor(private kv: Deno.Kv) {}
  
  async save(data: StorageData): Promise<boolean> {
    try {
      await this.kv.set(['manneri', 'data'], data);
      return true;
    } catch {
      return false;
    }
  }
  
  async load(): Promise<StorageData | null> {
    try {
      const result = await this.kv.get(['manneri', 'data']);
      return result.value as StorageData | null;
    } catch {
      return null;
    }
  }
  
  async clear(): Promise<boolean> {
    try {
      await this.kv.delete(['manneri', 'data']);
      return true;
    } catch {
      return false;
    }
  }
}

const kv = await Deno.openKv();
const denoDetector = new ManneriDetector({}, {
  persistenceProvider: new DenoKvPersistenceProvider(kv)
});
```

## TypeScript型定義

```typescript
import type { 
  Message,
  ManneriConfig,
  AnalysisResult,
  DiversificationPrompt,
  LocalizedPrompts,
  PromptTemplates,
  SupportedLanguage,
  PersistenceProvider,
  PersistenceConfig,
  StorageData
} from '@aituber-onair/manneri';
```

## ブラウザ対応

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## パフォーマンス

- 軽量: gzip圧縮後 < 50KB
- 高速: リアルタイム分析 < 100ms
- メモリ効率: 自動キャッシュクリーンアップ

## ライセンス

MIT License

## 貢献

プルリクエストやIssueを歓迎します。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

## サポート

- GitHub Issues: https://github.com/shinshin86/aituber-onair/issues
- ドキュメント: https://github.com/shinshin86/aituber-onair/tree/main/packages/manneri

## 関連プロジェクト

- [AITuber OnAir](https://github.com/shinshin86/aituber-onair) - メインプロジェクト
- [@aituber-onair/core](https://github.com/shinshin86/aituber-onair/tree/main/packages/core) - コアライブラリ