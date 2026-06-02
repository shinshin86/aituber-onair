# サンプル一覧

[English version](./examples.md)

<p align="center">
  <img src="./images/examples-cover-miko.png" alt="AITuber OnAir サンプル一覧" width="840" />
</p>

AITuber OnAir には、フル機能のアプリサンプルと、より小さなパッケージ別
サンプルがあります。初めて使う場合は、まずフル機能の AI VTuber アプリを
1つ動かし、その後で必要に応じてパッケージ別サンプルを確認してください。

## おすすめの始め方

- 初めての AITuber OnAir プロジェクトなら
  [`packages/core/examples/react-pngtuber-app`](../packages/core/examples/react-pngtuber-app)
  から始めてください。
- 3D アバターを使いたい場合は
  [`packages/core/examples/react-vrm-app`](../packages/core/examples/react-vrm-app)
  を使います。
- すでに Live2D モデルアセットを持っている場合は
  [`packages/core/examples/react-live2d-app`](../packages/core/examples/react-live2d-app)
  を使います。
- 既存アプリにチャット、音声、メモリ、配信連携を組み込みたい場合は、
  パッケージ別サンプルを参照してください。

## フル機能の AI VTuber アプリ

### PNGTuber App

<p align="center">
  <img src="../packages/core/examples/react-pngtuber-app/images/react-pngtuber-app.png" alt="PNGTuber サンプルアプリ" width="720" />
</p>

パス:
[`packages/core/examples/react-pngtuber-app`](../packages/core/examples/react-pngtuber-app)

最初のローカルセットアップに向いています。2D PNG のアバター状態を使い、
実際の音声出力ボリュームからリップシンクを駆動します。

```bash
cd packages/core/examples/react-pngtuber-app
npm install
npm run dev
```

### VRM App

<p align="center">
  <img src="../packages/core/examples/react-vrm-app/images/react-vrm-app.png" alt="VRM サンプルアプリ" width="720" />
</p>

パス:
[`packages/core/examples/react-vrm-app`](../packages/core/examples/react-vrm-app)

3D アバタープロジェクトに向いています。VRM モデルを描画し、任意の
アイドル VRMA アニメーションとカメラ操作に対応しています。

```bash
cd packages/core/examples/react-vrm-app
npm install
npm run dev
```

### Live2D App

<p align="center">
  <img src="../packages/core/examples/react-live2d-app/images/react-live2d-app-hiyori.png" alt="桃瀬ひよりを使用した Live2D サンプルアプリ" width="720" />
</p>

<p align="center">
  <small>
    Live2D サンプルモデル: 桃瀬ひより。イラスト: かにビーム、
    モデリング: Live2D Inc. このコンテンツは Live2D Inc. が著作権を
    有するサンプルデータを使用しています。詳細:
    <a href="https://www.live2d.com/learn/sample/">Live2D サンプルデータ集</a>。
  </small>
</p>

パス:
[`packages/core/examples/react-live2d-app`](../packages/core/examples/react-live2d-app)

すでに Live2D アセットを持っている場合に向いています。ローカルの Live2D
モデルフォルダを読み込み、音声出力ボリュームから口元を動かします。
Live2D モデルアセットは同梱していません。

```bash
cd packages/core/examples/react-live2d-app
npm install
npm run dev
```

## Core サンプル

- [`packages/core/examples/react-basic`](../packages/core/examples/react-basic):
  複数 LLM プロバイダー、TTS エンジン、ツール呼び出し、MCP、画像チャット
  に対応した React チャット統合。
- [`packages/core/examples/coding-agent`](../packages/core/examples/coding-agent):
  コーディングエージェント風ワークフローで AITuber OnAir Core を使う例。

## Chat サンプル

- [`packages/chat/examples/node-basic`](../packages/chat/examples/node-basic):
  Node.js での基本チャット、プロバイダー別呼び出し、Vision、ツール呼び出し、
  ストリーミングの例。
