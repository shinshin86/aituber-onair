# Codex Workspace Server

[English](./README.md) | 日本語

実際の Codex app-server に `@aituber-onair/agent` の Session を接続し、
`http://127.0.0.1:4517` で運営用UIを提供するNode.jsサンプルです。

サーバーは1つのAgentとSessionを保持します。ブラウザから指示を送り、
Server-Sent Eventsで `AgentEvent` を受信し、`message.delta` を逐次表示します。
承認要求には `allow-once` または `deny` で応答でき、実行中のTurnを中断
できます。

## 前提条件

- Node.js 18以上
- ローカルにインストールしたCodex CLI `0.145.0`
- `codex login` の完了

固定バージョンのCLIをインストールしてログインします。

```sh
npm install --global @openai/codex@0.145.0
codex login
```

app-serverのプロトコルはバージョン依存のため、backendは異なるCLI
バージョンを拒否します。

## 起動

モノレポのルートでAgent packageを一度buildしてから、サンプルを起動します。

```sh
npm -w @aituber-onair/agent run build
cd packages/agent/examples/codex-workspace-server
npm install
npm start
```

`http://127.0.0.1:4517` を開いてください。

サーバーは `PATH` 上の `codex` を利用できます。実行ファイルを指定する場合は、
絶対パスを渡します。

```sh
CODEX_PATH=/absolute/path/to/codex npm start
```

## 環境変数

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `PORT` | `4517` | ローカルHTTPポート。必ず `127.0.0.1` にbindします。 |
| `CODEX_PATH` | `PATH` 上の `codex` | 固定バージョンのCodex実行ファイルへの絶対パスです。 |
| `CODEX_SANDBOX` | `read-only` | `workspace-write` と完全一致する場合だけworkspaceへの変更を許可します。それ以外はread-onlyです。 |
| `AGENT_WORKSPACE_DIR` | `./workspace` | 隔離workspaceです。相対パスはプロセスの作業ディレクトリから解決します。 |

## 承認フロー

Codex backendは `approvalPolicy: "on-request"` を使用します。Codexが許可を
求めると、リスク、理由、サニタイズ済み引数を含む承認カードがブラウザに
表示されます。

- `allow-once` は、その要求だけを許可します。
- `deny` は、その要求を拒否します。
- Session全体や恒久的な許可を与えるボタンは意図的に用意していません。

人間が応答できるよう、Agentの承認タイムアウトは10分です。Session終了、
Turn中断、タイムアウト時には、残っている要求が拒否されます。

## Workspaceとcold resume

初回起動時に `workspace-template/` のファイルをworkspaceへコピーします。
ディレクトリは再帰的にシードされ、既存ファイルは上書きされません。

Codex backendのSession IDは、workspace内の `.agent-session.json` に保存されます。
次回のサーバー起動時は、そのIDを指定して `agent.resumeSession(...)` を呼びます。
保存内容がない、不正、または再開不能な場合は、新しいCodex threadを開始して
保存内容を置き換えます。

このファイルはhost管理のlifecycle stateです。briefでもCodexに読み取り・変更
しないよう指示します。ただし `workspace-write` では書込可能root内の1ファイル
だけを除外できないため、サーバーは欠落・変更・不正な記録を信頼せず、新しい
threadへフォールバックします。

Cold resumeで復元されるのはCodex threadです。ブラウザ向けのイベント履歴は、
現在のHTTPサーバープロセスが動作している間だけ保持されます。

## 安全上の注意

- HTTPサーバーには認証がなく、loopback専用です。ネットワークへproxy・公開
  しないでください。
- 既定sandboxはread-onlyです。`workspace-write` は、Codexが変更してよい隔離
  ディレクトリに対してのみ有効にしてください。
- `AGENT_WORKSPACE_DIR` がbackendの作業ディレクトリになります。ホーム
  ディレクトリ、リポジトリルートなど広い場所を指定しないでください。
- UIから許可できるのは1要求だけです。表示されたパス、コマンド、理由、
  リスクを確認してから許可してください。
- サーバーはcross-originの変更要求を拒否します。JSON endpointでは
  `Content-Type: application/json` も必須です。
- このowner Sessionにはhostが作成した指示だけを渡してください。視聴者
  コメントなど未信頼の本文を直接転送しないでください。
- サンプルは既存のローカルCodexログインを使い、API keyを読み取ったり
  受け取ったりしません。

## 品質確認

自動テストは決定的なmock `AgentBackend` を使用します。Codexの起動、ネット
ワーク、ログインは必要ありません。

```sh
npm run fmt
npm run lint
npm test
npm run build
```
