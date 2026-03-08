# Coding Agent Example

[English](./README.md) | 日本語

`@aituber-onair/core` を使った Node.js 向けローカル coding-agent サンプルです。

## アーキテクチャ

- `src/app`: セッション実行・状態遷移・ループガード
- `src/domain`: 型付きエラー・ポリシー・イベント
- `src/infra`: core / fs / process / logging アダプタ
- `src/tools`: コマンド実装とツール登録
- `src/config`: 厳密な env 設定読み込み

## セットアップ

```bash
npm install
cp .env.example .env
```

最低限設定:
- `AGENT_WORKDIR`
- `AGENT_API_KEY`

## 実行

```bash
npm run agent
```

または

```bash
# npm run buildを実施後
node dist/index.js
node dist/index.js <workdir>
node dist/index.js --workdir <workdir>
```

## テスト

```bash
npm test
npm run test:e2e
```

`npm test` では e2e は実行されません。

## E2E

E2E はローカル OpenAI 互換モックサーバーで実行し、
外部 API に依存せず決定的に検証します。

## セキュリティ注意

- コマンド実行は allowlist のみ許可
- ワークスペースサンドボックスを強制
- 機密パス（`.env`, `*.pem`, `id_rsa` など）を遮断
- `-c`, `--command`, `| sh` など危険引数を遮断
