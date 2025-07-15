# @aituber-onair/bushitsu-client

![@aituber-onair/bushitsu-client logo](./images/aituber-onair-bushitsu-client.png)

A WebSocket client library for [AITuber OnAir Bushitsu](https://github.com/shinshin86/aituber-onair-bushitsu) — a real-time WebSocket chat server written in Go with room support, @mentions, and join/leave notifications for AITuber streaming environments. This package provides a lightweight WebSocket client and ergonomic React hooks to embed live chat into your application, with support for both browser and Node.js environments.

## Installation

```bash
npm install @aituber-onair/bushitsu-client
```

## Usage

### Basic WebSocket Chat

```typescript
import { useBushitsuClient } from '@aituber-onair/bushitsu-client';

function ChatComponent() {
  const { isConnected, sendMessage } = useBushitsuClient({
    serverUrl: 'ws://localhost:8080',
    room: 'lobby',
    userName: 'User',
    isEnabled: true,
    onComment: (text, userName, isMention) => {
      console.log(`${userName}: ${text}${isMention ? ' (mentioned)' : ''}`);
    },
  });

  const handleSend = () => {
    sendMessage('Hello, world!');
  };

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={handleSend}>Send Message</button>
    </div>
  );
}
```

### Initiative Messages (with Voice Synthesis)

```typescript
import { useBushitsuInitiative } from '@aituber-onair/bushitsu-client';

function InitiativeComponent({ sendMessage, onProcessMessage }) {
  const { sendInitiativeMessage } = useBushitsuInitiative({
    enabled: true,
    serverUrl: 'ws://localhost:8080',
    room: 'lobby',
    userName: 'AI',
    sendMessage,
    onProcessMessage, // Optional: process voice synthesis
  });

  const handleAnnouncement = async () => {
    await sendInitiativeMessage('Welcome to the chat room!');
  };

  return <button onClick={handleAnnouncement}>Send Announcement</button>;
}
```

### Priority-Based AI Streaming

```typescript
import { useBushitsuInitiative } from '@aituber-onair/bushitsu-client';

function AIStreamingComponent({ sendMessage, priorityQueue }) {
  // High priority for user responses
  const { sendInitiativeMessage: respondToUser } = useBushitsuInitiative({
    enabled: true,
    serverUrl: 'ws://localhost:8080',
    room: 'stream',
    userName: 'AITuber',
    sendMessage,
    priority: 2, // Higher priority than announcements
    runWithPriority: (priority, task) => {
      priorityQueue.add(task, priority);
    },
    onProcessMessage: async (message) => {
      await voiceService.speak(message, { emotion: 'friendly' });
    },
  });

  // Normal priority for general announcements
  const { sendInitiativeMessage: announce } = useBushitsuInitiative({
    enabled: true,
    serverUrl: 'ws://localhost:8080',
    room: 'stream',
    userName: 'AITuber',
    sendMessage,
    priority: 1, // Default priority
    runWithPriority: (priority, task) => {
      priorityQueue.add(task, priority);
    },
  });

  const handleUserQuestion = async (question: string) => {
    // This gets higher priority and executes before announcements
    await respondToUser(`Great question! ${question}`);
  };

  const handlePeriodicAnnouncement = async () => {
    // This gets normal priority
    await announce('Thanks for watching everyone!');
  };

  return (
    <div>
      <button onClick={() => handleUserQuestion('What is AI?')}>
        Respond to User
      </button>
      <button onClick={handlePeriodicAnnouncement}>
        Send Announcement
      </button>
    </div>
  );
}
```

## Node.js Usage

This package can also be used in Node.js environments for server-side chat automation, bots, or API integrations.

### Basic Node.js Example

```typescript
import { BushitsuClient } from '@aituber-onair/bushitsu-client';

const client = new BushitsuClient({
  serverUrl: 'ws://localhost:8080',
  room: 'lobby',
  userName: 'ChatBot',
  onComment: (text, userName, isMention) => {
    console.log(`${userName}: ${text}${isMention ? ' (mentioned)' : ''}`);
    
    // Auto-respond to mentions
    if (isMention) {
      client.sendMessage(`Hello ${userName}! How can I help you?`);
    }
  },
  onError: (error) => {
    console.error('WebSocket error:', error);
  },
  onClose: () => {
    console.log('Connection closed');
  }
});

// Connect and send initial message
client.connect();
client.sendMessage('Hello from Node.js bot!');

// Clean up on exit
process.on('SIGINT', () => {
  client.disconnect();
  process.exit(0);
});
```

### Chat Bot Example

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
      onError: (error) => console.error('Bot error:', error)
    });
  }

  private handleMessage(text: string, userName: string, isMention: boolean) {
    // Simple command system
    if (text.startsWith('!help')) {
      this.client.sendMessage('Available commands: !help, !time, !ping');
    } else if (text.startsWith('!time')) {
      this.client.sendMessage(`Current time: ${new Date().toLocaleString()}`);
    } else if (text.startsWith('!ping')) {
      this.client.sendMessage('Pong!');
    }
  }

  start() {
    this.client.connect();
    console.log('Chat bot started');
  }

  stop() {
    this.client.disconnect();
    console.log('Chat bot stopped');
  }
}

