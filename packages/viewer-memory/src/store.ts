import type {
  DonorTier,
  GiftAccumulator,
  MemoryStorageAdapter,
  ViewerConsultation,
  ViewerMemoryState,
  ViewerPersonalEvent,
  ViewerRecord,
  ViewerSessionSummary,
} from './types.js';
import { interpretDisplayName } from './nameInterpreter.js';

const STATE_VERSION = 1 as const;
const MAX_CONSULTATIONS = 50;
const MAX_PERSONAL_EVENTS = 30;
const MAX_SESSIONS = 20;
/** Ventana de regalos para la priorización (7 días). */
const GIFT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Umbral de diamantes para considerar un donante "grande/vip". */
const VIP_DIAMOND_THRESHOLD = 300;

let idCounter = 0;
function shortId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/**
 * Aislado a propósito para tests: por defecto usa el localStorage del
 * navegador si existe, si no un respaldo en memoria.
 */
export function getDefaultStorage(): MemoryStorageAdapter {
  if (typeof globalThis !== 'undefined' && typeof localStorage !== 'undefined') {
    return {
      load: () => localStorage.getItem(STORAGE_KEY),
      save: (payload) => {
        localStorage.setItem(STORAGE_KEY, payload);
      },
    };
  }
  const mem = { value: null as string | null };
  return {
    load: () => mem.value,
    save: (payload) => {
      mem.value = payload;
    },
  };
}

export const STORAGE_KEY = 'aituber.viewerMemory.v1';

function emptyRecord(viewerId: string, nickname: string): ViewerRecord {
  const now = Date.now();
  return {
    viewerId,
    nickname,
    displayName: interpretDisplayName(nickname),
    firstSeenAt: now,
    lastSeenAt: now,
    totalMessageCount: 0,
    relationshipLevel: 0,
    consultations: [],
    personalEvents: [],
    gifts: { totalDiamonds: 0, eventCount: 0 },
    sessions: [],
    tags: [],
  };
}

/**
 * Almacén de memoria persistente por espectador.
 *
 * Una instancia por proceso/navegador. El `viewerId` canónico es el
 * `@handle` normalizado. Todos los mutators son idempotentes sobre el
 * estado serializado y guardan en el adapter al terminar.
 */
export class ViewerMemoryStore {
  private state: ViewerMemoryState;
  private storage: MemoryStorageAdapter;

  constructor(storage?: MemoryStorageAdapter) {
    this.storage = storage ?? getDefaultStorage();
    this.state = this.load();
  }

