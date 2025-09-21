# @aituber-onair/bushitsu-client

![@aituber-onair/bushitsu-client logo](./images/aituber-onair-bushitsu-client.png)

A transport-agnostic chat client for [AITuber OnAir Bushitsu](https://github.com/shinshin86/aituber-onair-bushitsu). It provides:

- A reconnecting WebSocket client with rate limiting and mention handling
- React hooks for browser apps
- A Node.js helper that works with `ws`
- A send-only helper tailored for Google Apps Script
- Low-level transport adapters so you can plug in any runtime

The package is distributed as an npm workspace and can be imported from environment-specific entry points.

---

## Installation

```bash
npm install @aituber-onair/bushitsu-client
```

If you plan to use the Node.js helper, also install a WebSocket implementation such as [`ws`](https://www.npmjs.com/package/ws).

```bash
npm install ws
```

---

## Quick Start (React)

```tsx
import { useBushitsuClient } from '@aituber-onair/bushitsu-client/react';

function ChatComponent() {
  const { isConnected, sendMessage } = useBushitsuClient({
    serverUrl: 'http://localhost:8080',
    room: 'lobby',
    userName: 'Viewer',
    isEnabled: true,
    onComment: (text, from, isMention) => {
      console.log(`${from}: ${text}${isMention ? ' (mention)' : ''}`);
    },
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={() => sendMessage('Hello from React!')}>
        Send
      </button>
    </div>
  );
}
```

> **Note**: React-specific exports live in `@aituber-onair/bushitsu-client/react` to keep the core runtime-agnostic.

---

## Node.js Usage

Use the `createNodeBushitsuClient` helper together with a WebSocket implementation such as `ws`.

```ts
import { createNodeBushitsuClient } from '@aituber-onair/bushitsu-client/node';
import WebSocket from 'ws';

const client = createNodeBushitsuClient({
  serverUrl: 'http://localhost:8080',
  room: 'lobby',
  userName: 'NodeBot',
  webSocketImpl: WebSocket as unknown as typeof WebSocket,
  onReceiveMessage: (text, from, isMention) => {
    console.log(`${from}: ${text}${isMention ? ' (mention)' : ''}`);
  },
  onConnectionChange: (connected) => {
    console.log(`[status] connected=${connected}`);
  },
});

await client.connect();
client.sendMessage('Hello from Node.js');
```

See `examples/node-basic` for a full runnable script with graceful shutdown and heartbeats.

---

## Google Apps Script (Send Only)

`createGasBushitsuMessageSender` provides a thin helper for Apps Script environments where only outgoing messages are required.

```ts
import { createGasBushitsuMessageSender } from '@aituber-onair/bushitsu-client/gas';

const sender = createGasBushitsuMessageSender({
  endpoint: 'https://example.com/api/chat/send',
  room: 'lobby',
  userName: 'GasBot',
  fetchFn: (url, params) => UrlFetchApp.fetch(url, params),
});

sender.sendMessage('Hello from GAS!');
```

- Uses `UrlFetchApp.fetch` by default if you do not pass `fetchFn`
- The default payload is `{ room, userName, text, mentionTo }`
- Pass a `payloadBuilder` when your bridge expects a custom JSON schema

See `examples/gas-send-only` for a complete Apps Script snippet.

---

## Custom Transports

The core client is transport-agnostic. Supply your own implementation via the `transport` dependency injection point.

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

The client handles:

- Reconnection with exponential backoff (configurable constants available)
- Message deduplication and rate limiting
- Mention filtering and session tracking

---

## API Overview

### Core

- `BushitsuClient(options, dependencies?)`
  - `options.serverUrl`: Base HTTP/HTTPS URL to your Bushitsu server
  - `options.room`, `options.userName`
  - `options.onReceiveMessage(text, from, isMention)` (required)
  - `options.onConnectionChange?(connected)` (optional)
  - `dependencies.transport?`: Custom transport implementing `BushitsuTransport`
- `BushitsuTransport` interface and helpers in `core/transport`
- Constants (rate limits, reconnection) exported from `client/constants`

### React (`/react` entry point)

- `useBushitsuClient`
- `useBushitsuInitiative` (priority-aware messaging helper)
- Shared types re-exported for convenience

### Node (`/node` entry point)

- `createNodeBushitsuClient(options)`
  - Accepts `webSocketImpl` or `createWebSocket` factory
  - Returns a configured `BushitsuClient`

### Google Apps Script (`/gas` entry point)

- `createGasBushitsuMessageSender(options)`
  - Supports `fetchFn`, `payloadBuilder`, `contentType`, and `muteHttpExceptions`

### Transport Utilities

- `createBrowserWebSocketTransport()`
- `createWebSocketTransport(factory)`
- `WebSocketFactory`, `WebSocketLike` types for custom integrations

---

## Examples

- `examples/node-basic/` – minimal Node.js bot using `ws`
- `examples/gas-send-only/` – send-only Apps Script functions
- `examples/react-basic/` – Vite + React UI hooked up to `useBushitsuClient`
- Additional React demos live in the `packages/chat` workspace

Run the repository setup:

```bash
npm ci
npm -w @aituber-onair/bushitsu-client run build
npm -w @aituber-onair/bushitsu-client run test
```

---

## License

MIT
