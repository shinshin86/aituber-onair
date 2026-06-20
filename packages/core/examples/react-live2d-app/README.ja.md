# Live2D Chat

`@aituber-onair/core` を使った React 製のサンプルです。`models/`
フォルダ配下の Live2D モデルを読み込み、`@aituber-onair/core` が
生成した音声を再生して口パクを動かします。

## このサンプルでできること

- LLM / TTS の設定 UI を内蔵
- LLM プロバイダは既存の OpenAI / Gemini / Claude / Z.ai / Kimi / xAI / OpenRouter / Gemini Nano / OpenAI-compatible に加えて `deepseek` と `mistral` に対応
- `models/` フォルダ配下の Live2D モデルを読み込み
- モデル一覧は `@aituber-onair/core` の対応モデルから動的取得するため、
  Gemini 3.5 Flash や GPT-5.5 など chat 由来の新規モデルも Settings に
  自動反映されます
- Gemini 3.5 Flash はチャット用途向けに minimal thinking を自動適用します
- `gpt-5.5-pro` は OpenAI のドキュメント上でストリーミング非対応のため、
  ストリーミング前提の通常チャットフローを使うこの例では含めていません
- モデルファイルはメモリ内だけで扱い、アプリ固有の永続保存をしない
- アバターステージ上でドラッグ移動、ホイールズーム
- Settings → Visual からグリーンバック背景と、アバター発話字幕だけを出す
  ソロ配信表示を選択可能
- `@aituber-onair/core` が生成した音声を使った口パク
- TTS エンジンは `unrealSpeech`, `elevenLabs`, `inworld` を含む cloud provider とローカル/ブラウザ内エンジンに対応し、Inworld は API キー入力後に `/voices/v1/voices` から音声一覧を取得します
- YouTube Live / Twitch のライブチャットを取得し、`@aituber-onair/comment-intelligence` で分析して、選ばれたコメントだけを LLM パイプラインに流す
  - YouTube は YouTube Data API v3 を利用（Google Cloud の API キーが必要）
  - Twitch は EventSub WebSocket とブラウザ上での implicit OAuth フローを利用
- **Settings → Screen Vision** から OBS Virtual Camera の1フレームを取得し、
  Vision 対応モデルに送ってアバターがコメント
- `@aituber-onair/manneri` で会話の繰り返し傾向を検出し、次の応答前に
  内部的な話題転換指示を追加

## Screen Vision

OBS Virtual Camera を開始し、**Settings → Screen Vision** で選択してから
**画面を見る** を押すと、現在のフレームを Vision 対応モデルに送信します。
30秒、1分、2分、5分ごとの自動送信も選択できます。

## 配信用表示

**Settings → Visual** から背景をグリーンバックに切り替え、表示モードを
ソロ配信にできます。ソロ配信では通常のチャットログを隠し、アバターの
最新発話だけを下部字幕として表示します。ユーザー入力欄は初期状態では
非表示ですが、同じ Visual 設定から表示できます。

## Live2D アセットの置き場所

このサンプルには Live2D アセットは含まれていません。手元のモデルは
`packages/core/examples/react-live2d-app/models/<モデル名>/` に配置して
ください。

あわせて Cubism Core ランタイムを次に配置してください。

- `packages/core/examples/react-live2d-app/public/scripts/live2dcubismcore.min.js`

`live2dcubismcore.min.js` はこのリポジトリには同梱していません。
Live2D のライセンスに従い、利用者自身が Live2D 公式サイトから
`Cubism Core for Web` または `Cubism SDK for Web` をダウンロードし、
展開後に含まれている `live2dcubismcore.min.js` を上記パスへ配置して
ください。

- ダウンロードページ:
  https://www.live2d.com/sdk/download/web/
- 参考:
  https://docs.live2d.com/cubism-sdk-manual/cubism-core/
  https://docs.live2d.com/cubism-sdk-manual/cubism-sdk-for-web/

このサンプルは Cubism 4 系を前提としているため、`live2d.min.js` は不要です。

選択するのは `.model3.json` 単体ではなく、そのファイルと参照先アセット一式を含むフォルダ全体です。

例:

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

```text
packages/core/examples/react-live2d-app/public/scripts/
└── live2dcubismcore.min.js
```

## セットアップ

```bash
cd packages/core/examples/react-live2d-app
npm install
npm run dev
```

起動後に `http://localhost:5173` を開き、`設定` から次を行います。

1. LLM / TTS の設定値
2. `models/` フォルダに置いたモデルがあれば一覧から選んで
   `読み込む` を押す

## ライブコメント取得（YouTube Live / Twitch）

このサンプルでは YouTube Live / Twitch のライブチャットを分析してから、選ばれたコメントだけを LLM に流し込むことができます。
**Settings → Stream** から設定します。

同時に有効化できるのはどちらか一方だけです。

コメントインテリジェンスは初期状態で有効です。AIが処理中または発話中のコメントをまとめて、安全判定、優先度付け、未選択コメントの要約を行い、配信用コンテキストとしてAITuberへ渡します。Rules モードは追加の LLM 呼び出しなしで動作します。Hybrid / LLM-assisted モードでは、LLM 設定タブのプロバイダー、モデル、APIキー、エンドポイントをコメント分析にも利用し、使えない場合は rules にフォールバックします。

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

## 補足

- Live2D モデル自体は同梱していません
- `live2dcubismcore.min.js` も同梱していません
- モデルデータはメモリ保持のみで、リロードすると消えます
- LLM / TTS / stream 設定は `localStorage` に保存されます
- `models/` 配下の一覧は起動時に解決されるため、モデルを追加した場合は
  dev サーバーの再起動が必要です
- Live2D 描画には `pixi-live2d-display-lipsyncpatch` を利用しています