- [`packages/chat/examples/react-basic`](../packages/chat/examples/react-basic):
  React ブラウザアプリでのチャット利用。
- [`packages/chat/examples/local-llm-cli`](../packages/chat/examples/local-llm-cli):
  ローカルまたはセルフホストの OpenAI 互換 LLM 向け対話 CLI。
- [`packages/chat/examples/agent-providers`](../packages/chat/examples/agent-providers):
  Codex、Claude、Copilot など Agent SDK ベースの provider 利用例。
- [`packages/chat/examples/character-agent`](../packages/chat/examples/character-agent):
  ツール、JSON ストレージ、テストを備えた秘書風キャラクターエージェント。
- [`packages/chat/examples/codex-character-chat`](../packages/chat/examples/codex-character-chat):
  Codex agent provider を使う実験的なキャラクターチャット CLI。
- [`packages/chat/examples/compat-probe`](../packages/chat/examples/compat-probe):
  OpenAI 互換チャットエンドポイントの互換性確認。
- [`packages/chat/examples/mock-openai-server`](../packages/chat/examples/mock-openai-server):
  ローカルテスト用の OpenAI 互換モックサーバー。
- [`packages/chat/examples/discord-bot`](../packages/chat/examples/discord-bot):
  Discord Bot サンプル。
- [`packages/chat/examples/slack-bot`](../packages/chat/examples/slack-bot):
  Slack Bot サンプル。
- [`packages/chat/examples/gas-basic`](../packages/chat/examples/gas-basic):
  Google Apps Script のチャットサンプル。
- [`packages/chat/examples/gas-forms-autodraft-openai`](../packages/chat/examples/gas-forms-autodraft-openai):
  OpenAI を使った Google Forms 自動下書きサンプル。

## Voice サンプル

- [`packages/voice/examples/node-basic`](../packages/voice/examples/node-basic):
  OpenAI 互換音声、VOICEVOX、Aivis Speech、Aivis Cloud、VoicePeak、
  音声再生確認に対応した Node.js TTS 例。
- [`packages/voice/examples/react-basic`](../packages/voice/examples/react-basic):
  エンジン切り替えと provider 別設定に対応した React ブラウザ TTS アプリ。
- [`packages/voice/examples/bun-basic`](../packages/voice/examples/bun-basic):
  Bun ランタイムでの TTS 利用例。
- [`packages/voice/examples/deno-basic`](../packages/voice/examples/deno-basic):
  Deno ランタイムでの TTS 利用例。

## Bushitsu Client サンプル

- [`packages/bushitsu-client/examples/react-basic`](../packages/bushitsu-client/examples/react-basic):
  React での WebSocket チャットクライアント利用。
- [`packages/bushitsu-client/examples/node-basic`](../packages/bushitsu-client/examples/node-basic):
  Node.js での WebSocket チャットクライアント利用。
- [`packages/bushitsu-client/examples/gas-send-only`](../packages/bushitsu-client/examples/gas-send-only):
  Google Apps Script の送信専用サンプル。

## Manneri サンプル

- [`packages/manneri/examples/browser-basic`](../packages/manneri/examples/browser-basic):
  LLM に接続せず会話パターン検出を試せるブラウザサンプル。

## Comment Intelligence サンプル

- [`packages/comment-intelligence/examples/live-comment-filter-sample`](../packages/comment-intelligence/examples/live-comment-filter-sample):
  LLM に送る前にライブコメントをフィルタリングするブラウザサンプル。

## スターターテンプレート

<p align="center">
  <img src="../packages/create-aituber-onair/images/create-aituber-onair.png" alt="create-aituber-onair" width="520" />
</p>

このモノレポの外にクリーンなプロジェクトを作りたい場合は
`create-aituber-onair` を使います。

```bash
npm create aituber-onair@latest my-aituber
```

CLI には PNGTuber、VRM、Live2D テンプレートが含まれています。
最初の実行手順は [クイックスタート](./quickstart.ja.md) を参照してください。