  private load(): ViewerMemoryState {
    try {
      const raw = this.storage.load();
      if (raw) {
        const parsed = JSON.parse(raw) as ViewerMemoryState;
        if (parsed && typeof parsed === 'object' && parsed.version === STATE_VERSION) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[viewer-memory] could not load state, starting fresh', err);
    }
    return { version: STATE_VERSION, viewers: {} };
  }

  private persist(): void {
    try {
      this.storage.save(JSON.stringify(this.state));
    } catch (err) {
      console.warn('[viewer-memory] could not persist state', err);
    }
  }

  private ensure(viewerId: string, nickname: string): ViewerRecord {
    const existing = this.state.viewers[viewerId];
    if (existing) {
      if (nickname && nickname !== existing.nickname) {
        existing.nickname = nickname;
        if (!existing.realName) {
          existing.displayName = interpretDisplayName(nickname);
        }
      }
      return existing;
    }
    const record = emptyRecord(viewerId, nickname);
    this.state.viewers[viewerId] = record;
    return record;
  }

  // ---- Lecturas ----

  get(viewerId: string): ViewerRecord | undefined {
    return this.state.viewers[viewerId];
  }

  getAll(): ViewerRecord[] {
    return Object.values(this.state.viewers);
  }

  getViewerProfile(viewerId: string) {
    const record = this.state.viewers[viewerId];
    if (!record) {
      return undefined;
    }
    return {
      id: record.viewerId,
      name: record.realName ?? record.displayName,
      firstSeenAt: record.firstSeenAt,
      lastSeenAt: record.lastSeenAt,
      messageCount: record.totalMessageCount,
      relationshipLevel: record.relationshipLevel,
      tags: record.tags,
    };
  }

  // ---- Escrituras ----

  /** Marca un mensaje del espectador (chat o regalo). Actualiza el nivel. */
  recordMessage(viewerId: string, nickname: string, platform: string): void {
    const record = this.ensure(
      normalizeViewerId(viewerId),
      nickname || viewerId,
    );
    record.lastSeenAt = Date.now();
    record.totalMessageCount += 1;

    // Nivel de relación: raiz cuadrada de los mensajes, con tope 10,
    // mas 1 por cada sesión cerrada.
    const base = Math.min(10, Math.sqrt(record.totalMessageCount) * 2);
    const sessionsBonus = Math.min(3, record.sessions.length);
    record.relationshipLevel = Math.min(10, Math.round(base + sessionsBonus));

    this.persist();
  }

  /** Guarda o actualiza el nombre real cuando el usuario se lo da. */
  setRealName(viewerId: string, realName: string): void {
    const id = normalizeViewerId(viewerId);
    const record = this.ensure(id, this.state.viewers[id]?.nickname ?? id);
    record.realName = realName.trim();
    record.displayName = interpretDisplayName(record.nickname, record.realName);
    if (!record.tags.includes('has-real-name')) {
      record.tags.push('has-real-name');
    }
    this.persist();
  }

  /** Añade una consulta de tarot. */
  recordConsultation(
    viewerId: string,
    entry: { topic: string; about?: string; detail?: string; platform?: string },
  ): ViewerConsultation {
    const record = this.ensure(
      normalizeViewerId(viewerId),
      this.state.viewers[viewerId]?.nickname ?? viewerId,
    );
    const consultation: ViewerConsultation = {
      id: shortId('c'),
      topic: entry.topic.trim(),
      about: entry.about?.trim() || undefined,
      detail: entry.detail?.trim() || undefined,
      at: Date.now(),
      platform: entry.platform ?? 'web',
    };
    record.consultations.unshift(consultation);
    if (record.consultations.length > MAX_CONSULTATIONS) {
      record.consultations.length = MAX_CONSULTATIONS;
    }
    this.persist();
    return consultation;
  }

  /** Añade un hito personal (viaje, reunión, salud...). */
  recordPersonalEvent(
    viewerId: string,
    entry: {
      kind: ViewerPersonalEvent['kind'];
      summary: string;
      eventDate?: string;
    },
  ): void {
    const record = this.ensure(
      normalizeViewerId(viewerId),
      this.state.viewers[viewerId]?.nickname ?? viewerId,
    );
    record.personalEvents.unshift({
      id: shortId('p'),
      kind: entry.kind,
      summary: entry.summary.trim(),
      at: Date.now(),
      eventDate: entry.eventDate,
    });
    if (record.personalEvents.length > MAX_PERSONAL_EVENTS) {
      record.personalEvents.length = MAX_PERSONAL_EVENTS;
    }
    this.persist();
  }

  /** Acumula un regalo para la priorización. */
  recordGift(
    viewerId: string,
    nickname: string,
    gift: { name: string; diamonds?: number; at?: number },
  ): void {
    const record = this.ensure(
      normalizeViewerId(viewerId),
      nickname || viewerId,
    );
    const diamonds = gift.diamonds ?? 0;
    const gifts: GiftAccumulator = record.gifts;
    gifts.totalDiamonds += diamonds;
    gifts.eventCount += 1;
    const at = gift.at ?? Date.now();
    gifts.lastGiftAt = at;
    gifts.lastGiftName = gift.name;
    if (!gifts.biggestGift || diamonds > gifts.biggestGift.diamonds) {
      gifts.biggestGift = { name: gift.name, diamonds, at };
    }
    if (gifts.totalDiamonds >= VIP_DIAMOND_THRESHOLD) {
      if (!record.tags.includes('vip')) {
        record.tags.push('vip');
      }
    }
    this.persist();
  }

  /** Cierra la sesión actual del espectador con un resumen. */
  endSession(
    viewerId: string,
    summary: string,
    startedAt: number,
    platform: string,
    messageCount: number,
  ): void {
    const record = this.ensure(
      normalizeViewerId(viewerId),
      this.state.viewers[viewerId]?.nickname ?? viewerId,
    );
    const session: ViewerSessionSummary = {
      startedAt,
      endedAt: Date.now(),
      platform,
      messageCount,
      consultationTopics: record.consultations.map((c) => ({
        topic: c.topic,
        about: c.about,
      })),
      summary: summary.trim(),
    };
    record.sessions.unshift(session);
    if (record.sessions.length > MAX_SESSIONS) {
      record.sessions.length = MAX_SESSIONS;
    }
    // Cada sesión cerrada sube el nivel de relación.
    record.relationshipLevel = Math.min(
      10,
      record.relationshipLevel + 1,
    );
    this.persist();
  }

  // ---- Priorización de atención ----

  /**
   * Clasifica un espectador según su contribución en la ventana de
   * 7 días. `vip` >= umbral, `regular` tiene regalos, `small` solo
   * acumulación de mensajes, `none` si no hay nada notable.
   */
  getDonorTier(viewerId: string): DonorTier {
    const record = this.state.viewers[viewerId];
    if (!record) return 'none';
    const windowStart = Date.now() - GIFT_WINDOW_MS;
    const recentDiamonds =
      record.gifts.lastGiftAt && record.gifts.lastGiftAt >= windowStart
        ? record.gifts.totalDiamonds
        : 0;
    if (record.gifts.totalDiamonds >= VIP_DIAMOND_THRESHOLD && recentDiamonds > 0) {
      return 'vip';
    }
    if (recentDiamonds > 0) return 'regular';
    if (record.totalMessageCount >= 20) return 'small';
    return 'none';
  }

  /**
   * Ordena a todos los espectadores por prioridad de atención:
   *   1. tier (vip > regular > small > none)
   *   2. diamantes acumulados
   *   3. mensajes totales
   *   4. nivel de relación
   */
  rankViewersByPriority(): ViewerRecord[] {
    const tierOrder: Record<DonorTier, number> = {
      vip: 0,
      regular: 1,
      small: 2,
      none: 3,
    };
    return this.getAll()
      .map((r) => ({ record: r, tier: tierOrder[this.getDonorTier(r.viewerId)] }))
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        if (b.record.gifts.totalDiamonds !== a.record.gifts.totalDiamonds) {
          return b.record.gifts.totalDiamonds - a.record.gifts.totalDiamonds;
        }
        if (b.record.totalMessageCount !== a.record.totalMessageCount) {
          return b.record.totalMessageCount - a.record.totalMessageCount;
        }
        return b.record.relationshipLevel - a.record.relationshipLevel;
      })
      .map((x) => x.record);
  }

  /** Limpieza del estado completo (reset). */
  reset(): void {
    this.state = { version: STATE_VERSION, viewers: {} };
    this.persist();
  }
}

/** Normaliza un viewerId a handle canónico (sin @, minúsculas). */
export function normalizeViewerId(handle: string): string {
  return handle.trim().replace(/^@+/, '').toLowerCase();
}
