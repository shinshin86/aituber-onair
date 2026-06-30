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
  VOICEVOX、VoicePeak、OpenAI TTS、xAI TTS、Unreal Speech、ElevenLabs、Inworld、Gradium、Gemini TTS、MiniMax、AivisSpeech、Aivis Cloudなどに対応
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
  voicepeakApiUrl: 'http://localhost:20202',
  voicepeakEmotion: 'happy',
  voicepeakSpeed: 140,
  voicepeakPitch: 20
});
```

単一タグの `voicepeakEmotion` は従来どおり後方互換です。重み付き
emotion map を使う場合は `vpeakserver >= v0.2.0` が必要です。

```typescript
const weightedVoiceService = new VoiceService({
  engineType: 'voicepeak',
  speaker: 'f1',
  voicepeakApiUrl: 'http://localhost:20202',
  voicepeakEmotion: { happy: 40, fun: 60 },
});
```

- `neutral` は重み付き送信時に無視されます。
- 重み `0` は無視されます。
- `{}` は「emotion を送らない」を意味し、`Talk.style` へはフォールバックしません。
- `undefined` は override なしなので、従来どおり `Talk.style` が単一タグにマップされます。

### OpenAI TTS
複数の音声オプションを持つOpenAIのテキスト読み上げAPI。

```typescript
const voiceService = new VoiceService({
  engineType: 'openai',
  speaker: 'alloy',
  apiKey: 'your-openai-api-key'
});
```

### xAI TTS
音声 ID、言語、出力形式を指定できる xAI のクラウド TTS API。

```typescript
const voiceService = new VoiceService({
  engineType: 'xai',
  speaker: 'eve',
  apiKey: 'your-xai-api-key',
  xaiLanguage: 'ja',
  xaiCodec: 'mp3',
  xaiSampleRate: 24000,
  xaiBitRate: 128000,
});
```

### Unreal Speech
Unreal Speech v8 の `/stream` エンドポイントを利用するクラウド TTS
です。音声バイト列を直接返すため、追加ダウンロードなしで
`VoiceEngineAdapter` の再生処理に渡せます。

```typescript
const voiceService = new VoiceService({
  engineType: 'unrealSpeech',
  speaker: 'af_bella',
  apiKey: 'your-unreal-speech-api-key',
  unrealSpeechBitrate: '192k',
  unrealSpeechSpeed: 0,
  unrealSpeechPitch: 1,
  unrealSpeechCodec: 'libmp3lame',
  unrealSpeechTemperature: 0.25,
});
```

既定の `https://api.v8.unrealspeech.com/stream` 以外を使う場合は
`unrealSpeechApiUrl` で上書きできます。

### ElevenLabs
ElevenLabs Text to Speech API を SDK なしの直接 `fetch` で利用する
クラウド TTS です。

```typescript
const voiceService = new VoiceService({
  engineType: 'elevenLabs',
  speaker: 'JBFqnCBsd6RMkjVDRZzb',
  apiKey: 'your-elevenlabs-api-key',
  elevenLabsModel: 'eleven_multilingual_v2',
  elevenLabsOutputFormat: 'mp3_44100_128',
  elevenLabsStability: 0.5,
  elevenLabsSimilarityBoost: 0.75,
  elevenLabsUseSpeakerBoost: true,
});
```

既定の `https://api.elevenlabs.io/v1/text-to-speech` 以外を使う場合は
`elevenLabsApiUrl` で上書きできます。`speaker` は ElevenLabs の
`voice_id` として送信されます。

### Inworld
Inworld TTS の非ストリーミング音声合成を、SDK なしの直接 `fetch` で
利用するクラウド TTS です。このエンジンは REST エンドポイントのみを
使用し、WebSocket や HTTP ストリーミングは実装していません。

```typescript
const voiceService = new VoiceService({
  engineType: 'inworld',
  speaker: 'Ashley',
  apiKey: process.env.INWORLD_API_KEY,
  inworldModel: 'inworld-tts-2',
  inworldAudioEncoding: 'MP3',
  inworldSampleRateHertz: 48000,
});
```

既定の `https://api.inworld.ai/tts/v1/voice` 以外を使う場合は
`inworldApiUrl` で上書きできます。`apiKey` には Inworld の Basic
Base64 認証値を指定します。Basic 認証情報をブラウザ側コードへ露出しないで
ください。ブラウザアプリではバックエンドプロキシまたは Inworld の JWT 認証を
使用してください。

