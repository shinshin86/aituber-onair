import { TarotScene } from './engine/ThreeSetup.js';
import { TarotClient } from './engine/ws.js';
import type { WsMessage } from './types.js';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const wsState = document.getElementById('ws-state')!;
const spreadName = document.getElementById('spread-name')!;

const scene = new TarotScene(canvas);

function showSpreadTitle(name: string) {
  spreadName.textContent = name;
  spreadName.style.opacity = '1';
}

const client = new TarotClient(
  (msg: WsMessage) => {
    console.log(`[tarot-viewer] ws frame: ${msg.type}`);
    switch (msg.type) {
      case 'READING_START':
      case 'READING_STATE':
        showSpreadTitle(msg.payload.spread_name);
        void scene.showReading(msg.payload);
        break;
      case 'READING_DONE':
        scene.markDone();
        break;
      case 'SESSION_RESET':
        spreadName.style.opacity = '0';
        scene.reset();
        break;
    }
  },
  (status) => {
    wsState.className = status === 'open' ? 'ok' : 'err';
    wsState.textContent = status === 'open' ? 'WS conectado' : 'WS desconectado';
  }
);
client.connect();
