# PNGTuber Chat

![react-pngtuber-app image](./images/react-pngtuber-app.png)

`@aituber-onair/core` を使った PNGTuber 風チャットアプリです。  
音声入力は Web Speech API、口パクは実際の音声出力音量を解析してリアルタイムで動かします。

## このアプリでできること

- LLM プロバイダ切り替え: `openai`, `openai-compatible`, `openrouter`, `gemini`, `gemini-nano`, `claude`, `zai`, `kimi`, `xai`, `deepseek`, `mistral`
- モデル一覧は `@aituber-onair/core` の対応モデルから動的取得するため、
  Gemini 3.5 Flash や GPT-5.5 など chat 由来の新規モデルも Settings に
  自動反映されます
- Gemini 3.5 Flash はチャット用途向けに minimal thinking を自動適用します
- `gpt-5.5-pro` は OpenAI のドキュメント上でストリーミング非対応のため、
  ストリーミング前提の通常チャットフローを使うこの例では含めていません
- `openrouter` では Settings から現在使える `:free` モデルを取得可能:
  - `Fetch free models` で候補を疎通確認し、通ったモデルを一覧に追加
  - `Max candidates` は「疎通確認する `:free` 候補の最大件数」
    （「N件見つかるまで試行」ではありません）
- TTS エンジン切り替え: `openai`, `geminiTts`, `openaiCompatible`, `voicevox`, `voicepeak`, `aivisSpeech`, `aivisCloud`, `minimax`, `xai`, `unrealSpeech`, `elevenLabs`, `inworld`, `piperPlus`, `none`
- `geminiTts` は `gemini-3.1-flash-tts-preview` を既定利用し、30 種類のプリセットボイスとスタイル / audio-tag プロンプト入力に対応
- スピーカー一覧の動的取得と選択:
  - `voicevox` / `aivisSpeech`: `/speakers` から取得
  - `minimax`: APIキー入力後に `query/tts_speakers` から取得
  - `elevenLabs`: API キー入力後に `/v2/voices` から取得
  - `inworld`: API キー入力後に `/voices/v1/voices` から取得
- Aivis Cloud は CORS 回避のため固定プリセット選択:
  - `コハク`（`22e8ed77-94fe-4ef2-871f-a86f94e9a579`）
  - `まお`（`a59cb814-0083-4369-8542-f51a29e72af7`）
- `piperPlus` は `public/piper/` 配下に browser assets を配置して利用します
- リアルタイム口パク + ランダムまばたき
- Settings 画面から見た目をその場で設定:
  - 背景画像（1枚）
  - アバター画像（4状態: 口開閉/目開閉）
- 画像設定はメモリ保持のみ（リロードで初期化）
- YouTube Live / Twitch のライブチャットを取得して LLM パイプラインに流す
  - YouTube は YouTube Data API v3 を利用（Google Cloud の API キーが必要）
  - Twitch は EventSub WebSocket とブラウザ上での implicit OAuth フローを利用
- `@aituber-onair/manneri` で会話の繰り返し傾向を検出し、次の応答前に
  内部的な話題転換指示を追加

## セットアップ

```bash
cd packages/core/examples/react-pngtuber-app
npm install
npm run dev
```

起動後に **Settings** を開き、APIキーや各種設定を入力してください。  
設定値は `localStorage`（`react-pngtuber-app-settings`）に保存されます。

`openai-compatible` 利用時は以下を設定してください。
- `Endpoint URL`（必須。`/v1/chat/completions` まで含む URL）
- `Model`（必須。任意文字列）
- `API Key`（任意。空なら送信しません）

`gemini-nano` 利用時は以下を設定してください。
- Chrome 138+ で Built-in AI のフラグを有効化してください
- `#optimization-guide-on-device-model`
- `#prompt-api-for-gemini-nano`
- API Key は不要です

## ライブコメント取得（YouTube Live / Twitch）

このサンプルでは YouTube Live / Twitch のライブチャットを LLM に流し込むことができます。
**Settings → Stream** から設定します。