Inworld の On-Demand は無料で開始でき、開発用途に適しています。コストを
抑える場合は TTS 1.5 Mini、品質を優先する場合は TTS-2 または 1.5 Max の
利用が推奨されます。

### Gradium
Gradium の one-shot REST TTS を SDK なしの直接 `fetch` で利用する
クラウド TTS です。raw audio response mode（`only_audio: true`）を
使用します。

```typescript
const voiceService = new VoiceService({
  engineType: 'gradium',
  speaker: 'YTpq7expH9539ERJ',
  apiKey: process.env.GRADIUM_API_KEY,
  gradiumOutputFormat: 'wav',
  gradiumTemperature: 0.7,
  gradiumVoiceSimilarity: 2,
  gradiumPaddingBonus: 0,
  gradiumRewriteRules: 'en',
});
```

既定の `https://api.gradium.ai/api/post/speech/tts` 以外を使う場合は
`gradiumApiUrl` で上書きできます。`speaker` は Gradium の `voice_id`
として送信されます。React デモでは Gradium の flagship voice プリセットを
fallback として表示し、API キーがある場合は `getVoiceEngineVoiceList()`
経由で Gradium の voice list 取得を試せます。Gradium API がブラウザからの
直接 CORS アクセスを許可していない場合は失敗するため、production の
browser UI で動的な Gradium voice 選択を行う場合は backend proxy を
使用してください。

### OpenAI互換 TTS
Kokoro FastAPI などの OpenAI 互換エンドポイントを利用するための TTS プロバイダーです。

```typescript
const voiceService = new VoiceService({
  engineType: 'openaiCompatible',
  openAiCompatibleApiUrl: 'http://localhost:8880/v1/audio/speech',
  openAiCompatibleModel: 'your-model-id'
});
```

`speaker` は省略可能です。未指定の場合、リクエストボディに `voice`
フィールドは含まれません。
`openAiCompatibleModel` は、接続先エンドポイントが受け付けるモデル名を
明示的に指定してください。

### MiniMax
HD品質で24言語をサポートする多言語TTS。

```typescript
const voiceService = new VoiceService({
  engineType: 'minimax',
  speaker: 'Japanese_IntellectualSenior',
  apiKey: 'your-minimax-api-key',
  groupId: 'your-group-id', // MiniMaxでは必須
  endpoint: 'global' // または 'china'
});
```

**注意**：MiniMaxは認証にAPIキーとGroupIdの両方が必要です。GroupIdはユーザーグループ管理、使用状況追跡、課金に使用されます。

