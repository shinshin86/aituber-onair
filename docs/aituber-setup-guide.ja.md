# AITuber 配信環境を 3 パターンで立ち上げるセットアップガイド

`@aituber-onair/core` をベースにした React サンプルを使うと、LLM と TTS が
つながった配信用の AITuber 画面を手元ですぐ立ち上げられます。本ガイドでは
以下の 3 種類のアバター方式について、セットアップ手順をまとめて紹介します。

- **PNGTuber** — 2D PNG 差し替え方式（`react-pngtuber-app`）
- **VRM** — 3D VRM アバター方式（`react-vrm-app`）
- **Live2D** — ローカル Live2D モデル読み込み方式（`react-live2d-app`）

どのサンプルでも共通して以下が使えます。

- LLM プロバイダ切り替え: `openai`, `openai-compatible`, `openrouter`,
  `gemini`, `gemini-nano`, `claude`, `zai`, `kimi`, `xai`
- TTS エンジン切り替え: `openai`, `geminiTts`, `openaiCompatible`,
  `voicevox`, `voicepeak`, `aivisSpeech`, `aivisCloud`, `minimax`, `xai`,
  `piperPlus`, `none`
- 実際の音声出力ボリュームを解析したリアルタイム口パク
- Web Speech API による音声入力（Chrome / Edge 推奨）
- YouTube Live / Twitch のライブコメント取り込み

## 共通の前提

- Node.js（LTS 推奨）と npm
- Chrome / Edge（Web Speech API 使用のため）
- HTTPS または `localhost` で起動できる環境

リポジトリを clone して進めます。

```bash
git clone https://github.com/shinshin86/aituber-onair.git
cd aituber-onair
```

設定値（API キーや各プロバイダの設定）は `localStorage` に保存されます。
**サンプルアプリは開発者向けのものであり、本番用クレデンシャルを入れたり、
共有オリジン・公開オリジンにそのままデプロイしたりしないでください。**

---

## 1. PNGTuber セットアップ

2D PNG を 4 状態（口開閉 × 目開閉）で差し替えるシンプルな方式です。
Easy PNGTuber 等で作成した素材をそのまま流用できます。

### 起動

```bash
cd packages/core/examples/react-pngtuber-app
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開き、**Settings** から API キーや
プロバイダを設定します。設定は `localStorage`
（キー: `react-pngtuber-app-settings`）に保存されます。

### アバター画像の配置

`public/avatar/` に以下 4 枚を配置してください。未配置の場合は SVG の
フォールバックアバターが表示されます。

| ファイル | 説明 |
|---|---|
| `mouth_close_eyes_open.png` | 口閉じ + 目開き |
| `mouth_close_eyes_close.png` | 口閉じ + 目閉じ |
| `mouth_open_eyes_open.png` | 口開き + 目開き |
| `mouth_open_eyes_close.png` | 口開き + 目閉じ |

Settings 画面からの画像アップロードはメモリ保持のみで、リロードすると初期化
されます。

サンプル素材は [Easy PNGTuber](https://github.com/rotejin/EasyPNGTuber)
で作成しています。

### 口パクの調整

`src/hooks/useAudioLipsync.ts` 冒頭の定数で微調整できます。

| 定数 | デフォルト | 説明 |
|---|---|---|
| `SMOOTH_FACTOR` | `0.5` | 平滑化係数（0.0-1.0、大きいほどなめらか） |
| `RMS_CEILING` | `0.12` | RMS の正規化上限（小さいほど敏感） |
| `MOUTH_LEVELS` | `5` | 口パク段階数（画像枚数と合わせる） |

---

## 2. VRM セットアップ

3D の VRM アバターを表示し、VRM 表情 `Aa` にリアルタイムの口パクを流し込む
方式です。カメラ操作（ドラッグで回転 / ホイールでズーム / ダブルクリックで
リセット）にも対応しています。

### 起動

```bash
cd packages/core/examples/react-vrm-app
npm install
npm run dev
```

設定は `localStorage`（キー: `react-vrm-app-settings`）に保存されます。

### アバターアセットの配置

`public/avatar/` に以下を配置してください。

| ファイル | 必須 | 説明 |
|---|---|---|
| `miko.vrm` | 必須 | ビューアーが読み込む VRM モデル |
| `idle_loop.vrma` | 任意 | 待機アニメーションクリップ |

`miko.vrm` が未配置または不正だとアバターステージにエラーが表示されます。

- `miko.vrm` の詳細: https://miko.aituberonair.com/
- `idle_loop.vrma` は [pixiv/ChatVRM](https://github.com/pixiv/ChatVRM)
  の資産を流用できます。

背景画像は Settings からアップロードでき、メモリ保持のみです
（リロードで初期化）。

### 口パクの調整

`src/hooks/useAudioLipsync.ts` の先頭定数で調整できます（PNGTuber と同じ
パラメータを、VRM 表情ウェイトへマップします）。

---

## 3. Live2D セットアップ

手元の Live2D モデルフォルダをブラウザで読み込んで表示する方式です。
**Live2D モデル本体と Cubism Core は同梱していません。** 利用者自身で
用意する必要があります（Cubism 4 系前提）。

### 起動

```bash
cd packages/core/examples/react-live2d-app
npm install
npm run dev
```

### Cubism Core ランタイムの配置

[Live2D 公式サイト](https://www.live2d.com/sdk/download/web/) から
`Cubism Core for Web` または `Cubism SDK for Web` をダウンロードし、
含まれている `live2dcubismcore.min.js` を以下に配置します。

```text
packages/core/examples/react-live2d-app/public/scripts/live2dcubismcore.min.js
```

Cubism 4 系前提のため `live2d.min.js` は不要です。

### モデルフォルダの配置

選択するのは `.model3.json` 単体ではなく、参照先アセット一式を含む
フォルダ全体です。

```text
packages/core/examples/react-live2d-app/models/Hiyori/
├── Hiyori.model3.json
├── Hiyori.moc3
├── Hiyori.physics3.json
├── textures/
│   ├── texture_00.png
│   └── texture_01.png
└── motions/
    └── idle.motion3.json
