# Live2D Chat

`@aituber-onair/core` を使った React 製のサンプルです。`models/`
フォルダ配下の Live2D モデルを読み込み、`@aituber-onair/core` が
生成した音声を再生して口パクを動かします。

## このサンプルでできること

- LLM / TTS の設定 UI を内蔵
- `models/` フォルダ配下の Live2D モデルを読み込み
- モデル一覧は `@aituber-onair/core` の対応モデルから動的取得するため、
  GPT-5.5 など chat 由来の新規モデルも Settings に自動反映されます
- `gpt-5.5-pro` は OpenAI のドキュメント上でストリーミング非対応のため、
  ストリーミング前提の通常チャットフローを使うこの例では含めていません
- モデルファイルはメモリ内だけで扱い、アプリ固有の永続保存をしない
- アバターステージ上でドラッグ移動、ホイールズーム
- `@aituber-onair/core` が生成した音声を使った口パク
- YouTube Live / Twitch のライブチャットを取得して LLM パイプラインに流す
  - YouTube は YouTube Data API v3 を利用（Google Cloud の API キーが必要）
  - Twitch は EventSub WebSocket とブラウザ上での implicit OAuth フローを利用

## Live2D アセットの置き場所

このテンプレートには Live2D アセットは含まれていません。手元のモデルは
`models/<モデル名>/` に配置してください。

あわせて Cubism Core ランタイムを次に配置してください。

- `public/scripts/live2dcubismcore.min.js`

`live2dcubismcore.min.js` はこのアプリには同梱していません。
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
models/Hiyori/
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
public/scripts/
└── live2dcubismcore.min.js
```

## セットアップ

```bash
npm install
npm run dev
```

起動後に `http://localhost:5173` を開き、`設定` から次を行います。

1. LLM / TTS の設定値
2. `models/` フォルダに置いたモデルがあれば一覧から選んで
   `読み込む` を押す

## ライブコメント取得（YouTube Live / Twitch）

このサンプルでは YouTube Live / Twitch のライブチャットを LLM に流し込むことができます。
**Settings → Stream** から設定します。

同時に有効化できるのはどちらか一方だけです。

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
