# @aituber-onair/bushitsu-client

![@aituber-onair/bushitsu-client ロゴ](./images/aituber-onair-bushitsu-client.png)

[AITuber OnAir Bushitsu](https://github.com/shinshin86/aituber-onair-bushitsu) 向けのトランスポート非依存チャットクライアントです。以下の機能を提供します。

- 再接続・レート制限・メンション処理付きの WebSocket クライアント
- ブラウザ向けの React フック
- `ws` と組み合わせて使える Node.js ヘルパー
- Google Apps Script 用の送信専用ヘルパー
- 任意のランタイムを接続できる低レベルトランスポート API

npm ワークスペースとして配布されており、利用環境ごとにエントリーポイントが分かれています。

---

## インストール

```bash
npm install @aituber-onair/bushitsu-client
```

Node.js で利用する場合は、`ws` などの WebSocket 実装も追加してください。

```bash
npm install ws
```

---

## クイックスタート（React）

```tsx
import { useBushitsuClient } from '@aituber-onair/bushitsu-client/react';

function ChatComponent() {
  const { isConnected, sendMessage } = useBushitsuClient({
    serverUrl: 'http://localhost:8080',
    room: 'lobby',
    userName: 'Viewer',
    isEnabled: true,
    onComment: (text, from, isMention) => {
      console.log(`${from}: ${text}${isMention ? ' (メンション)' : ''}`);
    },
  });

  return (
    <div>
      <p>ステータス: {isConnected ? '接続中' : '未接続'}</p>
      <button onClick={() => sendMessage('React からこんにちは！')}>
        送信
      </button>
    </div>
  );
}
```

> **補足**: React 関連のエクスポートは `@aituber-onair/bushitsu-client/react` に配置しています。コアはランタイム非依存のまま保たれます。

---

## Node.js での利用

`createNodeBushitsuClient` と `ws` などの WebSocket 実装を組み合わせます。

```ts
import { createNodeBushitsuClient } from '@aituber-onair/bushitsu-client/node';
import WebSocket from 'ws';

const client = createNodeBushitsuClient({
  serverUrl: 'http://localhost:8080',
  room: 'lobby',
  userName: 'NodeBot',
  webSocketImpl: WebSocket as unknown as typeof WebSocket,
  onReceiveMessage: (text, from, isMention) => {
    console.log(`${from}: ${text}${isMention ? ' (メンション)' : ''}`);
  },
  onConnectionChange: (connected) => {
    console.log(`[status] connected=${connected}`);
  },
});

await client.connect();
client.sendMessage('Node.js からの挨拶です');
```

詳細なサンプルは `examples/node-basic` を参照してください（ハートビートや終了処理を含む完全なスクリプトです）。

---

## Google Apps Script（送信専用）

`createGasBushitsuMessageSender` は、送信のみを行いたい Apps Script 環境向けのヘルパーです。

```ts
import { createGasBushitsuMessageSender } from '@aituber-onair/bushitsu-client/gas';

const sender = createGasBushitsuMessageSender({
  endpoint: 'https://example.com/api/chat/send',
  room: 'lobby',
  userName: 'GasBot',
  fetchFn: (url, params) => UrlFetchApp.fetch(url, params),
});

sender.sendMessage('GAS からメッセージ！');
```

- `fetchFn` を省略すると `UrlFetchApp.fetch` が自動的に利用されます。
- 既定のペイロードは `{ room, userName, text, mentionTo }` です。
- 異なるスキーマが必要な場合は `payloadBuilder` で JSON をカスタマイズできます。

完全なスクリプトは `examples/gas-send-only` を参照してください。

---

## カスタムトランスポート

コアクライアントはトランスポート非依存です。`transport` に自前の実装を注入できます。

```ts
import { BushitsuClient } from '@aituber-onair/bushitsu-client';
import { createWebSocketTransport } from '@aituber-onair/bushitsu-client';
import SomePlatformWebSocket from 'some-platform-ws';

const transport = createWebSocketTransport((url) => new SomePlatformWebSocket(url));

const client = new BushitsuClient(
  {
    serverUrl: 'http://localhost:8080',
    room: 'lobby',
    userName: 'CustomClient',
    onReceiveMessage: (text, from) => console.log(from, text),
  },
  { transport },
);
```

クライアントは以下を内部で処理します。

- 再接続（指数バックオフ。定数は上書き可能）
- レート制限とメッセージ重複排除
- メンション検出とセッション管理

---

## API サマリ

### コア

- `BushitsuClient(options, dependencies?)`
  - `options.serverUrl`, `options.room`, `options.userName`
  - `options.onReceiveMessage(text, from, isMention)`（必須）
  - `options.onConnectionChange?(connected)`（任意）
  - `dependencies.transport?`: `BushitsuTransport` を実装した任意トランスポート
- `core/transport` にインターフェースとユーティリティを同梱
- レート制限や再接続に関連する定数は `client/constants` から取得可能

### React（`/react` エントリーポイント）

- `useBushitsuClient`
- `useBushitsuInitiative`（優先度付き送信ヘルパー）
- 型定義を再エクスポート

### Node（`/node` エントリーポイント）

- `createNodeBushitsuClient(options)`
  - `webSocketImpl` または `createWebSocket` を指定
  - 返り値は設定済みの `BushitsuClient`

### Google Apps Script（`/gas` エントリーポイント）

- `createGasBushitsuMessageSender(options)`
  - `fetchFn`、`payloadBuilder`、`contentType`、`muteHttpExceptions` に対応

### トランスポートユーティリティ

- `createBrowserWebSocketTransport()`
- `createWebSocketTransport(factory)`
- `WebSocketFactory` / `WebSocketLike` 型でカスタム統合が可能

---

## サンプル

- `examples/node-basic/` – `ws` を利用した最小限の Node.js ボット
- `examples/gas-send-only/` – Apps Script 用の送信専用サンプル
- `examples/react-basic/` – `useBushitsuClient` を利用した Vite + React UI
- その他の React 例は `packages/chat` ワークスペース（特に `examples` ディレクトリ）を参照

リポジトリ全体のセットアップ例:

```bash
npm ci
npm -w @aituber-onair/bushitsu-client run build
npm -w @aituber-onair/bushitsu-client run test
```

---

## ライセンス

MIT
