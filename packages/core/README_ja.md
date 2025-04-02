# AITuber OnAir Core

![AITuber OnAir Core - logo](./images/aituber-onair-core.png)

[AITuber OnAir Core](https://www.npmjs.com/package/@aituber-onair/core)は、AITuber配信のためのWebサービスである [AITuber OnAir](https://aituberonair.com) で機能提供を行うために開発されたTypeScript製のライブラリです。

[Click here for the English README](./README.md)

[AITuber OnAir](https://aituberonair.com) で機能提供を行なうのが目的ですが、こちらのプロジェクトはオープンソースとして公開されており、MITライセンスの [npmパッケージ](https://www.npmjs.com/package/@aituber-onair/core) として利用が可能です。

テキスト入力や画像入力から応答テキストと音声を生成する機能に特化し、アプリケーションの他の部分（ストレージ、YouTube連携、アバター制御など）と簡単に統合できるように設計されています。

## 目次

- [概要](#概要)
- [インストール方法](#インストール方法)
- [主な機能](#主な機能)
- [基本的な使用方法](#基本的な使用方法)
- [アーキテクチャ](#アーキテクチャ)
- [主要コンポーネント](#主要コンポーネント)
- [イベントシステム](#イベントシステム)
- [音声エンジン対応](#音声エンジン対応)
- [AIプロバイダーシステム](#AIプロバイダーシステム)
- [メモリと永続化](#メモリと永続化)
- [応用例](#応用例)
- [既存アプリケーションとの統合](#既存アプリケーションとの統合)
- [テストと開発](#テストと開発)

## 概要

AITuberOnAirCoreは、AIチューバーの中心的な機能を提供するモジュールで、AITuber OnAirアプリケーションの核となる部分です。複雑なAI応答生成、会話文脈の管理、音声合成などの機能をカプセル化し、シンプルなAPIで利用できるようにしています。

## インストール方法

npmを使用してインストールする場合：

```bash
npm install @aituber-onair/core
```

yarnを使用してインストールする場合：

```bash
yarn add @aituber-onair/core
```

pnpmを使用してインストールする場合：

```bash
pnpm install @aituber-onair/core
```

## 主な機能

- **テキスト入力からのAI応答生成**：ユーザーのテキスト入力に対して、OpenAI GPTモデルを使用して自然な応答を生成
- **画像（Vision）入力からのAI応答生成**：配信画面のキャプチャなどの画像に対して、AIが認識した内容に基づく応答を生成
- **会話の文脈維持と記憶機能**：短期・中期・長期の記憶システムによる長時間の会話の文脈維持
- **テキストから音声への変換**：複数の音声エンジン（VOICEVOX、VoicePeak、NijiVoice、AivisSpeech、OpenAI TTS）に対応
- **感情表現の抽出と処理**：AIの応答から感情表現を抽出し、音声合成やアバター表現に活用
- **イベント駆動型のアーキテクチャ**：処理の各段階でイベントを発行し、外部との連携を容易に
- **カスタマイズ可能なプロンプト**：Vision処理や会話要約のためのプロンプトをカスタマイズ可能
- **プラグイン可能な永続化**：メモリ機能をLocalStorage、IndexedDBなど様々な方法で永続化

## 基本的な使用方法

```typescript
import { AITuberOnAirCore, AITuberOnAirCoreEvent, AITuberOnAirCoreOptions } from '@aituber-onair/core';

// 1. オプション設定
const options: AITuberOnAirCoreOptions = {
  chatProvider: 'openai', // 省略可能。省略した場合はデフォルトでOpenAIが使用されます
  apiKey: 'YOUR_API_KEY',
  chatOptions: {
    systemPrompt: 'あなたはAIチューバーです。配信者のように振る舞い、明るく親しみやすい口調で話します。',
    visionSystemPrompt: '画面に映っているものについて、配信者らしくコメントしてください。',
    visionPrompt: '配信画面を見て、状況に合ったコメントをしてください。',
    memoryNote: 'これは過去の会話の要約です。適切に参照して会話を続けてください。',
  },
  // OpenAIのデフォルトモデルはgpt-4o-mini
  // テキストチャットと画像処理で異なるモデルを指定することができます
  // model: 'o3-mini',        // テキストチャット用の軽量モデル（画像処理非対応）
  // visionModel: 'gpt-4o',   // 画像処理も可能なモデル
  memoryOptions: {
    enableSummarization: true,
    shortTermDuration: 60 * 1000, // 1分
    midTermDuration: 4 * 60 * 1000, // 4分
    longTermDuration: 9 * 60 * 1000, // 9分
    maxMessagesBeforeSummarization: 20,
    maxSummaryLength: 256,
    // カスタム要約プロンプトを指定可能
    summaryPromptTemplate: '以下の会話を{maxLength}文字以内で要約してください。重要なポイントを含めてください。'
  },
  voiceOptions: {
    engineType: 'voicevox', // 音声エンジンタイプ
    speaker: '1', // 話者ID
    apiKey: 'ENGINE_SPECIFIC_API_KEY', // 必要に応じて（NijiVoiceなど）
    onComplete: () => console.log('音声再生が完了しました'),
    // カスタムAPIエンドポイントURL（オプション）
    voicevoxApiUrl: 'http://custom-voicevox-server:50021',
    voicepeakApiUrl: 'http://custom-voicepeak-server:20202',
    aivisSpeechApiUrl: 'http://custom-aivis-server:10101',
  },
  debug: true, // デバッグ出力を有効化
};

// 2. インスタンス化
const aituber = new AITuberOnAirCore(options);

// 3. イベントリスナーの設定
aituber.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
  console.log('処理開始');
});

aituber.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (text) => {
  // ストリーミング応答を受け取り、UIに表示
  console.log(`部分応答: ${text}`);
});

aituber.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, (data) => {
  const { message, screenplay, rawText } = data;
  console.log(`完全な応答: ${message.content}`);
  console.log(`感情タグ付きの元のテキスト: ${rawText}`); // 例: [happy] こんにちは！
  if (screenplay.emotion) {
    console.log(`感情表現: ${screenplay.emotion}`);
  }
});

aituber.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
  // SPEECH_STARTイベントはscreenplayオブジェクトとrawTextを含む
  if (data && data.screenplay) {
    console.log(`音声再生開始: 感情 = ${data.screenplay.emotion || 'neutral'}`);
    console.log(`感情タグ付きの元のテキスト: ${data.rawText}`);
  } else {
    console.log('音声再生開始');
  }
});

aituber.on(AITuberOnAirCoreEvent.SPEECH_END, () => {
  console.log('音声再生終了');
});

aituber.on(AITuberOnAirCoreEvent.ERROR, (error) => {
  console.error('エラー発生:', error);
});

// 4. テキスト入力の処理
await aituber.processChat('こんにちは、今日の天気はどうですか？');

// 5. イベントリスナーのクリア（必要に応じて）
aituber.offAll();
```

## アーキテクチャ

AITuberOnAirCoreは以下のレイヤー構造で設計されています：

```
AITuberOnAirCore (統合層)
    ├── ChatProcessor (会話処理)
    │     └── ChatService (AI対話)
    ├── MemoryManager (記憶管理)
    │     └── Summarizer (要約)
    └── VoiceService (音声処理)
          └── VoiceEngineAdapter (音声エンジン接続)
                └── 各種音声エンジン (VOICEVOX, NijiVoice, etc.)
```

### ディレクトリ構造

ソースコードは以下のディレクトリ構造で整理されています：

```
src/
  ├── constants/             # 定数と設定
  │     ├── index.ts         # エクスポートされる定数
  │     └── prompts.ts       # デフォルトプロンプトとテンプレート
  ├── core/                  # コアコンポーネント
  │     ├── AITuberOnAirCore.ts
  │     ├── ChatProcessor.ts
  │     └── MemoryManager.ts
  ├── services/              # サービス実装
  │     ├── chat/            # チャットサービス
  │     │    ├── ChatService.ts            # 基本インターフェース
  │     │    ├── ChatServiceFactory.ts     # プロバイダー用ファクトリー
  │     │    └── providers/                # AIプロバイダー実装
  │     │         ├── ChatServiceProvider.ts  # プロバイダーインターフェース
  │     │         ├── claude/              # Claude固有
  │     │         │    ├── ClaudeChatService.ts
  │     │         │    ├── ClaudeChatServiceProvider.ts
  │     │         │    └── ClaudeSummarizer.ts
  │     │         ├── gemini/              # Gemini固有
  │     │         │    ├── GeminiChatService.ts
  │     │         │    ├── GeminiChatServiceProvider.ts
  │     │         │    └── GeminiSummarizer.ts
  │     │         └── openai/              # OpenAI固有
  │     │              ├── OpenAIChatService.ts
  │     │              ├── OpenAIChatServiceProvider.ts
  │     │              └── OpenAISummarizer.ts
  │     ├── voice/           # 音声サービス
  │     │    ├── VoiceService.ts
  │     │    ├── VoiceEngineAdapter.ts
  │     │    └── engines/    # 音声エンジン実装
  │     └── youtube/         # YouTube API連携
  │          └── YouTubeDataApiService.ts  # YouTube Data APIクライアント
  ├── types/                 # TypeScript型定義
  └── utils/                 # ユーティリティとヘルパー
       ├── screenplay.ts     # テキストと感情処理
       └── storage.ts        # ストレージユーティリティ
```

## 主要コンポーネント

### AITuberOnAirCore

全体の統合クラスで、他のコンポーネントを初期化・調整します。EventEmitterを継承し、処理の各段階でイベントを発行します。外部からは主にこのクラスのAPIを通じて機能を利用します。

主なメソッド：
- `processChat(text)` - テキスト入力の処理
- `processVisionChat(imageDataUrl, visionPrompt?)` - 画像入力の処理（オプションでカスタムプロンプトを指定可能）
- `stopSpeech()` - 音声再生の停止
- `getChatHistory()` - チャット履歴の取得
- `clearChatHistory()` - チャット履歴のクリア
- `updateVoiceService(options)` - 音声設定の更新
- `isMemoryEnabled()` - メモリ機能が有効かどうかの確認
- `offAll()` - すべてのイベントリスナーの削除

### ChatProcessor

テキスト入力をAIモデル（OpenAI GPTなど）に送信して応答を得るコンポーネントです。会話の流れを管理し、応答をストリーミング形式で取得します。感情表現の抽出も担当します。

主な特徴：
- `updateOptions(newOptions)` - 実行時にオプションを更新可能

### MemoryManager

会話の文脈を維持するためのコンポーネントです。長時間の会話では古いメッセージを要約し、短期（1分）・中期（4分）・長期（9分）の記憶として保持します。これによりAIの応答に一貫性を持たせます。

カスタム設定：
- `summaryPromptTemplate` - 要約のためのプロンプトテンプレートをカスタマイズ可能（`{maxLength}`プレースホルダーを使用）

### VoiceService

テキストから音声への変換を担当するコンポーネントです。VoiceEngineAdapterを通じて、複数の外部音声合成エンジンと連携します。

#### speakTextWithOptionsメソッド

AITuberOnAirCoreクラスは柔軟な音声再生オプションを提供する`speakTextWithOptions`メソッドを備えています:

```typescript
// 一時的に異なる音声設定で発話する例
await aituberOnairCore.speakTextWithOptions('[happy] こんにちは、視聴者の皆さん!', {
  // アニメーションの有効化/無効化
  enableAnimation: true,
  
  // 一時的な音声設定（現在の設定を上書き）
  temporaryVoiceOptions: {
    engineType: 'voicevox',
    speaker: '8',
    apiKey: 'YOUR_API_KEY'  // 必要に応じて
  },
  
  // 再生に使用するオーディオ要素のID
  audioElementId: 'custom-audio-player'
});
```

このメソッドは以下の特徴を持っています：

1. **一時的な音声設定**: 現在の音声設定を変更せずに、一時的に異なる設定で発話できます
2. **アニメーション制御**: `enableAnimation`オプションでアバターのアニメーションを制御できます
3. **柔軟なオーディオ再生**: 特定のHTML audio要素を指定して再生できます
4. **感情情報の自動抽出**: テキストから感情表現（例：`[happy]`）を抽出し、`SPEECH_START`イベントで提供します

## イベントシステム

AITuberOnAirCoreは以下のイベントを発行します：

- `PROCESSING_START`: 処理開始時
- `PROCESSING_END`: 処理終了時
- `ASSISTANT_PARTIAL`: アシスタントの部分応答受信時（ストリーミング）
- `ASSISTANT_RESPONSE`: アシスタントの応答完了時（台本情報と感情タグ付きの元のテキストを含む）
- `SPEECH_START`: 音声再生開始時（感情表現を含むscreenplayオブジェクトと感情タグ付きの元のテキストを含む）
- `SPEECH_END`: 音声再生終了時
- `ERROR`: エラー発生時

### イベントデータの安全な取り扱い

特に`SPEECH_START`イベントのリスナーを実装する際は、データの存在チェックを行うことをお勧めします：

```typescript
// SPEECHイベントを安全に処理する例
aituber.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
  // データのnullチェックを追加
  if (!data) {
    console.log('データがありません');
    return;
  }
  
  // screenplayが存在するか確認
  const screenplay = data.screenplay;
  if (!screenplay) {
    console.log('screenplayがありません');
    return;
  }
  
  // 感情情報を安全に取得
  const emotion = screenplay.emotion || 'neutral';
  console.log(`音声再生開始: 感情 = ${emotion}`);
  
  // 感情タグ付きの元のテキストを取得
  console.log(`元のテキスト: ${data.rawText}`);
  
  // 感情情報をUIやアバターアニメーションに反映
  updateUIWithEmotion(emotion);
});
```

### 感情情報の取り扱い

Reactアプリケーションで感情情報を扱う場合、イベント発生時の状態を確実に保持するために`useRef`を活用するとよいでしょう：

```typescript
// Reactでの実装例
const [currentEmotion, setCurrentEmotion] = useState('neutral');
const emotionRef = useRef({ emotion: 'neutral', text: '' });

useEffect(() => {
  if (aituberOnairCore) {
    aituberOnairCore.on(AITuberOnAirCoreEvent.SPEECH_START, (data) => {
      if (data?.screenplay?.emotion) {
        // 状態の更新
        setCurrentEmotion(data.screenplay.emotion);
        // ref変数にも保存（即時アクセス用）
        emotionRef.current = data.screenplay;
      }
    });
  }
}, [aituberOnairCore]);

// アニメーション用コールバックなどでrefから最新の感情情報を利用
const handleAnimation = () => {
  const currentEmotion = emotionRef.current.emotion || 'neutral';
  // 感情に基づいたアニメーション処理
};
```

### ChatProcessorのイベント

内部コンポーネントであるChatProcessorは、追加のイベントを発行します：

- `chatLogUpdated`: チャットログが更新されたとき（新規メッセージ追加時や履歴クリア時）

このイベントを利用するには、ChatProcessorインスタンスに直接アクセスする必要があります：

```typescript
// ChatProcessorのchatLogUpdatedイベントを利用する例
const aituber = new AITuberOnAirCore(options);
const chatProcessor = aituber['chatProcessor']; // 内部コンポーネントにアクセス

// chatLogUpdatedイベントのリスナーを設定
chatProcessor.on('chatLogUpdated', (chatLog) => {
  console.log('チャットログが更新されました:', chatLog);
  
  // 例：UIの更新
  updateChatDisplay(chatLog);
  
  // 例：外部システムへの同期
  syncChatToExternalSystem(chatLog);
});
```

このイベントは以下のような用途で活用できます：

1. **チャットUIのリアルタイム更新**：
   - メッセージの追加やクリアをUIにリアルタイムで反映

2. **外部システムとの連携**：
   - チャットログをデータベースに保存
   - 分析サービスにデータを送信

3. **デバッグ・モニタリング**：
   - 開発中のチャットログ変更の監視
   - ログ品質のモニタリング

注意：AITuberOnAirCoreのインターフェースでは`getChatHistory()`メソッドを使ってチャットログを取得できますが、リアルタイムの更新通知を受け取るには上記の方法が必要です。

## 音声エンジン対応

AITuberOnAirCoreは以下の音声エンジンに対応しています：

- **VOICEVOX**: 日本語の高品質な音声合成エンジン
- **VoicePeak**: 感情表現が豊かな音声合成エンジン
- **NijiVoice**: AI音声合成サービス（APIキーが必要）
- **AivisSpeech**: AIを活用した音声合成
- **OpenAI TTS**: OpenAIのText-to-Speech API

音声エンジンの切り替えは`updateVoiceService`メソッドで動的に行えます：

```typescript
// 音声エンジンを切り替える例
aituber.updateVoiceService({
  engineType: 'nijivoice',
  speaker: 'some-speaker-id',
  apiKey: 'YOUR_NIJIVOICE_API_KEY'
});
```

### カスタムAPIエンドポイント

ローカルでホストされる音声エンジン（VOICEVOX、VoicePeak、AivisSpeech）については、カスタムAPIエンドポイントURLを指定することができます：

```typescript
// カスタムAPIエンドポイントの設定例
aituber.updateVoiceService({
  engineType: 'voicevox',
  speaker: '1',
  // 自己ホストまたは代替VOICEVOXサーバーのカスタムエンドポイント
  voicevoxApiUrl: 'http://custom-voicevox-server:50021'
});

// VoicePeakの例
aituber.updateVoiceService({
  engineType: 'voicepeak',
  speaker: '2',
  voicepeakApiUrl: 'http://custom-voicepeak-server:20202'
});

// AivisSpeechの例
aituber.updateVoiceService({
  engineType: 'aivisSpeech',
  speaker: '3',
  aivisSpeechApiUrl: 'http://custom-aivis-server:10101'
});
```

これは、音声エンジンを異なるポートやリモートサーバーで実行している場合に便利です。

## AIプロバイダーシステム

AITuber OnAir Coreは拡張可能なプロバイダーシステムを採用しており、様々なAI APIとの連携が可能です。
現在はOpenAI APIとGemini API、Claude APIが利用可能です。もし利用したいAPIがあればPRやメッセージをください。

### 利用可能なプロバイダー

現在、以下のAIプロバイダーが組み込まれています：

- **OpenAI**: GPT-4, GPT-4o-mini, O3-mini, o1, o1-mini, GPT-4.5(Preview)のモデルをサポート
- **Gemini**: Gemini 2.0 Flash, Gemini 2.0 Flash-Lite, Gemini 1.5 Flash, Gemini 1.5 Pro, Gemini 2.5 Pro(試験運用版)のモデルをサポート
- **Claude**: Claude 3 Haiku, Claude 3.5 Haiku, Claude 3.5 Sonnet v2, Claude 3.7 Sonnetのモデルをサポート

### プロバイダーの指定方法

`AITuberOnAirCore`のインスタンス化時に、使用するプロバイダーを指定することができます：

```typescript
const aituberCore = new AITuberOnAirCore({
  chatProvider: 'openai', // プロバイダー名を指定
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini', // 省略可能（省略時はデフォルトモデル「gpt-4o-mini」が使用されます）
  // その他のオプション...
});
```

### モデル固有の機能制限

各AIモデルは異なる機能をサポートしています。例えば：

- **GPT-4o**, **GPT-4o-mini**: テキストチャットと画像処理（Vision）の両方をサポート
- **O3-mini**: テキストチャットのみサポート（画像処理は非対応）

このため、モデル選択時には注意が必要です。サポートされていない機能を使用しようとすると、明示的なエラーが発生します。

**注意**: モデルを指定しない場合、デフォルトでは「gpt-4o-mini」が使用されます。このモデルはテキストチャットと画像処理の両方をサポートしています。

### 異なるモデルの併用

テキストチャットと画像処理で異なるモデルを使用したい場合は、`visionModel`オプションを使用できます：

```typescript
const aituberCore = new AITuberOnAirCore({
  apiKey: 'your-api-key',
  chatProvider: 'openai',
  model: 'o3-mini',       // テキストチャット用 
  visionModel: 'gpt-4o',  // 画像処理用
  // その他のオプション...
});
```

これにより、テキストチャットには軽量なモデルを使用し、画像処理が必要な場合のみ高機能なモデルを使用するといった最適化が可能になります。

注意: visionModelを指定する際は、Vision機能をサポートするモデルを選択してください。サポートされていないモデルが指定された場合、初期化時にエラーが発生します。

### 利用可能なプロバイダーとモデルの取得

プログラム内で利用可能なプロバイダーとモデルを取得することができます：

```typescript
// 利用可能なすべてのプロバイダーを取得
const providers = AITuberOnAirCore.getAvailableProviders();

// 特定のプロバイダーでサポートされているモデルを取得
const models = AITuberOnAirCore.getSupportedModels('openai');
```

### カスタムプロバイダーの作成

新しいAIプロバイダーを追加するには、`ChatServiceProvider`インターフェースを実装したクラスを作成し、`ChatServiceFactory`に登録します：

```typescript
import { ChatServiceFactory } from 'aituber-onair-core';
import { MyCustomProvider } from './MyCustomProvider';

// カスタムプロバイダーを登録
ChatServiceFactory.registerProvider(new MyCustomProvider());

// 登録したプロバイダーを使用
const aituberCore = new AITuberOnAirCore({
  chatProvider: 'myCustomProvider',
  apiKey: 'your-api-key',
  // その他のオプション...
});
```

## メモリと永続化

AITuberOnAirCoreには、長時間の会話文脈を維持するためのメモリ機能が組み込まれています。このメモリ機能を使うことで、AIはユーザとの会話履歴を要約して記憶し、一貫性のある応答を生成できます。

### メモリの種類

メモリには3つの種類があります：

1. **短期メモリ（Short-term memory）**：
   - 会話開始から**1分後**に生成
   - 直近の会話内容を詳細に記憶

2. **中期メモリ（Mid-term memory）**：
   - 会話開始から**4分後**に生成
   - 短期記憶よりやや長い時間範囲の要点を記憶

3. **長期メモリ（Long-term memory）**：
   - 会話開始から**9分後**に生成
   - 会話全体のテーマや重要な情報を記憶

これらのメモリはAIへのプロンプトに自動的に追加され、AIが過去の文脈を踏まえた回答をできるようにサポートします。

### メモリの永続化

AITuberOnAirCoreはメモリの永続化をプラグイン可能な設計にしています。これにより、アプリケーションを再起動してもAIが会話の文脈を記憶し続けることができます。

#### MemoryStorageインターフェース

永続化のための抽象インターフェースとして`MemoryStorage`が提供されています：

```typescript
interface MemoryStorage {
  load(): Promise<MemoryRecord[]>;
  save(records: MemoryRecord[]): Promise<void>;
  clear(): Promise<void>;
}
```

#### 標準実装

標準では以下の実装が提供されています：

1. **LocalStorageMemoryStorage**：
   - WebブラウザのLocalStorageを使用した永続化
   - 容量制限はありますが、簡易的な用途に最適

2. **IndexedDBMemoryStorage** (開発予定)：
   - WebブラウザのIndexedDBを使用した永続化
   - より大きな容量と複雑なデータ構造をサポート

#### 独自のストレージ実装

独自のストレージ実装を作成するには、`MemoryStorage`インターフェースを実装するだけです：

```typescript
class CustomMemoryStorage implements MemoryStorage {
  async load(): Promise<MemoryRecord[]> {
    // カスタムストレージからメモリレコードを読み込む
    return customStorage.getItems();
  }
  
  async save(records: MemoryRecord[]): Promise<void> {
    // カスタムストレージにメモリレコードを保存
    await customStorage.setItems(records);
  }
  
  async clear(): Promise<void> {
    // カスタムストレージのメモリレコードをクリア
    await customStorage.clear();
  }
}
```

### メモリ機能の設定

メモリ機能を有効化して永続化を設定するには、AITuberOnAirCoreの初期化時に以下のオプションを指定します：

```typescript
import { AITuberOnAirCore } from './lib/aituber-onair-core';
import { createMemoryStorage } from './lib/aituber-onair-core/utils/storage';

// メモリストレージの作成（LocalStorage使用）
const memoryStorage = createMemoryStorage('myapp.aiMemoryRecords');

// AITuberOnAirCoreの初期化
const aiTuber = new AITuberOnAirCore({
  // 他のオプション...
  
  // メモリオプション
  memoryOptions: {
    enableSummarization: true,
    shortTermDuration: 60 * 1000, // 1分（ミリ秒）
    midTermDuration: 4 * 60 * 1000, // 4分
    longTermDuration: 9 * 60 * 1000, // 9分
    maxMessagesBeforeSummarization: 20, // 要約前の最大メッセージ数
    maxSummaryLength: 256, // 要約の最大文字数
    memoryRetentionPeriod: 60 * 60 * 1000, // メモリの保持期間（1時間）
  },
  
  // 永続化ストレージ
  memoryStorage: memoryStorage,
});
```

### メモリ関連のイベント

メモリ機能には以下のイベントが発生します：

- `memoriesLoaded`：ストレージからメモリが読み込まれたとき
- `memoryCreated`：新しいメモリが作成されたとき
- `memoriesRemoved`：メモリが削除されたとき
- `memoriesSaved`：メモリがストレージに保存されたとき
- `storageCleared`：ストレージがクリアされたとき

これらのイベントは直接`MemoryManager`インスタンスから発行されるため、アクセスするには通常、内部コンポーネントへの参照が必要です。

### メモリのクリーンアップ

長期間使用していると、メモリレコードがストレージ容量を圧迫する可能性があります。AITuberOnAirCoreには自動的に古いメモリを削除する機能があります：

- `cleanupOldMemories`メソッドは、設定された保持期間（デフォルト1時間）より古いメモリレコードを削除します
- このメソッドはユーザー発話の処理時に自動的に呼び出されます

手動でクリーンアップを行う場合は以下のようにできます：

```typescript
// チャット履歴とメモリの両方をクリア
aiTuber.clearChatHistory();

// または、内部アクセスを使用して（非推奨）
const memoryManager = aiTuber['memoryManager'];
if (memoryManager) {
  await memoryManager.cleanupOldMemories();
}
```

## 応用例

### Vision（画像入力）の処理

```typescript
// 画像のDataURLを取得（例：カメラキャプチャなど）
const imageDataUrl = captureScreenshot();

// 基本的なVision処理（デフォルトプロンプトを使用）
await aituber.processVisionChat(imageDataUrl);

// カスタムプロンプトを指定したVision処理
await aituber.processVisionChat(
  imageDataUrl,
  '配信画面の内容を分析して、視聴者が楽しめるようなコメントをしてください。'
);
```

### 要約プロンプトのカスタマイズ

```typescript
// カスタム要約プロンプトを使用して初期化
const aiTuberCore = new AITuberOnAirCore({
  openAiKey: 'your_api_key',
  chatOptions: { /* ... */ },
  memoryOptions: {
    enableSummarization: true,
    // その他のメモリ設定
    summaryPromptTemplate: '以下の会話を{maxLength}文字以内で要約し、重要なポイントを強調してください。',
  },
});
```

### 音声再生の同期処理

```typescript
// 音声再生の完了を待機する例（handleSpeakAi関数を使用）
async function playSequentially() {
  // リスナー（視聴者）の音声再生を待機
  await handleSpeakAi(
    listenerScreenplay,
    listenerVoiceType,
    listenerSpeaker,
    openAiKey
  );
  
  console.log('リスナーの音声再生が完了しました');
  
  // AIアバターの応答処理
  await aituber.processChat(text);
}
```

## 既存アプリケーションとの統合

AITuberOnAirCoreは、既存のアプリケーションに比較的容易に統合できます。例えば：

1. アプリケーション起動時にAPIキーなどの設定があれば初期化
2. イベントリスナーを設定して処理の各段階をキャッチ
3. ユーザー入力やVision入力時に適切なメソッドを呼び出し

```typescript
// App.tsxなどでの統合例
useEffect(() => {
  // 既にAITuberOnAirCoreが初期化されている場合は、イベントリスナーを設定
  if (aituberOnairCore) {
    // 以前のリスナーをクリア
    aituberOnairCore.offAll();
    
    // 新しいリスナーを設定
    aituberOnairCore.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
      setChatProcessing(true);
      setAssistantMessage('読み込み中...');
    });

    aituberOnairCore.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (text) => {
      setAssistantMessage((prev) => {
        if (prev === '読み込み中...') return text;
        return prev + text;
      });
    });
    
    // その他のイベントリスナー...
  }
}, [aituberOnairCore]);
```

実際のアプリケーションでは、音声エンジン設定の変更時にAITuberOnAirCoreの設定も更新したり、メモリ機能の有効/無効を切り替えたりするなど、より細かい連携を行うことができます。

AITuberOnAirCoreはAITuber OnAirのコアコンポーネントとして最適化されていますが、このように独自に組み込んでAITuberアプリの開発に利用することが可能です。

## テストと開発

AITuberOnAirCoreは包括的なテストスイートを備えており、ライブラリの品質と安定性を保証します。

### テストの構造

テストは以下のディレクトリ構造で管理されています：

```
tests/
├── core/         # コアコンポーネントのテスト
├── services/     # サービス（音声、チャットなど）のテスト
├── utils/        # ユーティリティ関数のテスト
└── README.md     # テスト関連の詳細な説明
```

### テストの命名規則

- テストファイルは `.test.ts` の接尾辞を使用します（例：`AITuberOnAirCore.test.ts`）
- 各ソースファイルに対応するテストファイルが作成されるべきです

### テストの実行方法

テストはVitestを使用して実行します：

```bash
# AITuberOnAirCoreのルートディレクトリに移動
cd src/lib/aituber-onair-core

# すべてのテストを実行
npm test

# 監視モードでテストを実行（ファイル変更時に自動再実行）
npm run test:watch

# カバレッジレポート付きでテスト実行
npm run test:coverage
```

### テストの書き方

テストを書く際は以下の原則に従ってください：

1. Arrange-Act-Assertパターンを使用する
2. 外部依存関係は適切にモック化する
3. テストは独立して分離されているようにする
4. 成功ケースだけでなくエラーケースもテストする

テスト例：

```typescript
import { describe, it, expect } from 'vitest';
import { AITuberOnAirCore } from '../../core/AITuberOnAirCore';

describe('AITuberOnAirCore', () => {
  describe('constructor', () => {
    it('有効なオプションで初期化できること', () => {
      // Arrange
      const options = { /* ... */ };
      
      // Act
      const instance = new AITuberOnAirCore(options);
      
      // Assert
      expect(instance).toBeDefined();
    });
  });
});
```

### テストカバレッジの要件

以下の部分については特に高いテストカバレッジを目指しています：

- コア機能
- 公開API
- エッジケース
- エラー処理

### 開発環境のセットアップ

開発とテストには以下のツールが必要です：

1. Node.js（v20以上）
2. npm（v10以上）

```bash
# 依存関係のインストール
npm install

# テストの実行
npm test
```