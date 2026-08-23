/**
 * Cliente tarot para el frontend: habla con el MCP tarot a través del bridge
 * HTTP local (POST /draw en 127.0.0.1:3999, lanzado junto al server MCP).
 *
 * Flujo del orquestador:
 *  1. detectar consulta (extractConsultation ya existe en useViewerMemory)
 *  2. drawReading() → el server hace broadcast WS al viewer 3D (animación) y
 *     devuelve las cartas + significados
 *  3. el resultado se inyecta como contexto en processChat para que el agente
 *     narice la tirada personalizada con la memoria del espectador.
 */

export interface TarotCard {
  position_id: number;
  position_name: string;
  position_label: string;
  card_id: string;
  card_name: string;
  reversed: boolean;
  upright_meaning: string;
  reversed_meaning: string;
  keywords: string[];
  x: number;
  y: number;
  rot: number;
}

export interface TarotReading {
  reading_id: string;
  spread_type: string;
  spread_name: string;
  cards: TarotCard[];
}

const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:3999';

export function mapTopicToSpread(topic: string): string {
  const t = topic.toLowerCase();
  if (/amor|relacion|pareja|corazon/.test(t)) return 'tres_cartas_situacion_obstaculo_consejo';
  if (/trabajo|empleo|proyecto/.test(t)) return 'tres_cartas_pasado_presente_futuro';
  if (/dinero|finanza/.test(t)) return 'herradura';
  if (/salud/.test(t)) return 'triangulo_9';
  if (/viaje/.test(t)) return 'estrella_6';
  if (/futuro|suerte/.test(t)) return 'cruz_celta';
  // Consulta general / no reconocida: tirada corta.
  return 'una_carta';
}

/** Dispara una tirada: anima el viewer 3D y devuelve la lectura completa. */
export async function drawReading(options: {
  topic?: string;
  spreadType?: string;
  seed?: number;
  bridgeUrl?: string;
}): Promise<TarotReading> {
  const bridge = options.bridgeUrl ?? DEFAULT_BRIDGE_URL;
  const spread_type = options.spreadType ?? mapTopicToSpread(options.topic ?? '');
  const res = await fetch(`${bridge}/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spread_type,
      ...(options.seed !== undefined ? { seed: options.seed } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Tarot bridge ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  const out = await res.json();
  if (out?.result?.isError) {
    throw new Error(String(out.result.content?.[0]?.text ?? 'tarot error'));
  }
  const reading = JSON.parse(out.result.content[0].text) as TarotReading;
  if (!reading.cards?.length) throw new Error('Lectura sin cartas');
  return reading;
}

/** Formatea la lectura como bloque de contexto para el prompt del LLM. */
export function formatReadingForLLM(reading: TarotReading): string {
  const lines: string[] = [
    `[TIRADA REALIZADA] ${reading.spread_name} — las cartas ya se muestran en el visor 3D. Nárralas en orden, interpretándolas para la consulta del espectador.`,
  ];
  for (const c of reading.cards) {
    lines.push(
      `- ${c.position_name} (${c.position_label}): ${c.card_name}${c.reversed ? ' INVERTIDA' : ''}. ` +
        `Significado${c.reversed ? ' invertido' : ''}: ${c.reversed ? c.reversed_meaning : c.upright_meaning} ` +
        `(palabras clave: ${c.keywords.slice(0, 4).join(', ')})`,
    );
  }
  return lines.join('\n');
}
