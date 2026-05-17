# サンプル一覧

[English version](./examples.md)

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
  `@aituber-onair/core` の最小 React 統合。
- [`packages/core/examples/coding-agent`](../packages/core/examples/coding-agent):
  コーディングエージェント風ワークフローで AITuber OnAir Core を使う例。

## Chat サンプル

- [`packages/chat/examples/node-basic`](../packages/chat/examples/node-basic):
  Node.js での基本的なチャット利用。
- [`packages/chat/examples/react-basic`](../packages/chat/examples/react-basic):
  React ブラウザアプリでのチャット利用。
- [`packages/chat/examples/local-llm-cli`](../packages/chat/examples/local-llm-cli):
  ローカル LLM のコマンドライン利用。
- [`packages/chat/examples/agent-providers`](../packages/chat/examples/agent-providers):
  Agent provider の利用例。
- [`packages/chat/examples/compat-probe`](../packages/chat/examples/compat-probe):
  プロバイダー互換性の確認。
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
  Node.js での基本的な TTS 利用。
- [`packages/voice/examples/react-basic`](../packages/voice/examples/react-basic):
  React ブラウザアプリでの TTS 利用。
- [`packages/voice/examples/bun-basic`](../packages/voice/examples/bun-basic):
  Bun ランタイムでの利用例。
- [`packages/voice/examples/deno-basic`](../packages/voice/examples/deno-basic):
  Deno ランタイムでの利用例。

## Bushitsu Client サンプル

- [`packages/bushitsu-client/examples/react-basic`](../packages/bushitsu-client/examples/react-basic):
  React での WebSocket チャットクライアント利用。
- [`packages/bushitsu-client/examples/node-basic`](../packages/bushitsu-client/examples/node-basic):
  Node.js での WebSocket チャットクライアント利用。
- [`packages/bushitsu-client/examples/gas-send-only`](../packages/bushitsu-client/examples/gas-send-only):
  Google Apps Script の送信専用サンプル。

## スターターテンプレート

このモノレポの外にクリーンなプロジェクトを作りたい場合は
`create-aituber-onair` を使います。

```bash
npm create aituber-onair@latest my-aituber
```

CLI には PNGTuber、VRM、Live2D テンプレートが含まれています。
最初の実行手順は [クイックスタート](./quickstart.ja.md) を参照してください。