`speaker` には `Japanese_IntellectualSenior` などの MiniMax system voice ID
を指定してください。MiniMax は公式の
[System Voice ID List](https://platform.minimax.io/docs/faq/system-voice-id)
でこれらの ID を公開しています。リンクされている動的な Get Voice API は
現在利用できないため、`getVoiceEngineVoiceList()` では MiniMax の
voice list 取得を扱っていません。

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

Aivis Cloud の model search API（例:
`GET https://api.aivis-project.com/v1/aivm-models/search`）は、
現在 `getVoiceEngineVoiceList()` では扱っていません。ブラウザから直接
model/list 系 endpoint を呼び出すと CORS で失敗する場合があります。公式の
Aivis Cloud API ドキュメントでは、ブラウザ CORS 対応は音声合成 endpoint
について明記されています。動的に model / speaker / style を取得したい場合は、
backend proxy 経由で呼び出してください。

### Gemini TTS
`gemini-3.1-flash-tts-preview` を含む Gemini preview TTS モデルを
Gemini API 経由で利用する音声合成です。認証は API キーのみです。

```typescript
const voiceService = new VoiceService({
  engineType: 'geminiTts',
  speaker: 'Zephyr',
  apiKey: 'your-google-api-key',
  geminiTtsModel: 'gemini-3.1-flash-tts-preview',
  geminiTtsLanguageCode: 'ja-JP',
  geminiTtsPrompt: '明るく元気な声で話してください', // オプション：スタイル指示や audio-tag 指示
  geminiTtsApiUrl:
    'https://generativelanguage.googleapis.com/v1beta', // オプション：Gemini API のベース URL
});
```

**注意**：通常の Google API キーを利用します。`apiKey` は Gemini
API に `x-goog-api-key` として送信されます。利用可能なボイスには
Zephyr、Aoede、Kore、Puck、Charon など 30 種類のプリセットボイスがあります。

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
  engineType: 'voicevox',
  speaker: '1',
  voicevoxApiUrl: 'http://localhost:50021',
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

// 同じエンジン内でパラメーター更新
voiceAdapter.updateOptions({
  speaker: '3',
  voicevoxSpeedScale: 1.1,
});

// 実行時に別のエンジンに切り替え
voiceAdapter.switchEngine({
  engineType: 'openai',
  speaker: 'nova',
  apiKey: 'your-openai-api-key'
});

// 後方互換:
// engineType を含む updateOptions も引き続き利用可能です
voiceAdapter.updateOptions({
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

### エンジンごとのパラメーターについて

`VoiceServiceOptions` から実行時に細かいパラメーターを上書きできます。Reactデモの新しいスライダーUIはこれらのフィールドをそのまま利用しているため、コードでもUIでも同じ値を扱えます。

```typescript
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1',
  openAiSpeed: 1.1,
  openAiCompatibleModel: 'your-model-id',
  openAiCompatibleSpeed: 1.1,
  unrealSpeechBitrate: '192k',
  unrealSpeechSpeed: 0,
  unrealSpeechPitch: 1,
  elevenLabsModel: 'eleven_multilingual_v2',
  elevenLabsStability: 0.5,
  elevenLabsSimilarityBoost: 0.75,
  inworldModel: 'inworld-tts-2',
  inworldAudioEncoding: 'MP3',
  inworldSampleRateHertz: 48000,
  gradiumOutputFormat: 'wav',
  gradiumTemperature: 0.7,
  gradiumVoiceSimilarity: 2,
  voicevoxSpeedScale: 1.05,
  voicevoxPitchScale: 0.02,
  voicevoxQueryParameters: {
    pauseLength: 0.25,
    outputSamplingRate: 44100,
  },
  minimaxVoiceSettings: { speed: 1.05, vol: 1.1, pitch: 2 },
  minimaxAudioSettings: { sampleRate: 44100, format: 'mp3' },
  aivisSpeechSpeedScale: 1.05,
  aivisCloudSpeakingRate: 1.1,
  aivisCloudVolume: 1.05,
});
```

ヒント: `packages/voice/examples/react-basic` の React デモでは、折りたたみカードとスライダーで同じ項目を調整してからコードに反映できます。

> `VoiceServiceOptions` 本体の型定義は [API リファレンス](#voiceserviceoptions) 内にまとめています。以下はその主要項目をエンジン別に整理した早見表です。

#### エンジン別パラメーター一覧

- **OpenAI TTS**
  - `openAiModel`
  - `openAiSpeed`

- **OpenAI互換 TTS**
  - エンドポイント: `openAiCompatibleApiUrl`
  - 任意の voice: `speaker`
  - `openAiCompatibleModel`
  - `openAiCompatibleSpeed`

- **xAI TTS**
  - `xaiLanguage`
  - `xaiCodec`
  - `xaiSampleRate`
  - `xaiBitRate`

- **Unreal Speech**
  - エンドポイント: `unrealSpeechApiUrl`
  - 出力: `unrealSpeechBitrate`, `unrealSpeechCodec`
  - 音声調整: `unrealSpeechSpeed`, `unrealSpeechPitch`, `unrealSpeechTemperature`

- **ElevenLabs**
  - エンドポイント: `elevenLabsApiUrl`
  - 識別子・出力: `speaker`, `elevenLabsModel`, `elevenLabsOutputFormat`, `elevenLabsLanguageCode`
  - 音声設定: `elevenLabsVoiceSettings`, `elevenLabsStability`, `elevenLabsSimilarityBoost`, `elevenLabsStyle`, `elevenLabsUseSpeakerBoost`, `elevenLabsSpeed`
  - 文脈・正規化: `elevenLabsSeed`, `elevenLabsPreviousText`, `elevenLabsNextText`, `elevenLabsApplyTextNormalization`, `elevenLabsApplyLanguageTextNormalization`, `elevenLabsEnableLogging`

- **Inworld**
  - エンドポイント: `inworldApiUrl`
  - 識別子・出力: `speaker`, `inworldModel`, `inworldAudioEncoding`, `inworldSampleRateHertz`, `inworldBitRate`
  - 音声調整: `inworldSpeakingRate`, `inworldLanguage`, `inworldDeliveryMode`, `inworldTemperature`

- **Gradium**
  - エンドポイント: `gradiumApiUrl`
  - 識別子・出力: `speaker`, `gradiumOutputFormat`
  - 音声調整: `gradiumTemperature`, `gradiumVoiceSimilarity`, `gradiumPaddingBonus`, `gradiumRewriteRules`

- **VOICEVOX**
  - エンドポイント: `voicevoxApiUrl`
  - スカラー: `voicevoxSpeedScale`, `voicevoxPitchScale`, `voicevoxIntonationScale`, `voicevoxVolumeScale`
  - タイミング: `voicevoxPrePhonemeLength`, `voicevoxPostPhonemeLength`, `voicevoxPauseLength`, `voicevoxPauseLengthScale`
  - 出力: `voicevoxOutputSamplingRate`, `voicevoxOutputStereo`
  - フラグ: `voicevoxEnableKatakanaEnglish`, `voicevoxEnableInterrogativeUpspeak`
  - バージョン: `voicevoxCoreVersion`
  - 低レベル上書き: `voicevoxQueryParameters`

- **AivisSpeech**
  - エンドポイント: `aivisSpeechApiUrl`
  - スカラー: `aivisSpeechSpeedScale`, `aivisSpeechPitchScale`, `aivisSpeechIntonationScale`, `aivisSpeechTempoDynamicsScale`, `aivisSpeechVolumeScale`
  - タイミング: `aivisSpeechPrePhonemeLength`, `aivisSpeechPostPhonemeLength`, `aivisSpeechPauseLength`, `aivisSpeechPauseLengthScale`
  - 出力: `aivisSpeechOutputSamplingRate`, `aivisSpeechOutputStereo`
  - 低レベル上書き: `aivisSpeechQueryParameters`

- **Aivis Cloud**
  - 識別子: `aivisCloudModelUuid`, `aivisCloudSpeakerUuid`, `aivisCloudStyleId`, `aivisCloudStyleName`, `aivisCloudUserDictionaryUuid`
  - 設定: `aivisCloudUseSSML`, `aivisCloudLanguage`, `aivisCloudSpeakingRate`, `aivisCloudEmotionalIntensity`, `aivisCloudTempoDynamics`, `aivisCloudPitch`, `aivisCloudVolume`
  - 無音: `aivisCloudLeadingSilence`, `aivisCloudTrailingSilence`, `aivisCloudLineBreakSilence`
  - 出力: `aivisCloudOutputFormat`, `aivisCloudOutputBitrate`, `aivisCloudOutputSamplingRate`, `aivisCloudOutputChannels`
  - ログ: `aivisCloudEnableBillingLogs`

- **VoicePeak**
  - エンドポイント: `voicepeakApiUrl`
  - 感情: `voicepeakEmotion`（単一タグまたは重み付き map）
  - スカラー: `voicepeakSpeed`, `voicepeakPitch`

- **MiniMax**
  - 識別子: `groupId`, `endpoint`, `minimaxModel`, `minimaxLanguageBoost`
  - 音声: `minimaxVoiceSettings` または `minimaxSpeed`, `minimaxVolume`, `minimaxPitch`
  - オーディオ: `minimaxAudioSettings` または `minimaxSampleRate`, `minimaxBitrate`, `minimaxAudioFormat`, `minimaxAudioChannel`

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

### xAI TTSの機能
- Bearer トークン認証のクラウド TTS エンドポイント
- 指定した `speaker` をそのまま `voice_id` として送信
- codec、sample rate、MP3 bitrate の調整に対応

### Unreal Speech の機能
- Bearer トークン認証のクラウド TTS エンドポイント
- 指定した `speaker` をそのまま `VoiceId` として送信
- bitrate、codec、speed、pitch、temperature の調整に対応
- 音声バイト列を直接返す v8 `/stream` API を使用

### ElevenLabs の機能
- `xi-api-key` 認証のクラウド TTS エンドポイント
- 指定した `speaker` をそのまま `voice_id` として送信
- model、output format、language code、voice settings の調整に対応
- 任意の text context、seed、text normalization、logging flag に対応

### Inworld の機能
- Basic 認証のクラウド TTS エンドポイント
- 指定した `speaker` をそのまま `voiceId` として送信
- model、audio encoding、sample rate、bit rate、speaking rate、language、delivery mode、temperature の調整に対応
- 非ストリーミング REST API を使用し、返却された `audioContent` をデコード

### Gradium の機能
- `x-api-key` 認証のクラウド TTS エンドポイント
- 指定した `speaker` をそのまま `voice_id` として送信
- output format と、temperature / voice similarity / speed / rewrite rules 用の `json_config` 調整に対応
- flagship voice プリセットの読みやすい音声名を Speaker セレクターに表示
- provider が直接 CORS アクセスをブロックする場合、browser app での動的な voice list 取得には backend proxy が必要

### MiniMaxの機能
- 自動検出付き24言語サポート
- HD品質のオーディオ出力
- デュアルリージョンエンドポイント（global/china）
- 高度な感情合成
- 動的な voice list 取得ではなく、公式 system voice ID を指定

### Gemini TTS の機能
- Gemini API ベースの高品質音声合成
- 30以上のボイスオプション（星・月をテーマにした名前）
- プロンプトベースのスタイル・トーン制御
- `x-goog-api-key` によるシンプルな API キー認証
- Gemini API ベース URL の切り替えに対応
- 日本語を含む24以上の言語サポート

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
type VoiceServiceOptions =
  | VoiceVoxVoiceServiceOptions
  | VoicePeakVoiceServiceOptions
  | OpenAiVoiceServiceOptions
  | XaiVoiceServiceOptions
  | UnrealSpeechVoiceServiceOptions
  | ElevenLabsVoiceServiceOptions
  | InworldVoiceServiceOptions
  | GradiumVoiceServiceOptions
  | GeminiTtsVoiceServiceOptions
  | OpenAiCompatibleVoiceServiceOptions
  | AivisSpeechVoiceServiceOptions
  | AivisCloudVoiceServiceOptions
  | MinimaxVoiceServiceOptions
  | PiperPlusVoiceServiceOptions
  | NoneVoiceServiceOptions;
```

`VoiceServiceOptions` は `engineType` を判別キーにした union 型です。  
同一エンジン内の更新は `updateOptions(...)`、エンジン切替は
`switchEngine(...)` を使用してください。
後方互換のため、`updateOptions(...)` へエンジン切替用フィールドを
渡す使い方も引き続き受け付けます。

### エンジン capabilities

```typescript
import {
  getAllVoiceEngineCapabilities,
  getVoiceEngineCapabilities,
} from '@aituber-onair/voice';

const gradium = getVoiceEngineCapabilities('gradium');
console.log(gradium.supportsVoiceList); // true

const allEngines = getAllVoiceEngineCapabilities();
```

capabilities は静的な metadata だけを返します。API キー、endpoint、ユーザー
設定、その他の機密値は含みません。

### ボイス一覧

```typescript
import { getVoiceEngineVoiceList } from '@aituber-onair/voice';

const voices = await getVoiceEngineVoiceList('elevenLabs', {
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// [{ id: '...', label: 'Rachel (premade)' }, ...]
```

`getVoiceEngineVoiceList()` は、一覧 API を持つ engine について
正規化済みの `{ id, label }` を返します。対象は VOICEVOX、AivisSpeech、
xAI、ElevenLabs、Inworld、Gradium です。VOICEVOX 互換サーバーには
local `apiUrl`、cloud engine には `apiKey`、Inworld の絞り込みには
`language` を渡します。

browser app では、cloud provider の voice list endpoint が CORS を許可している
必要があります。provider がブラウザからの直接リクエストをブロックする場合は、
backend 側で `getVoiceEngineVoiceList()` を呼ぶか、小さな relay/proxy を
用意してください。

Aivis Cloud はこの helper の対象外です。公開 model search endpoint はありますが、
ブラウザから直接 model/list 系 endpoint を呼び出すと CORS でブロックされる場合が
あります。production UI で動的な Aivis Cloud model 選択を行う場合は、
backend proxy を用意してください。

MiniMax もこの helper の対象外です。リンクされている動的な Get Voice API は
現在利用できないため、公式 system voice ID を直接指定してください。

### VoiceServiceメソッド

```typescript
interface VoiceService {
  speak(screenplay: ChatScreenplay, options?: AudioPlayOptions): Promise<void>;
  speakText(text: string, options?: AudioPlayOptions): Promise<void>;
  isPlaying(): boolean;
  stop(): void;
  updateOptions(
    options: VoiceServiceOptionsUpdate | Partial<VoiceServiceOptions>
  ): void;
  switchEngine?(options: VoiceServiceOptions): void;
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
