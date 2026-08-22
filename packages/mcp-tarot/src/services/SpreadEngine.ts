import type { SpreadDefinition } from '../types.js';

export interface Position3D {
  id: number;
  name: string;
  label: string;
  description: string;
  x: number;
  y: number;
  /** rotation around Z axis in radians */
  rot: number;
}

export interface SpreadLayout extends Omit<SpreadDefinition, 'positions'> {
  positions: Position3D[];
  card_scale: number;
}

const P = (
  id: number, name: string, label: string, description: string,
  x: number, y: number, rot = 0
): Position3D => ({ id, name, label, description, x, y, rot });

const circle = (n: number, r: number): Position3D[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return P(i + 1, `pos_${i + 1}`, `Posición ${i + 1}`, '', Math.cos(a) * r, Math.sin(a) * r);
  });

const posNames = [
  ['pos_1', '1'], ['pos_2', '2'], ['pos_3', '3'], ['pos_4', '4'], ['pos_5', '5'], ['pos_6', '6'],
  ['pos_7', '7'], ['pos_8', '8'], ['pos_9', '9'], ['pos_10', '10'], ['pos_11', '11'], ['pos_12', '12']
];

export const SPREADS: Record<string, SpreadLayout> = {
  // 1. — La más sencilla: una sola carta, respuesta directa
  una_carta: {
    id: 'una_carta',
    name: 'Una Carta (Respuesta Directa)',
    cards_count: 1,
    layout_type: 'custom',
    card_scale: 1.15,
    duration_estimate_ms: 2500,
    complexity: 'basic',
    positions: [P(1, 'mensaje', 'Mensaje', 'Respuesta directa a la pregunta', 0, 0)]
  },

  // 2. — Clásica de tres: línea temporal
  tres_cartas_pasado_presente_futuro: {
    id: 'tres_cartas_pasado_presente_futuro',
    name: 'Pasado · Presente · Futuro',
    cards_count: 3,
    layout_type: 'linear',
    card_scale: 1,
    duration_estimate_ms: 6000,
    complexity: 'basic',
    positions: [
      P(1, 'pasado', 'Pasado', 'Raíces y origen de la situación', -3, 0),
      P(2, 'presente', 'Presente', 'La energía de ahora', 0, 0.25),
      P(3, 'futuro', 'Futuro', 'Tendencia si el camino continúa', 3, 0)
    ]
  },

  // 3. — Tres cartas diagnósticas
  tres_cartas_situacion_obstaculo_consejo: {
    id: 'tres_cartas_situacion_obstaculo_consejo',
    name: 'Situación · Obstáculo · Consejo',
    cards_count: 3,
    layout_type: 'linear',
    card_scale: 1,
    duration_estimate_ms: 6000,
    complexity: 'basic',
    positions: [
      P(1, 'situacion', 'Situación', 'Dónde estamos hoy', -3, 0),
      P(2, 'obstaculo', 'Obstáculo', 'Lo que frena el avance', 0, 0.25),
      P(3, 'consejo', 'Consejo', 'Qué sugiere el mazo', 3, 0)
    ]
  },

  // 4. — 7 cartas en herradura (U invertida), camino y salida
  herradura: {
    id: 'herradura',
    name: 'Herradura (7 cartas)',
    cards_count: 7,
    layout_type: 'custom',
    card_scale: 0.8,
    duration_estimate_ms: 12000,
    complexity: 'intermediate',
    positions: [
      P(1, 'inicio', 'Inicio', 'Punto de partida', -4.2, 2.1),
      P(2, 'viaje', 'Viaje', 'El camino que se recorre', -5, 0),
      P(3, 'prueba', 'Prueba', 'El desafío central', -4.2, -2.1),
      P(4, 'bajada', 'Bajada', 'Lo que hay que soltar', -2, -3.4),
      P(5, 'centro', 'Centro', 'El corazón del asunto', 0, -3.9),
      P(6, 'retorno', 'Retorno', 'Lo que te encuentra al volver a casa', 2, -3.4),
      P(7, 'salida', 'Salida', 'Apertura final', 4.2, -2.1)
    ]
  },

  // 5. — 9 cartas en triángulo, amor y trabajo
  triangulo_9: {
    id: 'triangulo_9',
    name: 'Triángulo (9 cartas)',
    cards_count: 9,
    layout_type: 'grid',
    card_scale: 0.72,
    duration_estimate_ms: 14000,
    complexity: 'intermediate',
    positions: [
      P(1, 'yo', 'Yo', 'Quien consulta', 0, 2.6),
      P(2, 'el_otros', 'El otro', 'La otra parte', -4.3, -0.6),
      P(3, 'nosotros', 'Nosotros', 'El vínculo', 0, -0.6),
      P(4, 'comunicacion', 'Comunicación', 'Qué se habla/dice', 4.3, -0.6),
      P(5, 'emociones', 'Emociones', 'Lo que se siente', -4.3, -3.2),
      P(6, 'acciones', 'Acciones', 'Lo que se hace', -2.1, -3.2),
      P(7, 'decisiones', 'Decisiones', 'Lo que se elige', 0, -3.2),
      P(8, 'futuro_corto', 'Futuro corto', 'Próximos días', 2.1, -3.2),
      P(9, 'consejo', 'Consejo', 'Cierre del triángulo', 4.3, -3.2)
    ]
  },

  // 6. — 6 cartas en estrella, puntos cardinales + cenit/nadir
  estrella_6: {
    id: 'estrella_6',
    name: 'Estrella de 6',
    cards_count: 6,
    layout_type: 'circular',
    card_scale: 0.8,
    duration_estimate_ms: 10000,
    complexity: 'intermediate',
    positions: [
      ...circle(6, 3.1).map((p, i) => ({
        ...p,
        name: ['cenit', 'este', 'nadir', 'oeste', 'sur', 'norte'][i],
        label: ['Cenit', 'Este / Mañana', 'Nadir', 'Oeste / Tarde', 'Sur', 'Norte'][i],
        description: ['Lo que ilumina', 'Lo que viene', 'Lo que pesa', 'Lo que queda atrás', 'El terreno actual', 'El apoyo'][i]
      }))
    ]
  },

  // 7. — 10 cartas, la tirada completa clásica
  cruz_celta: {
    id: 'cruz_celta',
    name: 'Cruz Celta (10 cartas)',
    cards_count: 10,
    layout_type: 'custom',
    card_scale: 0.75,
    duration_estimate_ms: 20000,
    complexity: 'advanced',
    positions: [
      P(1, 'situacion', 'Situación', 'Qué ocurre ahora', 0, 0),
      P(2, 'cruz', 'Cruz', 'El desafío que cruza la situación', 0.08, 0.08, 0.12),
      P(3, 'base', 'Base', 'La raíz inconsciente del asunto', 0, -2.3),
      P(4, 'pasado', 'Pasado', 'Lo que acaba de pasar y aún influye', -3.4, 0),
      P(5, 'coronario', 'Coronario', 'El objetivo consciente', 0, 1.9),
      P(6, 'futuro_cercano', 'Futuro cercano', 'Hacia dónde va en las próximas semanas', 3.4, 0),
      P(7, 'yo', 'Yo', 'Cómo se percibe uno mismo', 5.9, 1.7),
      P(8, 'entorno', 'Entorno', 'Influencias de personas y entorno', 5.9, 0.6),
      P(9, 'esperanzas_medos', 'Esperanzas y miedos', 'Lo que flota subconsciente', 5.9, -0.5),
      P(10, 'resultado', 'Resultado', 'El desenlace probable', 5.9, -1.6)
    ]
  },

  // 8. — 10 cartas en pirámide egipcia
  tirada_egipcia: {
    id: 'tirada_egipcia',
    name: 'Pirámide Egipcia (10 cartas)',
    cards_count: 10,
    layout_type: 'custom',
    card_scale: 0.75,
    duration_estimate_ms: 18000,
    complexity: 'advanced',
    positions: [
      P(1, 'fundacion_1', 'Fundación I', 'Base: la situación', -4.3, -2.4),
      P(2, 'fundacion_2', 'Fundación II', 'Base: el consultante', -1.45, -2.4),
      P(3, 'fundacion_3', 'Fundación III', 'Base: el entorno', 1.45, -2.4),
      P(4, 'fundacion_4', 'Fundación IV', 'Base: el tiempo', 4.3, -2.4),
      P(5, 'cuerpo_1', 'Cuerpo I', 'Desarrollo: obstáculos', -2.9, -0.8),
      P(6, 'cuerpo_2', 'Cuerpo II', 'Desarrollo: recursos', 0, -0.8),
      P(7, 'cuerpo_3', 'Cuerpo III', 'Desarrollo: decisiones', 2.9, -0.8),
      P(8, 'cima_1', 'Cima I', 'Culminación: lecciones', -1.45, 0.8),
      P(9, 'cima_2', 'Cima II', 'Culminación: acciones', 1.45, 0.8),
      P(10, 'apex', 'Ápice', 'Meta: el resultado final', 0, 2.4)
    ]
  },

  // 9. — 10 posiciones del Árbol de la Vida kabbalístico
  arbol_vida: {
    id: 'arbol_vida',
    name: 'Árbol de la Vida (10 sefirot)',
    cards_count: 10,
    layout_type: 'custom',
    card_scale: 0.72,
    duration_estimate_ms: 20000,
    complexity: 'advanced',
    positions: [
      P(1, 'keter', 'Kéter', 'La corona: la esencia más alta', 0, 3.0),
      P(2, 'binah', 'Biná', 'Entendimiento: reflexión e intuición', -1.9, 2.0),
      P(3, 'jokmah', 'Jojmá', 'Sabiduría: el chispa original', 1.9, 2.0),
      P(4, 'jesed', 'Jesed', 'Misericordia: expansión', -1.9, 0.9),
      P(5, 'tifaret', 'Tiferet', 'Belleza: el corazón del árbol', 0, 0.9),
      P(6, 'gevurah', 'Guevurá', 'Rigor: límites y fuerza', 1.9, 0.9),
      P(7, 'hod', 'Jod', 'Esplendor: mente y expresión', -0.95, -0.1),
      P(8, 'nesaj', 'Netsaj', 'Victorioso: empuje y deseo', 0.95, -0.1),
      P(9, 'iesod', 'Yesod', 'Fundamento: lo que sostiene', 0, -1.1),
      P(10, 'maljut', 'Maljut', 'Reino: la manifestación final', 0, -2.6)
    ]
  },

  // 10. — 12 cartas en círculo: un año, las 12 casas
  circulo_celta: {
    id: 'circulo_celta',
    name: 'Círculo Celta (12 casas)',
    cards_count: 12,
    layout_type: 'circular',
    card_scale: 0.62,
    duration_estimate_ms: 22000,
    complexity: 'advanced',
    positions: circle(12, 3.4).map((p, i) => ({
      ...p,
      name: `casa${i + 1}`,
      label: `Casa ${i + 1} · Mes ${i + 1}`
    }))
  },

  // 11. — Mandala de 8 pétalos: lectura meditación/energía
  mandala_8: {
    id: 'mandala_8',
    name: 'Mandala de 8 Pétalos',
    cards_count: 8,
    layout_type: 'circular',
    card_scale: 0.72,
    duration_estimate_ms: 14000,
    complexity: 'intermediate',
    positions: circle(8, 2.8)
  },

  // 12. — La mayor: red 6x6 estilo Lenormand
  red_36: {
    id: 'red_36',
    name: 'Red 6×6 (36 cartas)',
    cards_count: 36,
    layout_type: 'grid',
    card_scale: 0.42,
    duration_estimate_ms: 30000,
    complexity: 'advanced',
    positions: Array.from({ length: 36 }, (_, i) => ({
      ...P(i + 1, `celda_${i + 1}`, `${i + 1}`, '',
        (i % 6) * 1.05 - 2.625,
        Math.floor(i / 6) * 1.05 - 2.625
      )
    }))
  }
};

export class SpreadEngine {
  static list(): { id: string; name: string; cards: number }[] {
    return Object.values(SPREADS).map((s) => ({
      id: s.id,
      name: s.name,
      cards: s.cards_count
    }));
  }

  calculateLayout(spreadType: string): SpreadLayout {
    const layout = SPREADS[spreadType];
    if (!layout) {
      const known = Object.keys(SPREADS).join(', ');
      throw new Error(`Unknown spread '${spreadType}'. Known spreads: ${known}`);
    }
    if (layout.positions.length !== layout.cards_count) {
      throw new Error(`Spread '${spreadType}' definition is inconsistent`);
    }
    return layout;
  }
}
