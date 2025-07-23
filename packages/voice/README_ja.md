# AITuber OnAir Voice

![AITuber OnAir Voice - logo](https://github.com/shinshin86/aituber-onair/raw/main/packages/voice/images/aituber-onair-voice.png)

[@aituber-onair/voice](https://www.npmjs.com/package/@aituber-onair/voice)は、複数のTTS（Text-to-Speech）エンジンをサポートする独立した音声合成ライブラリです。[AITuber OnAir](https://aituberonair.com)プロジェクトのために開発されましたが、あらゆる音声合成のニーズに対して単独で使用できます。

[Click here for the English README](https://github.com/shinshin86/aituber-onair/blob/main/packages/voice/README.md)

このプロジェクトはオープンソースソフトウェアとして公開されており、MITライセンスの[npmパッケージ](https://www.npmjs.com/package/@aituber-onair/voice)として利用可能です。

## 目次

- [概要](#概要)
- [インストール方法](#インストール方法)
- [主な機能](#主な機能)
- [基本的な使用方法](#基本的な使用方法)
- [対応TTSエンジン](#対応TTSエンジン)
- [感情表現対応の音声合成](#感情表現対応の音声合成)
- [ブラウザ互換性](#ブラウザ互換性)
- [高度な設定](#高度な設定)
- [エンジン固有の機能](#エンジン固有の機能)
- [AITuber OnAir Coreとの統合](#aituber-onair-coreとの統合)
- [APIリファレンス](#apiリファレンス)
- [使用例](#使用例)
- [テスト](#テスト)
- [貢献方法](#貢献方法)

## 概要

**@aituber-onair/voice**は、複数のTTSエンジンに対して統一されたインターフェースを提供する包括的な音声合成ライブラリです。感情表現を含む音声合成に特化しており、表現豊かなバーチャルキャラクター、AIアシスタント、インタラクティブアプリケーションの作成に最適です。

主な設計原則：
- **エンジン独立性**：コードを変更せずにTTSエンジンを切り替え可能
- **感情表現サポート**：組み込みの感情検出と合成機能
- **ブラウザ対応**：Webオーディオ再生の完全サポート
- **TypeScriptファースト**：完全な型安全性と優れたIDE支援
- **依存関係ゼロ**：最大限の互換性のための最小限の外部依存

## インストール方法

npmを使用してインストール：

```bash
npm install @aituber-onair/voice
```

yarnを使用してインストール：

```bash
yarn add @aituber-onair/voice
```

pnpmを使用してインストール：

```bash
pnpm install @aituber-onair/voice
```

## 主な機能

- **複数のTTSエンジン対応**  
  VOICEVOX、VoicePeak、OpenAI TTS、NijiVoice、MiniMax、AivisSpeech、Aivis Cloudなどに対応
- **統一インターフェース**  
  すべての対応TTSエンジンに単一のAPI
- **感情表現対応の合成**  
  `[happy]`、`[sad]`などのテキストタグから感情を自動検出して適用
- **台本変換**  
  感情タグ付きテキストを構造化された台本形式に変換
- **ブラウザオーディオサポート**  
  HTMLAudioElementを使用したWebブラウザでの直接再生
- **カスタムエンドポイント**  
  セルフホストTTSサーバーのサポート
- **言語検出**  
  多言語エンジン向けの自動言語認識
- **柔軟な設定**  
  実行時のエンジン切り替えとパラメータ更新

## 基本的な使用方法

### シンプルな音声合成

```typescript
import { VoiceService, VoiceServiceOptions } from '@aituber-onair/voice';

// 音声サービスの設定
const options: VoiceServiceOptions = {
  engineType: 'voicevox',
  speaker: '1',
  // オプション：カスタムエンドポイントを指定
  voicevoxApiUrl: 'http://localhost:50021'
};

// 音声サービスインスタンスの作成
const voiceService = new VoiceService(options);

// テキストを話す
await voiceService.speak({ text: 'こんにちは、世界！' });
```

### VoiceEngineAdapterの使用（推奨）

```typescript
import { VoiceEngineAdapter, VoiceServiceOptions } from '@aituber-onair/voice';

const options: VoiceServiceOptions = {
  engineType: 'openai',
  speaker: 'alloy',
  apiKey: 'your-openai-api-key',
  onPlay: async (audioBuffer) => {
    // カスタムオーディオ再生ハンドラー
    console.log('オーディオを再生中...');
  }
};

const voiceAdapter = new VoiceEngineAdapter(options);

// 感情を込めて話す
await voiceAdapter.speak({ 
  text: '[happy] あなたとお話しできてとても嬉しいです！' 
});
```

## 対応TTSエンジン

### VOICEVOX
複数のキャラクターボイスを備えた高品質な日本語音声合成エンジン。

```typescript
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1', // キャラクターID
  voicevoxApiUrl: 'http://localhost:50021' // オプション：カスタムエンドポイント
});
```

### VoicePeak
豊かな感情表現を持つプロフェッショナル音声合成。

```typescript
const voiceService = new VoiceService({
  engineType: 'voicepeak',
  speaker: 'f1',
  voicepeakApiUrl: 'http://localhost:20202'
});
```

### OpenAI TTS
複数の音声オプションを持つOpenAIのテキスト読み上げAPI。

```typescript
const voiceService = new VoiceService({
  engineType: 'openai',
  speaker: 'alloy',
  apiKey: 'your-openai-api-key'
});
```

### NijiVoice
AIベースの日本語音声合成サービス。

```typescript
const voiceService = new VoiceService({
  engineType: 'nijivoice',
  speaker: 'speaker-id',
  apiKey: 'your-nijivoice-api-key'
});
```

### MiniMax
HD品質で24言語をサポートする多言語TTS。

```typescript
const voiceService = new VoiceService({
  engineType: 'minimax',
  speaker: 'male-qn-qingse',
  apiKey: 'your-minimax-api-key',
  groupId: 'your-group-id', // MiniMaxでは必須
  endpoint: 'global' // または 'china'
});
```

**注意**：MiniMaxは認証にAPIキーとGroupIdの両方が必要です。GroupIdはユーザーグループ管理、使用状況追跡、課金に使用されます。

### AivisSpeech
自然な音声品質を持つAI駆動の音声合成。

```typescript
const voiceService = new VoiceService({
  engineType: 'aivisSpeech',
  speaker: '888753760',
  aivisSpeechApiUrl: 'http://localhost:10101'
});
```

### Aivis Cloud

SSML対応とストリーミング機能を備えた高品質なクラウドベースTTSサービス。

```typescript
const voiceService = new VoiceService({
  engineType: 'aivisCloud',
  speaker: 'unused', // モデルUUIDが指定されている場合は使用されません
  apiKey: 'your-aivis-cloud-api-key',
  aivisCloudModelUuid: 'a59cb814-0083-4369-8542-f51a29e72af7', // 必須
  
  // オプションの高度な設定
  aivisCloudSpeakerUuid: 'speaker-uuid', // マルチスピーカーモデル用
  aivisCloudStyleId: 0, // または aivisCloudStyleName: 'ノーマル'
  aivisCloudUseSSML: true, // SSMLタグを有効化
  aivisCloudSpeakingRate: 1.0, // 0.5-2.0
  aivisCloudEmotionalIntensity: 1.0, // 0.0-2.0
  aivisCloudOutputFormat: 'mp3', // wav, flac, mp3, aac, opus
  aivisCloudOutputSamplingRate: 44100, // Hz
});
```

**主な機能**：
- **SSML対応**: 韻律、間、エイリアス、感情の豊富なマークアップ
- **ストリーミング音声**: リアルタイム音声生成と配信
- **複数形式**: WAV、FLAC、MP3、AAC、Opus出力
- **感情制御**: きめ細かな感情強度設定
- **高品質**: プロフェッショナルグレードの音声合成

### None（サイレントモード）
音声出力なし - テストやテキストのみのシナリオに便利。

```typescript
const voiceService = new VoiceService({
  engineType: 'none'
});
```

## 感情表現対応の音声合成

ライブラリは、より表現豊かな音声のためにテキスト内の感情タグをサポートしています：

```typescript
// 感情タグは自動的に検出されて処理されます
await voiceService.speak({ 
  text: '[happy] 今日お会いできて嬉しいです！' 
});

await voiceService.speak({ 
  text: '[sad] お別れするのは寂しいです...' 
});

await voiceService.speak({ 
  text: '[angry] これは許せません！' 
});

// サポートされる感情はエンジンによって異なります
// 一般的な感情：happy、sad、angry、surprised、neutral
```

感情システムの動作：
1. テキストから感情タグを抽出
2. 感情メタデータを含む台本形式にテキストを変換
3. サポートするエンジンに感情情報を渡す
4. 感情サポートがないエンジンでは適切にフォールバック

## ブラウザ互換性

ライブラリには組み込みのブラウザオーディオ再生サポートが含まれています：

```typescript
// オプション1：デフォルトのブラウザ再生
const voiceService = new VoiceService({
  engineType: 'openai',
  speaker: 'alloy',
  apiKey: 'your-api-key'
  // オーディオはブラウザで自動的に再生されます
});

// オプション2：カスタムオーディオ処理
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1',
  onPlay: async (audioBuffer: ArrayBuffer) => {
    // カスタムオーディオ再生ロジック
    const audioContext = new AudioContext();
    const audioBufferSource = audioContext.createBufferSource();
    // ... オーディオ再生の処理
  }
});

// オプション3：HTMLオーディオ要素を指定
const voiceService = new VoiceService({
  engineType: 'nijivoice',
  speaker: 'speaker-id',
  apiKey: 'your-api-key',
  audioElementId: 'my-audio-player' // <audio>要素のID
});
```

## 高度な設定

### 動的エンジン切り替え

```typescript
const voiceAdapter = new VoiceEngineAdapter({
  engineType: 'voicevox',
  speaker: '1'
});

// 実行時に別のエンジンに切り替え
await voiceAdapter.updateOptions({
  engineType: 'openai',
  speaker: 'nova',
  apiKey: 'your-openai-api-key'
});
```

### カスタムエンドポイント

```typescript
// セルフホストまたはカスタムTTSサーバー用
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1',
  voicevoxApiUrl: 'https://my-custom-voicevox-server.com'
});
```

### エラーハンドリング

```typescript
try {
  await voiceService.speak({ text: 'こんにちは！' });
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('無効なAPIキー');
  } else if (error.message.includes('network')) {
    console.error('ネットワークエラー - 接続を確認してください');
  } else {
    console.error('TTSエラー:', error);
  }
}
```

## エンジン固有の機能

### VOICEVOXの機能
- 独自の個性を持つ複数のキャラクターボイス
- 調整可能な音声パラメータ（速度、ピッチ、イントネーション）
- プライバシーのためのローカルサーバーサポート

### OpenAI TTSの機能
- 高品質な多言語サポート
- 複数の音声パーソナリティ
- 会話型AIに最適化

### MiniMaxの機能
- 自動検出付き24言語サポート
- HD品質のオーディオ出力
- デュアルリージョンエンドポイント（global/china）
- 高度な感情合成

### NijiVoiceの機能
- 日本語特化型の音声
- キャラクターベースの音声モデル
- 感情豊かな合成

## AITuber OnAir Coreとの統合

このパッケージは独立して使用できますが、[@aituber-onair/core](https://www.npmjs.com/package/@aituber-onair/core)とシームレスに統合されます：

```typescript
import { AITuberOnAirCore } from '@aituber-onair/core';

const core = new AITuberOnAirCore({
  apiKey: 'your-openai-key',
  voiceOptions: {
    engineType: 'voicevox',
    speaker: '1',
    voicevoxApiUrl: 'http://localhost:50021'
  }
});

// 音声合成は自動的に処理されます
await core.processChat('こんにちは！');
```

## APIリファレンス

### VoiceServiceOptions

```typescript
interface VoiceServiceOptions {
  engineType: VoiceEngineType;
  speaker: string;
  apiKey?: string;
  groupId?: string; // MiniMax用
  endpoint?: 'global' | 'china'; // MiniMax用
  voicevoxApiUrl?: string;
  voicepeakApiUrl?: string;
  aivisSpeechApiUrl?: string;
  onPlay?: (audioBuffer: ArrayBuffer) => Promise<void>;
  onComplete?: () => void;
  audioElementId?: string;
}
```

### VoiceEngineメソッド

```typescript
interface VoiceEngine {
  speak(params: SpeakParams): Promise<ArrayBuffer | null>;
  isAvailable(): Promise<boolean>;
  getSpeakers?(): Promise<SpeakerInfo[]>;
  getEngineInfo(): VoiceEngineInfo;
}
```

### 台本形式

```typescript
interface Screenplay {
  emotion?: string;
  text: string;
  speechText?: string;
}
```

## 使用例

### React統合

完全な実装については[Reactの例](./examples/react-basic)を参照してください：

```typescript
import { useState } from 'react';
import { VoiceService } from '@aituber-onair/voice';

function VoiceDemo() {
  const [voiceService] = useState(
    () => new VoiceService({
      engineType: 'openai',
      speaker: 'alloy',
      apiKey: 'your-api-key'
    })
  );

  const handleSpeak = async (text: string) => {
    await voiceService.speak({ text });
  };

  return (
    <button onClick={() => handleSpeak('[happy] こんにちは！')}>
      感情を込めて話す
    </button>
  );
}
```

### Node.jsでの使用

音声パッケージは、環境の自動検出によりNode.js環境を完全にサポートするようになりました：

```typescript
import { VoiceEngineAdapter } from '@aituber-onair/voice';

const voiceService = new VoiceEngineAdapter({
  engineType: 'openai',
  speaker: 'nova',
  apiKey: process.env.OPENAI_API_KEY
});

// 利用可能なNode.jsオーディオライブラリを使用して音声が再生されます
await voiceService.speak({ text: 'Node.jsからこんにちは！' });
```

#### Node.jsでのオーディオ再生

Node.jsでオーディオを再生するには、以下のオプション依存関係のいずれかをインストールします：

```bash
# オプション1：speaker（ネイティブバインディング、高品質）
npm install speaker

# オプション2：play-sound（システムオーディオプレーヤーを使用、インストールが簡単）
npm install play-sound
```

どちらもインストールされていない場合でも、パッケージは正常に動作しますが、音声は再生されません。`onPlay`コールバックを使用してオーディオデータを処理できます：

```typescript
const voiceService = new VoiceEngineAdapter({
  engineType: 'voicevox',
  speaker: '1',
  voicevoxApiUrl: 'http://localhost:50021',
  onPlay: async (audioBuffer) => {
    // ファイルに保存またはオーディオデータを処理
    writeFileSync('output.wav', Buffer.from(audioBuffer));
  }
});
```

パッケージは環境を自動的に検出し、適切なオーディオプレーヤーを使用します：
- **ブラウザ**：HTMLAudioElementを使用
- **Node.js**：利用可能な場合はspeakerまたはplay-soundを使用、それ以外はサイレント

## テスト

テストスイートを実行：

```bash
# すべてのテストを実行
npm test

# ウォッチモードでテストを実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage
```

## 貢献方法

コントリビューションは歓迎します！お気軽にプルリクエストを送信してください。

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add some amazing feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細はLICENSEファイルを参照してください。