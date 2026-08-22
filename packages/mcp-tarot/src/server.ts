import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CardDeck } from './services/CardDeck.js';
import { SpreadEngine, SPREADS } from './services/SpreadEngine.js';
import type { DrawnCard } from './services/CardDeck.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const WS_PORT = Number(process.env.TAROT_WS_PORT ?? 3001);
const VIEWER_PORT = Number(process.env.TAROT_VIEWER_PORT ?? 3002);
// src/server.ts and dist/server.js both sit one dir inside the package root,
// and the package root lives in packages/ → two levels up is the monorepo packages dir.
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VIEWER_DIR = path.join(ROOT_DIR, 'tarot-viewer/dist');

type ReadingState = 'IDLE' | 'SHUFFLING' | 'REVEALING' | 'INTERPRETING' | 'COMPLETE';

interface Reading {
  reading_id: string;
  spread_type: string;
  spread_name: string;
  cards: Array<{
    position_id: number;
    position_name: string;
    position_label: string;
    card_id: string;
    card_name: string;
    arcanum: string;
    reversed: boolean;
    upright_meaning: string;
    reversed_meaning: string;
    keywords: string[];
    x: number;
    y: number;
    rot: number;
  }>;
  card_scale: number;
  created_at: string;
  state: ReadingState;
}

// ---------------------------------------------------------------------------
// Session manager (state machine + WS broadcast)
// ---------------------------------------------------------------------------
class TarotSession {
  private deck: CardDeck;
  private engine: SpreadEngine;
  private state: ReadingState = 'IDLE';
  private current: Reading | null = null;
  private wss: WebSocketServer;
  private minIntervalMs = 30_000;
  private lastStart = 0;

  constructor() {
    this.deck = CardDeck.load();
    this.engine = new SpreadEngine();
    this.wss = new WebSocketServer({ port: WS_PORT, path: '/ws/tarot' });
    this.wss.on('error', (err) => {
      // Never let a port conflict kill the MCP stdio server: tools keep working,
      // the 3D viewer just won't receive pushes until a free port is configured.
      console.error(`[tarot] WARN WS bridge on port ${WS_PORT} failed:`, (err as Error).message);
      console.error(`[tarot]      set TAROT_WS_PORT to a free port to enable 3D push`);
    });
    this.wss.on('connection', () => {
      // Re-emit active reading so a freshly-opened OBS tab syncs
      if (this.current) this.sendToAll({ type: 'READING_STATE', payload: this.current });
      console.error(`[tarot] observer connected (port ${WS_PORT}/ws/tarot)`);
    });
    console.error(`[tarot] WS bridge on ws://localhost:${WS_PORT}/ws/tarot`);
  }

  get currentReading(): Reading | null {
    return this.current;
  }

  private sendToAll(msg: object) {
    const data = JSON.stringify(msg);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }

  /** Guard: min interval between public readings (live-stream etiquette). */
  private assertRateLimit() {
    const now = Date.now();
    if (now - this.lastStart < this.minIntervalMs && this.state === 'REVEALING') {
      throw new Error('A reading is already in progress. Wait for it to finish.');
    }
    this.lastStart = now;
  }

  static parseGiftToSpread(gift: string): string {
    const g = gift.toLowerCase();
    if (/(superchat|super chat|donacion|donación)/.test(g)) {
      const amount = Number(g.match(/(\d{3,})/)?.[1] ?? 0);
      if (amount >= 500) return 'arbol_vida';
      if (amount >= 100) return 'cruz_celta';
      return 'tres_cartas_pasado_presente_futuro';
    }
    if (/rose|margarita|marguerite/.test(g)) return 'una_carta';
    if (/lily|lila/.test(g)) return 'tres_cartas_situacion_obstaculo_consejo';
    if (/lion|leon/.test(g)) return 'cruz_celta';
    if (/rocket|cohete/.test(g)) return 'tirada_egipcia';
    if (/galaxy|galaxia/.test(g)) return 'arbol_vida';
    return 'tres_cartas_pasado_presente_futuro';
  }