```

起動後、`http://localhost:5173` を開き、Settings から LLM / TTS と
モデルを選択して「読み込む」を押します。モデルデータはメモリ保持のみで、
リロードで消えます。

> `models/` 配下の一覧は dev サーバー起動時に解決されるため、モデルを追加
> したら dev サーバーを再起動してください。

描画には
[pixi-live2d-display-lipsyncpatch](https://www.npmjs.com/package/pixi-live2d-display-lipsyncpatch)
を利用しています。

---

## LLM / TTS の共通設定

どのサンプルでも起動後は **Settings** から API キー・プロバイダ・モデルを
設定します。

### LLM のポイント

- モデル一覧は `@aituber-onair/core` が対応する最新モデルから動的取得される
  ため、chat パッケージの更新で追加されたモデルも自動で Settings に出ます
- `openrouter` では `Fetch free models` で `:free` モデルを疎通確認し、
  通ったものを一覧に追加できます（`Max candidates` は疎通確認する候補数の
  上限）
- `openai-compatible` を使う場合は以下を設定:
  - `Endpoint URL`（必須、`/v1/chat/completions` まで含めた URL）
  - `Model`（必須、任意文字列）
  - `API Key`（任意、空欄なら送信しない）
- `gemini-nano` を使う場合は Chrome 138+ で Built-in AI のフラグを有効化:
  - `#optimization-guide-on-device-model`
  - `#prompt-api-for-gemini-nano`
  - API キーは不要

### TTS のポイント

- `geminiTts` は `gemini-3.1-flash-tts-preview` を既定で利用し、30 種類の
  プリセットボイスとスタイル / audio-tag プロンプト入力に対応
- スピーカー一覧の動的取得:
  - `voicevox` / `aivisSpeech`: `/speakers` から取得
  - `minimax`: API キー入力後に `query/tts_speakers` から取得
- `aivisCloud` は CORS 回避のため固定プリセット（`コハク`, `まお`）を選択
- `piperPlus` を使う場合は別途 `public/piper/` に runtime assets の配置が
  必要（次項参照）

### Piper Plus を使う場合

`piperPlus` は ONNX Runtime Web と OpenJTalk を使うブラウザ側 WASM TTS
です。サイズとライセンスの都合で runtime assets は同梱していません。
**3 つのサンプル（PNGTuber / VRM / Live2D）で同じ手順です。**

最短セットアップ（配布済みバンドルを使う場合、約 85MB）:

```bash
# カレントディレクトリはセットアップしたいサンプルアプリのルートに合わせる
curl -L -o piper-assets.tar.gz \
  https://github.com/shinshin86/chrome-on-aituber/releases/download/piper-assets-v1/piper-assets.tar.gz
mkdir -p public
tar -xzf piper-assets.tar.gz -C public/
rm piper-assets.tar.gz
```

すでに `packages/voice/examples/react-basic/public/piper` に assets を
用意済みなら、そのままコピーできます。

```bash
mkdir -p public
cp -R ../../../voice/examples/react-basic/public/piper public/
```

手動で assets を集める場合は、各サンプルの README にある
`public/piper/` の配置例と、
[`packages/voice/examples/react-basic/README.md`](../packages/voice/examples/react-basic/README.md)
を参照してください。

---

## ライブコメント取得（YouTube Live / Twitch）

3 種類のサンプルすべてで、**Settings → Stream** から YouTube Live または
Twitch のライブチャットを LLM パイプラインに流し込めます。同時に有効化
できるのはどちらか一方だけです。

### YouTube Live

1. Google Cloud Console で **YouTube Data API v3** を有効化した API キーを
   作成
2. Settings → Stream で `YouTube` を選択し、API キーとライブ動画 ID
   （YouTube Live URL の `v=` パラメータ）を入力
3. 必要に応じてポーリング間隔（既定 20 秒）を調整し、トグルを有効化

### Twitch

ブラウザ側の implicit OAuth フロー（`response_type=token`、スコープ
`user:read:chat`）を使います。アクセストークンはサーバを介さず、ブラウザ
の `localStorage` にだけ保存されます。

1. [Twitch Developer Console](https://dev.twitch.tv/console/apps) で
   アプリを登録し、Client ID をコピー
2. OAuth Redirect URL に **`http://localhost:5173/`** を登録
   （Settings → Stream → Twitch に表示されている URL を正確にコピー）
3. Settings → Stream で `Twitch` を選択し、Client ID を貼り付けて
   **Connect to Twitch** → OAuth 承認
4. チャンネルの login 名（Twitch URL に含まれる小文字の名前）を入力し、
   dequeue 間隔を設定してトグルを有効化

**localhost 以外のホストにデプロイする場合:** そのオリジンを Twitch
Developer Console に追加の Redirect URL として登録し、そのホスト上で
OAuth フローを再実行してください。Redirect URL は `window.location` から
自動計算されます。

### 認証情報の扱いに関する注意

YouTube API キー、Twitch Client ID / アクセストークンは `localStorage`
に **平文** で保存されます。本番権限のクレデンシャルは入れない、共有
オリジンにデプロイしない、共有端末で使った場合はキーをローテーションする、
といった運用を推奨します。

---

## よくあるつまずき

- **`Cannot find package '@vitejs/plugin-react'` が出る**
  → サンプルアプリのディレクトリで `npm install` を再実行してください。
  `NODE_ENV=production` や `omit=dev` で `devDependencies` が入らない
  設定になっていないかも確認します。
- **マイクボタンが押せない**
  → Web Speech API の前提を満たしていない可能性があります。Chrome / Edge
  を使い、`https://` もしくは `http://localhost` で開いているか確認
  してください。
- **Live2D モデルが読み込めない**
  → `public/scripts/live2dcubismcore.min.js` の配置と、モデルフォルダ内の
  相対パス（`.model3.json` から参照される textures / motions）が正しく
  解決されているかを確認してください。`models/` 配下を追加・変更したら
  dev サーバーを再起動します。
- **VRM が表示されない**
  → `public/avatar/miko.vrm` が存在し、正しい VRM ファイルかを確認して
  ください。ブラウザコンソールに読み込みエラーが出ます。

---

## 参考リンク

- PNGTuber サンプル: [`packages/core/examples/react-pngtuber-app`](../packages/core/examples/react-pngtuber-app)
- VRM サンプル: [`packages/core/examples/react-vrm-app`](../packages/core/examples/react-vrm-app)
- Live2D サンプル: [`packages/core/examples/react-live2d-app`](../packages/core/examples/react-live2d-app)
- Live2D Cubism SDK (Web): https://www.live2d.com/sdk/download/web/
- Easy PNGTuber: https://github.com/rotejin/EasyPNGTuber
- pixiv/ChatVRM（`idle_loop.vrma` の出典）: https://github.com/pixiv/ChatVRM
- Twitch Developer Console: https://dev.twitch.tv/console/apps
- YouTube Data API v3: https://developers.google.com/youtube/v3
