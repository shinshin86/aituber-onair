/**
 * Tipos del sistema de memoria persistente por espectador.
 *
 * El `viewerId` canónico es el `@handle` normalizado de la plataforma
 * (TikTok unique_id, Twitch login, YouTube channel id). El nick visible se
 * interpreta para obtener el nombre con el que el agente debe dirigirse
 * (Andrea425 -> "Andrea"); si el usuario da su nombre real, se guarda y
 * prevalece.
 */

/** Consulta de tarot registrada por un espectador. */
export type ViewerConsultation = {
  /** id corto generado por el store. */
  id: string;
  /** Tema de la consulta, normalizado (p.ej. 'amor', 'trabajo', 'dinero'). */
  topic: string;
  /** Sujeto o persona de la consulta (p.ej. 'Jose', 'Paco'). */
  about?: string;
  /** Detalle libre breve (spread usado, resultado, etc.). */
  detail?: string;
  /** Momento del evento (epoch ms). */
  at: number;
  /** Plataforma donde ocurrió. */
  platform: string;
};

/** Hito personal del espectador que el agente debe recordar. */
export type ViewerPersonalEvent = {
  id: string;
  /** Tipo: 'viaje', 'trabajo', 'salud', 'relacion', 'aniversario', 'otro'. */
  kind: 'viaje' | 'trabajo' | 'salud' | 'relacion' | 'aniversario' | 'otro';
  /** Resumen breve (p.ej. "viaje a la costa", "reunión el lunes 14:00"). */
  summary: string;
  at: number;
  /** Fecha opcional del propio evento (si es future/past conocido). */
  eventDate?: string;
};

/** Acumulador de regalos por espectador (priorización de atención). */
export type GiftAccumulator = {
  /** Suma de diamantes acumulada en sesiones recientes. */
  totalDiamonds: number;
  /** Número de eventos de regalo. */
  eventCount: number;
  lastGiftAt?: number;
  lastGiftName?: string;
  /** Regalo individual más grande visto. */
  biggestGift?: { name: string; diamonds: number; at: number };
};

/** Sesión de stream cerrada para un espectador (resumen). */
export type ViewerSessionSummary = {
  startedAt: number;
  endedAt: number;
  platform: string;
  messageCount: number;
  /** Consultas de la sesión. */
  consultationTopics: Array<{ topic: string; about?: string }>;
  /** Frase-resumen generada al cerrar la sesión. */
  summary: string;
};

/** Registro completo de un espectador. */
export type ViewerRecord = {
  /** `@handle` normalizado sin `@`, minúsculas. */
  viewerId: string;
  /** Nick original visto la última vez. */
  nickname: string;
  /** Nombre interpretado a partir del nick (Andrea425 -> Andrea). */
  displayName: string;
  /** Nombre real si el usuario lo ha proporcionado; prevalece. */
  realName?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  totalMessageCount: number;
  /** Nivel de relación 0..10 (crece con mensajes y sesiones). */
  relationshipLevel: number;
  /** Consultas de tarot acumuladas (todas las sesiones). */
  consultations: ViewerConsultation[];
  /** Hitos personales recordados. */
  personalEvents: ViewerPersonalEvent[];
  gifts: GiftAccumulator;
  /** Resúmenes de sesiones pasadas (máx. conservadas: 20). */
  sessions: ViewerSessionSummary[];
  /** Etiquetas libre (fan, repeat, vip, ...). */
  tags: string[];
};

/** Estado serializado del store. */
export type ViewerMemoryState = {
  version: 1;
  viewers: Record<string, ViewerRecord>;
};

/** Adaptador de almacenamiento (localStorage, memoria, archivo...). */
export type MemoryStorageAdapter = {
  load(): string | null;
  save(payload: string): void;
};

/** Punto de donante grande para priorización. */
export type DonorTier = 'vip' | 'regular' | 'small' | 'none';
