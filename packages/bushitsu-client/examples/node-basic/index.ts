import { createNodeBushitsuClient } from '@aituber-onair/bushitsu-client';
import WebSocket from 'ws';

const serverUrl = process.env.BUSHITSU_SERVER_URL;
const room = process.env.BUSHITSU_ROOM;
const userName = process.env.BUSHITSU_USER_NAME ?? 'NodeClient';

if (!serverUrl) {
  console.error('BUSHITSU_SERVER_URL is required.');
  process.exit(1);
}

if (!room) {
  console.error('BUSHITSU_ROOM is required.');
  process.exit(1);
}

async function main() {
  const client = createNodeBushitsuClient({
    serverUrl,
    room,
    userName,
    webSocketImpl: WebSocket as unknown as typeof WebSocket,
    onReceiveMessage: (text, from, isMention) => {
      const mentionPrefix = isMention ? '(mention) ' : '';
      console.log(`[message] ${mentionPrefix}${from}: ${text}`);
    },
    onConnectionChange: (connected) => {
      console.log(`[status] connected=${connected}`);
    },
  });

  await client.connect();
  console.log('[status] connection established');

  client.sendMessage('Hello from Node.js example!');

  const heartbeat = setInterval(() => {
    client.sendMessage('ping from Node.js');
  }, 30000);

  const shutdown = () => {
    clearInterval(heartbeat);
    client.disconnect();
    console.log('[status] disconnected');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[error] example failed:', error);
  process.exit(1);
});
