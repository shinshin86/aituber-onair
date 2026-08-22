// Shared message types between the MCP server (ws) and the 3D viewer.

export interface ReadingCardPayload {
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
}

export interface ReadingPayload {
  reading_id: string;
  spread_type: string;
  spread_name: string;
  cards: ReadingCardPayload[];
  card_scale: number;
  created_at: string;
  state: string;
}

export type WsMessage =
  | { type: 'READING_START'; payload: ReadingPayload }
  | { type: 'READING_STATE'; payload: ReadingPayload }
  | { type: 'READING_DONE'; payload: { reading_id: string } }
  | { type: 'SESSION_RESET'; payload: Record<string, never> };