// Usage
const bot = new ChatBot('ws://localhost:8080', 'lobby', 'HelpBot');
bot.start();
```

## Next.js Integration

### API Routes

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
          console.log(`API received: ${user}: ${text}`);
        }
      });
      await client.connect();
    }

    try {
      client.sendMessage(message);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

### Server-Side Chat Integration

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
    // Log server-side messages
    console.log(`Server chat: ${userName}: ${text}`);
    
    // Integrate with your application logic
    // e.g., save to database, trigger notifications, etc.
  }

  async sendNotification(message: string) {
    this.client.sendMessage(`[System] ${message}`);
  }

  async connect() {
    await this.client.connect();
  }

  disconnect() {
    this.client.disconnect();
  }
}

// Usage in your Next.js app
export async function getServerSideProps() {
  const chatService = ServerChatService.getInstance();
  await chatService.connect();
  
  return {
    props: {}
  };
}
```

## Environment Requirements

### Browser Environment
- Modern browsers with WebSocket support
- No additional dependencies required

### Node.js Environment
- Node.js 16+ recommended
- WebSocket implementation is built-in (using native WebSocket API)
- For older Node.js versions, you may need to install a WebSocket polyfill:

```bash
npm install ws
# or
npm install websocket
```

### TypeScript Support
- Full TypeScript support included
- Type definitions are automatically available
- Compatible with both CommonJS and ES modules

## API Reference

### useBushitsuClient

Main hook for WebSocket chat functionality.

#### Options

- `serverUrl`: WebSocket server URL
- `room`: Room name to join
- `userName`: User display name
- `isEnabled`: Enable/disable connection
- `onComment`: Callback for received messages

#### Returns

- `isConnected`: Connection status
- `sendMessage(text, mentionTo?)`: Send message function
- `getLastMentionUser()`: Get last user who mentioned you
- `resetRateLimit()`: Reset rate limiting
- `forceReconnect()`: Force reconnection

### useBushitsuInitiative

Hook for sending initiative messages with optional voice synthesis.

#### Options

- `enabled`: Enable/disable feature
- `serverUrl`: WebSocket server URL
- `room`: Room name
- `userName`: User display name
- `sendMessage`: Message sending function
- `onProcessMessage?`: Voice processing callback
- `runWithPriority?`: Priority execution function
- `priority?`: Execution priority

#### Returns

- `sendInitiativeMessage(message, mentionTo?, skipVoice?)`: Send with voice
- `sendDirectMessage(message, mentionTo?)`: Send without voice
- `canSendMessage()`: Check if can send
- `isEnabled`: Feature status

## Priority System

The priority system is designed for AI live streaming environments where multiple tasks (chat responses, announcements, voice synthesis) need to be executed in order of importance. This is especially useful for AITuber applications where the AI needs to balance different types of interactions.

### How Priority Works

The priority system is **optional** and integrates with external priority queue systems. If no priority system is provided, messages are processed immediately.

```typescript
// Basic usage (no priority - immediate execution)
const { sendInitiativeMessage } = useBushitsuInitiative({
  enabled: true,
  serverUrl: 'ws://localhost:8080',
  room: 'lobby',
  userName: 'AI',
  sendMessage,
});

// Advanced usage with priority system
const { sendInitiativeMessage } = useBushitsuInitiative({
  enabled: true,
  serverUrl: 'ws://localhost:8080',
  room: 'lobby',
  userName: 'AI',
  sendMessage,
  priority: 2, // Higher priority than default (1)
  runWithPriority: (priority, task) => {
    // Your priority queue implementation
    priorityQueue.add(task, priority);
  },
});
```

### Priority Levels

Common priority levels used in AI streaming applications:

- **Priority 1 (Default)**: Announcements and general messages
- **Priority 2**: Chat responses to user messages
- **Priority 3**: Urgent notifications or system messages
- **Priority 0**: Background tasks (lower priority)

### Real-World Example

```typescript
// AI streaming scenario with priority management
class AIStreamingBot {
  private priorityQueue = new PriorityQueue();

  setupChat() {
    // High priority for user mention responses
    const { sendInitiativeMessage: sendResponse } = useBushitsuInitiative({
      enabled: true,
      serverUrl: 'ws://localhost:8080',
      room: 'stream',
      userName: 'AITuber',
      sendMessage: this.sendMessage,
      priority: 2, // Higher priority than announcements
      runWithPriority: (priority, task) => {
        this.priorityQueue.add(task, priority);
      },
    });

    // Normal priority for general announcements
    const { sendInitiativeMessage: sendAnnouncement } = useBushitsuInitiative({
      enabled: true,
      serverUrl: 'ws://localhost:8080',
      room: 'stream',
      userName: 'AITuber',
      sendMessage: this.sendMessage,
      priority: 1, // Default priority
      runWithPriority: (priority, task) => {
        this.priorityQueue.add(task, priority);
      },
    });

    // Usage
    sendResponse('Thanks for the question!'); // Executes with priority 2
    sendAnnouncement('Welcome to the stream!'); // Executes with priority 1
  }
}
```

### Integration with Voice Synthesis

The priority system works seamlessly with voice synthesis, ensuring that both chat messages and voice generation respect the priority order:

```typescript
const { sendInitiativeMessage } = useBushitsuInitiative({
  enabled: true,
  serverUrl: 'ws://localhost:8080',
  room: 'lobby',
  userName: 'AI',
  sendMessage,
  priority: 2,
  runWithPriority: (priority, task) => {
    // Both chat and voice synthesis respect priority
    voiceQueue.add(task, priority);
  },
  onProcessMessage: async (message) => {
    // This also gets prioritized
    await voiceService.speak(message);
  },
});
```

## Features

- **Auto-reconnection**: Automatically reconnects on connection loss
- **Rate limiting**: Prevents message flooding
- **Message deduplication**: Filters duplicate messages
- **Mention support**: Handle @mentions in messages
- **Session management**: Tracks user sessions
- **Priority execution**: Optional integration with priority queue systems for AI streaming

## License

MIT