  selectSpread(input: {
    spread_type?: string;
    gift?: string;
  }): { spread_type: string; name: string; cards: number } {
    let spreadType = input.spread_type;
    if (!spreadType) {
      if (!input.gift) throw new Error('Provide spread_type or a gift name');
      spreadType = TarotSession.parseGiftToSpread(input.gift);
    }
    const layout = this.engine.calculateLayout(spreadType);
    return { spread_type: spreadType, name: layout.name, cards: layout.cards_count };
  }

  drawReading(input: { spread_type: string; seed?: number }): Reading {
    this.assertRateLimit();
    const layout = this.engine.calculateLayout(input.spread_type);
    this.state = 'SHUFFLING';
    this.deck.shuffle(input.seed);

    const drawn = this.deck.draw(layout.cards_count, input.seed);
    const cards = drawn.map((dc: DrawnCard, i) => {
      const pos = layout.positions[i];
      return {
        position_id: pos.id,
        position_name: pos.name,
        position_label: pos.label,
        card_id: dc.card.id,
        card_name: dc.card.name,
        arcanum: dc.card.arcanum,
        reversed: dc.reversed,
        upright_meaning: dc.card.upright_meaning,
        reversed_meaning: dc.card.reversed_meaning,
        keywords: dc.card.keywords,
        x: pos.x,
        y: pos.y,
        rot: pos.rot
      };
    });

    this.current = {
      reading_id: randomUUID(),
      spread_type: layout.id,
      spread_name: layout.name,
      cards,
      card_scale: layout.card_scale,
      created_at: new Date().toISOString(),
      state: 'REVEALING'
    };
    this.state = 'REVEALING';

    this.sendToAll({ type: 'READING_START', payload: this.current });
    console.error(`[tarot] reading ${this.current.reading_id} → ${layout.id} (${cards.length} cards)`);
    return this.current;
  }

  getReading(readingId: string): Reading {
    if (!this.current || this.current.reading_id !== readingId) {
      throw new Error(`No reading found with id ${readingId}`);
    }
    return this.current;
  }

  completeReading(): void {
    if (this.current) {
      this.current.state = 'COMPLETE';
      this.state = 'COMPLETE';
      this.sendToAll({ type: 'READING_DONE', payload: { reading_id: this.current.reading_id } });
    }
    setTimeout(() => {
      this.state = 'IDLE';
      this.current = null;
    }, 60_000);
  }

  reset(): void {
    this.current = null;
    this.state = 'IDLE';
    this.deck.shuffle();
    this.sendToAll({ type: 'SESSION_RESET', payload: {} });
  }

  getSpreadCatalog() {
    return SpreadEngine.list();
  }
}

// ---------------------------------------------------------------------------
// MCP tools
// ---------------------------------------------------------------------------
const session = new TarotSession();

const SPREAD_IDS = Object.keys(SPREADS) as unknown as [string, ...string[]];

const TOOL_DEFS = [
  {
    name: 'tarot_list_spreads',
    description: 'List all available tarot spreads with name and card count',
    inputSchema: z.object({}).passthrough()
  },
  {
    name: 'tarot_select_spread',
    description: 'Pick a spread by explicit type or by live-gift name (YouTube/BSky style gift mapping)',
    inputSchema: z.object({
      spread_type: z.enum(SPREAD_IDS).optional(),
      gift: z.string().optional(),
      trigger: z.enum(['regalo', 'comando', 'temporizador']).default('regalo')
    }).refine((o) => o.spread_type || o.gift, { message: 'Provide spread_type or gift' })
  },
  {
    name: 'tarot_draw_cards',
    description: 'Shuffle the deck and draw cards for a spread. Returns the full reading payload (cards + 3D positions) which is broadcast to the 3D viewer.',
    inputSchema: z.object({
      spread_type: z.enum(SPREAD_IDS),
      seed: z.number().int().optional(),
      allow_reversed: z.boolean().default(true)
    })
  },
  {
    name: 'tarot_get_reading',
    description: 'Get the active/last reading with card meanings for the LLM to interpret',
    inputSchema: z.object({
      reading_id: z.string().uuid().optional()
    })
  },
  {
    name: 'tarot_complete_reading',
    description: 'Mark the active reading as done (viewer shows result, LLM may narrate)',
    inputSchema: z.object({}).passthrough()
  },
  {
    name: 'tarot_reset_session',
    description: 'Reset session and reshuffle deck',
    inputSchema: z.object({}).passthrough()
  }
];