同時に有効化できるのはどちらか一方だけです。

Manneri は初期状態で有効です。直近のユーザー/アシスタント発言を見て、
会話が似た流れに偏った場合、次の LLM リクエストへ非表示の話題転換指示を
追加します。類似度しきい値、直近メッセージ数、介入間隔、最小メッセージ長は
Settings → Stream から調整できます。

### YouTube Live

1. Google Cloud Console で **YouTube Data API v3** を有効化した API キーを作成します。
2. Settings → Stream で `YouTube` を選択し、API キーとライブ動画 ID（YouTube Live URL の `v=` パラメータ）を入力します。
3. 必要に応じてポーリング間隔（既定 20 秒）を調整し、トグルを有効化します。

### Twitch

このサンプルは Twitch のブラウザ implicit OAuth フロー（`response_type=token`、
スコープ `user:read:chat`）を使用します。アクセストークンはサーバを介さず、
ブラウザの `localStorage` にのみ保存されます。

1. [Twitch Developer Console](https://dev.twitch.tv/console/apps) でアプリケーションを登録し、Client ID をコピーします。
2. そのアプリケーションの OAuth Redirect URL に **`http://localhost:5173/`** を登録します（Settings → Stream → Twitch に表示されている URL を正確にコピーしてください。Vite 既定では `http://localhost:5173/`）。
3. Settings → Stream で `Twitch` を選択し、Client ID を貼り付けて **Connect to Twitch** を押し、OAuth 認可画面で承認します。
4. チャンネルの login 名（Twitch URL に含まれる小文字の名前）を入力し、dequeue 間隔を設定してトグルを有効化します。

**localhost 以外の環境にデプロイする場合:** `http://localhost:5173/` 以外のホスト
（例: `https://your-domain.example/`）で動かしたい場合は、その URL を Twitch
Developer Console に追加の OAuth Redirect URL として登録し、そのホスト上で
再度 OAuth フローを実行してください。Settings パネルに表示される Redirect URL は
`window.location` から自動計算され、開いているホストに追従します。

### 認証情報の保存に関する注意

このサンプルは開発者向けサンプルです。YouTube API キー、Twitch Client ID、
Twitch アクセストークンは **`localStorage` に平文で保存** されます（このサンプルが
既に扱っている他プロバイダの API キーと同じ扱いです）。このオリジン上で動く
スクリプトはこれらの値を読み取れます。本番権限のクレデンシャルを入れないこと、
共有オリジンや公開オリジンにこのサンプルをそのままデプロイしないこと、
共有環境で使ったブラウザではキーをローテーションすることを推奨します。

## Piper Plus のセットアップ

`piperPlus` は ONNX Runtime Web と OpenJTalk を使うブラウザ側の WASM
TTS です。runtime assets はサイズとサードパーティライセンスの都合で
この example には同梱していないため、`Piper Plus` を選ぶ前に
`public/piper/` を用意してください。

### 最短セットアップ（推奨）

`chrome-on-aituber` の release から配布済み assets を取得し、この
example に展開します。

```bash
cd packages/core/examples/react-pngtuber-app
curl -L -o piper-assets.tar.gz \
  https://github.com/shinshin86/chrome-on-aituber/releases/download/piper-assets-v1/piper-assets.tar.gz
mkdir -p public
tar -xzf piper-assets.tar.gz -C public/
rm piper-assets.tar.gz
npm run dev
```

これで約 85 MB の assets 一式が `public/piper/` に展開されます。
展開後、Settings で `Piper Plus` を選択してください。

### 既存 assets の再利用

すでに voice example 用に assets を用意済みなら、そのままコピーできます。

```bash
cd packages/core/examples/react-pngtuber-app
mkdir -p public
cp -R ../../../voice/examples/react-basic/public/piper public/
```

### 手動セットアップ

自分で assets を集める場合は、次の 3 ソースから必要ファイルを用意します。

1. [piper-plus](https://github.com/ayutaz/piper-plus)（`dev` branch）:
   `piper-global-loader.js`、`src/`、OpenJTalk WASM / 辞書、HTS voice
2. [onnxruntime-web](https://www.npmjs.com/package/onnxruntime-web):
   `ort.min.js`、`ort-wasm-simd.wasm`、`ort-wasm.wasm`
3. [piper-plus-tsukuyomi-chan](https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan):
   ONNX model、config JSON

これらを次の構成で `public/piper/` に配置してください。

```text
public/piper/
├── piper-global-loader.js
├── dist/
│   ├── ort.min.js
│   ├── ort-wasm-simd.wasm
│   ├── openjtalk.js
│   └── openjtalk.wasm
├── src/
├── assets/
│   ├── dict/
│   └── voice/
└── models/
    ├── tsukuyomi-wavlm-300epoch.onnx
    └── tsukuyomi-config.json
```

元のセットアップ script、より詳細な assets の出所、ライセンス注意点は
[`packages/voice/examples/react-basic/README.md`](../../../voice/examples/react-basic/README.md)
を参照してください。

## 設定の保存仕様

- LLM/TTS/APIキー設定は `localStorage` に保存されます
- OpenRouter の動的 free モデルキャッシュ
  （`models` / `fetchedAt` / `maxCandidates`）も同じキーに保存されます
- Visual のアップロード画像はメモリ保持のみで、リロード時に初期化されます

### コメントインテリジェンス

このサンプルでは、YouTube / Twitch のライブコメントを `@aituber-onair/core` に渡す前に、`@aituber-onair/comment-intelligence` で分析します。

コメントを1件ずつそのままLLMへ渡すのではなく、一定時間内のコメントをまとめて、安全判定、優先度付け、未選択コメントの要約を行います。

画面上には選ばれた視聴者コメントだけを表示し、LLMには挨拶、初見コメント、重複コメント、安全上の注意などを含む配信用コンテキストを渡します。

Rules モードは追加の LLM 呼び出しなしで動作します。Hybrid / LLM-assisted モードでは、LLM 設定タブで選択したプロバイダー、モデル、API キー、エンドポイントをコメント分析にも利用し、そのプロバイダーが使えない場合は rules にフォールバックします。

## アバターのベース画像（`public/avatar`）

`public/avatar/` に以下のファイルを配置してください。

| ファイル | 説明 |
|---|---|
| `mouth_close_eyes_open.png` | 口閉じ + 目開き |
| `mouth_close_eyes_close.png` | 口閉じ + 目閉じ |
| `mouth_open_eyes_open.png` | 口開き + 目開き |
| `mouth_open_eyes_close.png` | 口開き + 目閉じ |

画像が未配置の場合は SVG フォールバックアバターを表示します。  
Settings からアップロードした画像は、そのセッション中のみ優先して使われます。

なお、今回サンプルのために用意したPNGTuberの素材作成は[Easy PNGTuber](https://github.com/rotejin/EasyPNGTuber)を利用して作成しています。

## 口パクの調整パラメータ

`src/hooks/useAudioLipsync.ts` の先頭定数で調整できます。

| 定数 | デフォルト | 説明 |
|---|---|---|
| `SMOOTH_FACTOR` | `0.5` | 平滑化係数。大きいほどなめらか（0.0–1.0） |
| `RMS_CEILING` | `0.12` | RMS の正規化上限。小さいほど敏感に口が開く |
| `MOUTH_LEVELS` | `5` | 口パク段階数（画像枚数と合わせる） |

## Web Speech API について

- **Chrome / Edge** で動作（推奨: Chrome）
- Firefox, Safari は未対応
- 未対応ブラウザではマイクボタンが無効化
- HTTPS または localhost 環境が必要

## 技術スタック

- Vite + React + TypeScript
- `@aituber-onair/core`（LLM + TTS）
- Web Speech API（音声入力）
- Web Audio API + `AnalyserNode`（口パク解析）
