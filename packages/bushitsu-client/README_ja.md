# @aituber-onair/bushitsu-client

![@aituber-onair/bushitsu-client ロゴ](./images/aituber-onair-bushitsu-client.png)

[AITuber OnAir Bushitsu](https://github.com/shinshin86/aituber-onair-bushitsu) 用の WebSocket クライアントライブラリです。AITuber OnAir BushitsuはGoで書かれたリアルタイムWebSocketチャットサーバーで、ルーム対応、@メンション、参加/退出通知機能を持つAITuberストリーミング環境向けのサーバーです。このパッケージは軽量なWebSocketクライアントとReactフックを提供し、ライブチャットをアプリケーションに組み込めます。ブラウザとNode.js環境の両方をサポートします。

## インストール

```bash
npm install @aituber-onair/bushitsu-client
```

## 使用方法

### 基本的なWebSocketチャット

```typescript
import { useBushitsuClient } from '@aituber-onair/bushitsu-client';

function ChatComponent() {
  const { isConnected, sendMessage } = useBushitsuClient({
    serverUrl: 'ws://localhost:8080',
    room: 'lobby',
    userName: 'User',
    isEnabled: true,
    onComment: (text, userName, isMention) => {
      console.log(`${userName}: ${text}${isMention ? ' (メンション)' : ''}`);
    },
  });

  const handleSend = () => {
    sendMessage('こんにちは、世界！');
  };

  return (
    <div>
      <p>ステータス: {isConnected ? '接続中' : '切断中'}</p>
      <button onClick={handleSend}>メッセージ送信</button>
    </div>
  );
}
```

### 音声生成を組み込んだ例

```typescript
import { useBushitsuInitiative } from '@aituber-onair/bushitsu-client';

function InitiativeComponent({ sendMessage, onProcessMessage }) {
  const { sendInitiativeMessage } = useBushitsuInitiative({
    enabled: true,
    serverUrl: 'ws://localhost:8080',
    room: 'lobby',
    userName: 'AI',
    sendMessage,
    onProcessMessage, // オプション: 音声合成の処理
  });

  const handleAnnouncement = async () => {
    await sendInitiativeMessage('チャットルームへようこそ！');
  };

  return <button onClick={handleAnnouncement}>アナウンス送信</button>;
}
```

### 優先度を考慮したAIストリーミングの実装例

```typescript
import { useBushitsuInitiative } from '@aituber-onair/bushitsu-client';

function AIStreamingComponent({ sendMessage, priorityQueue }) {
  // ユーザー応答の高優先度
  const { sendInitiativeMessage: respondToUser } = useBushitsuInitiative({
    enabled: true,
    serverUrl: 'ws://localhost:8080',
    room: 'stream',
    userName: 'AITuber',
    sendMessage,
    priority: 2, // アナウンスより高い優先度
    runWithPriority: (priority, task) => {
      priorityQueue.add(task, priority);
    },
    onProcessMessage: async (message) => {
      await voiceService.speak(message, { emotion: 'friendly' });
    },
  });

  // 一般的なアナウンスの通常優先度
  const { sendInitiativeMessage: announce } = useBushitsuInitiative({
    enabled: true,
    serverUrl: 'ws://localhost:8080',
    room: 'stream',
    userName: 'AITuber',
    sendMessage,
    priority: 1, // デフォルト優先度
    runWithPriority: (priority, task) => {
      priorityQueue.add(task, priority);
    },
  });

  const handleUserQuestion = async (question: string) => {
    // これは高い優先度を持ち、アナウンスより先に実行される
    await respondToUser(`素晴らしい質問ですね！ ${question}`);
  };

  const handlePeriodicAnnouncement = async () => {
    // これは通常の優先度
    await announce('みなさん、ご視聴ありがとうございます！');
  };

  return (
    <div>
      <button onClick={() => handleUserQuestion('AIとは何ですか？')}>
        ユーザーに応答
      </button>
      <button onClick={handlePeriodicAnnouncement}>
        アナウンス送信
      </button>
    </div>
  );
}
```

## Node.js での使用

このパッケージは、サーバーサイドチャット自動化、ボット、API統合のためにNode.js環境でも使用できます。

### 基本的なNode.js例

```typescript
import { BushitsuClient } from '@aituber-onair/bushitsu-client';

const client = new BushitsuClient({
  serverUrl: 'ws://localhost:8080',
  room: 'lobby',
  userName: 'ChatBot',
  onComment: (text, userName, isMention) => {
    console.log(`${userName}: ${text}${isMention ? ' (メンション)' : ''}`);
    
    // メンションに自動応答
    if (isMention) {
      client.sendMessage(`こんにちは${userName}さん！何かお手伝いできることはありますか？`);
    }
  },
  onError: (error) => {
    console.error('WebSocketエラー:', error);
  },
  onClose: () => {
    console.log('接続が閉じられました');
  }
});

// 接続して初期メッセージを送信
client.connect();
client.sendMessage('Node.jsボットからこんにちは！');

// 終了時のクリーンアップ
process.on('SIGINT', () => {
  client.disconnect();
  process.exit(0);
});
```

### チャットボットの例

```typescript
import { BushitsuClient } from '@aituber-onair/bushitsu-client';

class ChatBot {
  private client: BushitsuClient;

  constructor(serverUrl: string, room: string, botName: string) {
    this.client = new BushitsuClient({
      serverUrl,
      room,
      userName: botName,
      onComment: this.handleMessage.bind(this),
      onError: (error) => console.error('ボットエラー:', error)
    });
  }

  private handleMessage(text: string, userName: string, isMention: boolean) {
    // シンプルなコマンドシステム
    if (text.startsWith('!help')) {
      this.client.sendMessage('利用可能なコマンド: !help, !time, !ping');
    } else if (text.startsWith('!time')) {
      this.client.sendMessage(`現在時刻: ${new Date().toLocaleString()}`);
    } else if (text.startsWith('!ping')) {
      this.client.sendMessage('Pong!');
    }
  }

  start() {
    this.client.connect();
    console.log('チャットボットが開始されました');
  }

  stop() {
    this.client.disconnect();
    console.log('チャットボットが停止されました');
  }
}

// 使用方法
const bot = new ChatBot('ws://localhost:8080', 'lobby', 'HelpBot');
bot.start();
```

## Next.js統合

### APIルート

```typescript
// pages/api/chat/send.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { BushitsuClient } from '@aituber-onair/bushitsu-client';

let client: BushitsuClient | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { message, room, userName } = req.body;

    if (!client) {
      client = new BushitsuClient({
        serverUrl: process.env.WEBSOCKET_SERVER_URL || 'ws://localhost:8080',
        room,
        userName: 'API',
        onComment: (text, user, mention) => {
          console.log(`API受信: ${user}: ${text}`);
        }
      });
      await client.connect();
    }

    try {
      client.sendMessage(message);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'メッセージ送信に失敗しました' });
    }
  } else {
    res.status(405).json({ error: 'メソッドが許可されていません' });
  }
}
```

### サーバーサイドチャット統合

```typescript
// lib/chatService.ts
import { BushitsuClient } from '@aituber-onair/bushitsu-client';

export class ServerChatService {
  private static instance: ServerChatService;
  private client: BushitsuClient;

  private constructor() {
    this.client = new BushitsuClient({
      serverUrl: process.env.WEBSOCKET_SERVER_URL || 'ws://localhost:8080',
      room: 'main',
      userName: 'Server',
      onComment: this.handleServerMessage.bind(this)
    });
  }

  static getInstance(): ServerChatService {
    if (!ServerChatService.instance) {
      ServerChatService.instance = new ServerChatService();
    }
    return ServerChatService.instance;
  }

  private handleServerMessage(text: string, userName: string, isMention: boolean) {
    // サーバーサイドメッセージをログ
    console.log(`サーバーチャット: ${userName}: ${text}`);
    
    // アプリケーションロジックと統合
    // 例: データベースに保存、通知のトリガーなど
  }

  async sendNotification(message: string) {
    this.client.sendMessage(`[システム] ${message}`);
  }

  async connect() {
    await this.client.connect();
  }

  disconnect() {
    this.client.disconnect();
  }
}

// Next.jsアプリでの使用方法
export async function getServerSideProps() {
  const chatService = ServerChatService.getInstance();
  await chatService.connect();
  
  return {
    props: {}
  };
}
```

## 環境要件

### ブラウザ環境
- WebSocketサポートのある最新ブラウザ
- 追加の依存関係は不要

### Node.js環境
- Node.js 16以上を推奨
- WebSocket実装は組み込み（ネイティブWebSocket APIを使用）
- 古いNode.jsバージョンの場合、WebSocketポリフィルが必要な場合があります:

```bash
npm install ws
# または
npm install websocket
```

### TypeScriptサポート
- 完全なTypeScriptサポートを含む
- 型定義は自動的に利用可能
- CommonJSとESモジュールの両方に対応

## APIリファレンス

### useBushitsuClient

WebSocketチャット機能のメインフック。

#### オプション

- `serverUrl`: WebSocketサーバーURL
- `room`: 参加するルーム名
- `userName`: ユーザー表示名
- `isEnabled`: 接続の有効/無効
- `onComment`: 受信メッセージのコールバック

#### 戻り値

- `isConnected`: 接続状態
- `sendMessage(text, mentionTo?)`: メッセージ送信関数
- `getLastMentionUser()`: 最後にメンションしたユーザーを取得
- `resetRateLimit()`: レート制限をリセット
- `forceReconnect()`: 強制的に再接続

### useBushitsuInitiative

音声合成オプション付きイニシアチブメッセージ送信用フック。

#### オプション

- `enabled`: 機能の有効/無効
- `serverUrl`: WebSocketサーバーURL
- `room`: ルーム名
- `userName`: ユーザー表示名
- `sendMessage`: メッセージ送信関数
- `onProcessMessage?`: 音声処理コールバック
- `runWithPriority?`: 優先度実行関数
- `priority?`: 実行優先度

#### 戻り値

- `sendInitiativeMessage(message, mentionTo?, skipVoice?)`: 音声付き送信
- `sendDirectMessage(message, mentionTo?)`: 音声なし送信
- `canSendMessage()`: 送信可能かチェック
- `isEnabled`: 機能状態

## 優先度システム

優先度システムは、複数のタスク（チャット応答、アナウンス、音声合成）を重要度順に実行する必要があるAIライブストリーミング環境向けに設計されています。これは、AIが異なるタイプのインタラクションをバランスよく処理する必要があるAITuberアプリケーションで特に有用です。

### 優先度の仕組み

優先度システムは**オプション**で、外部の優先度キューシステムと統合します。優先度システムが提供されない場合、メッセージは即座に処理されます。

```typescript
// 基本使用（優先度なし - 即座に実行）
const { sendInitiativeMessage } = useBushitsuInitiative({
  enabled: true,
  serverUrl: 'ws://localhost:8080',
  room: 'lobby',
  userName: 'AI',
  sendMessage,
});

// 優先度システムを使用した高度な使用方法
const { sendInitiativeMessage } = useBushitsuInitiative({
  enabled: true,
  serverUrl: 'ws://localhost:8080',
  room: 'lobby',
  userName: 'AI',
  sendMessage,
  priority: 2, // デフォルト（1）より高い優先度
  runWithPriority: (priority, task) => {
    // あなたの優先度キュー実装
    priorityQueue.add(task, priority);
  },
});
```

### 優先度レベル

AIストリーミングアプリケーションで使用される一般的な優先度レベル:

- **優先度1（デフォルト）**: アナウンスと一般的なメッセージ
- **優先度2**: ユーザーメッセージへのチャット応答
- **優先度3**: 緊急通知やシステムメッセージ
- **優先度0**: バックグラウンドタスク（低優先度）

### 実用例

```typescript
// 優先度管理付きAIストリーミングシナリオ
class AIStreamingBot {
  private priorityQueue = new PriorityQueue();

  setupChat() {
    // ユーザーメンション応答の高優先度
    const { sendInitiativeMessage: sendResponse } = useBushitsuInitiative({
      enabled: true,
      serverUrl: 'ws://localhost:8080',
      room: 'stream',
      userName: 'AITuber',
      sendMessage: this.sendMessage,
      priority: 2, // アナウンスより高い優先度
      runWithPriority: (priority, task) => {
        this.priorityQueue.add(task, priority);
      },
    });

    // 一般的なアナウンスの通常優先度
    const { sendInitiativeMessage: sendAnnouncement } = useBushitsuInitiative({
      enabled: true,
      serverUrl: 'ws://localhost:8080',
      room: 'stream',
      userName: 'AITuber',
      sendMessage: this.sendMessage,
      priority: 1, // デフォルト優先度
      runWithPriority: (priority, task) => {
        this.priorityQueue.add(task, priority);
      },
    });

    // 使用方法
    sendResponse('質問ありがとうございます！'); // 優先度2で実行
    sendAnnouncement('ストリームへようこそ！'); // 優先度1で実行
  }
}
```

### 音声合成との統合

優先度システムは音声合成とシームレスに動作し、チャットメッセージと音声生成の両方が優先度順序を尊重します:

```typescript
const { sendInitiativeMessage } = useBushitsuInitiative({
  enabled: true,
  serverUrl: 'ws://localhost:8080',
  room: 'lobby',
  userName: 'AI',
  sendMessage,
  priority: 2,
  runWithPriority: (priority, task) => {
    // チャットと音声合成の両方が優先度を尊重
    voiceQueue.add(task, priority);
  },
  onProcessMessage: async (message) => {
    // これも優先度が付けられる
    await voiceService.speak(message);
  },
});
```

## 機能

- **自動再接続**: 接続切断時の自動再接続
- **レート制限**: メッセージフラッディングの防止
- **メッセージ重複排除**: 重複メッセージのフィルタリング
- **メンションサポート**: メッセージ内の@メンションの処理
- **セッション管理**: ユーザーセッションの追跡
- **優先度実行**: AIストリーミング用の優先度キューシステムとのオプション統合

## ライセンス

MIT