const mcpTools = TOOL_DEFS.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: toJsonSchema(t.inputSchema)
}));

function toJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // Unwrap .refine() / ZodEffects / .passthrough() wrappers down to the object
  let s: z.ZodTypeAny = schema;
  while (s && (s as { _def?: { typeName?: string } })._def?.typeName === 'ZodEffects') {
    s = (s as unknown as { _def: { schema: z.ZodTypeAny } })._def.schema;
  }
  const shape = (s as { _def?: { shape?: () => Record<string, z.ZodTypeAny> } })._def?.shape?.() ?? {};
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    const d = (value as { _def: { typeName: string } })._def.typeName;
    if (d === 'ZodEnum') {
      const opts = (value as { _def: { values: readonly string[] } })._def.values;
      properties[key] = { type: 'string', enum: [...opts] };
    } else if (d === 'ZodNumber') {
      properties[key] = { type: 'number' };
    } else if (d === 'ZodBoolean') {
      properties[key] = { type: 'boolean' };
    } else {
      properties[key] = { type: 'string' };
    }
    if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
      required.push(key);
    }
  }
  return { type: 'object', properties, required };
}

function runTool(name: string, rawArgs: Record<string, unknown>) {
  const def = TOOL_DEFS.find((t) => t.name === name);
  if (!def) throw new Error(`Unknown tool: ${name}`);
  const args = def.inputSchema.parse(rawArgs ?? {});
  switch (name) {
    case 'tarot_list_spreads':
      return { spread_catalog: session.getSpreadCatalog() };
    case 'tarot_select_spread':
      return session.selectSpread(args as { spread_type?: string; gift?: string });
    case 'tarot_draw_cards':
      return session.drawReading(args as { spread_type: string; seed?: number });
    case 'tarot_get_reading':
      return (args as { reading_id?: string }).reading_id
        ? session.getReading((args as { reading_id: string }).reading_id)
        : (session.currentReading ? { ...session.currentReading } : { error: 'No active reading' });
    case 'tarot_complete_reading':
      session.completeReading();
      return { status: 'complete' };
    case 'tarot_reset_session':
      session.reset();
      return { status: 'reset' };
    default:
      throw new Error(`Unhandled tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// MCP server bootstrap
// ---------------------------------------------------------------------------
const server = new Server(
  { name: 'pitonisa-mcp-tarot', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: mcpTools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = runTool(name, (args ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: 'text', text: `Error: ${msg}` }] };
  }
});

async function startViewerServer() {
  const http = await import('node:http');
  const fs = await import('node:fs/promises');
  const mime: Record<string, string> = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm'
  };
  const srv = http.createServer(async (req, res) => {
    let url = (req.url ?? '/').split('?')[0];
    if (url === '/') url = '/index.html';
    const filePath = path.join(VIEWER_DIR, path.normalize(url));
    try {
      const data = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] ?? 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found. Build the viewer: npm -w @pitonisa/tarot-viewer run build');
    }
  });
  srv.listen(VIEWER_PORT, () => {
    console.error(`[tarot] VIEWER serving OBS page at http://localhost:${VIEWER_PORT}/`);
  });
  srv.on('error', (err) => {
    console.error(`[tarot] WARN viewer static on port ${VIEWER_PORT} failed:`, (err as Error).message);
    console.error(`[tarot]      set TAROT_VIEWER_PORT to a free port to enable OBS page`);
  });
}

startViewerServer().catch((e) => console.error('[tarot] viewer server failed:', e));

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[tarot] MCP server ready (stdio). Tools: ' + mcpTools.map((t) => t.name).join(', '));
