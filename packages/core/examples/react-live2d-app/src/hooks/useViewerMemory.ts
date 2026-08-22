import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewerProfile } from '@aituber-onair/comment-intelligence';
import {
  ViewerMemoryStore,
  buildViewerContext,
  normalizeViewerId,
  type ViewerRecord,
} from '@aituber-onair/viewer-memory';

/**
 * Hook de memoria persistente por espectador para la app de Live2D.
 *
 * - Un único `ViewerMemoryStore` por navegador (localStorage), compartido
 *   entre renders (module-level singleton).
 * - Registra mensajes y regalos de cada plataforma normalizada.
 * - Extrae con heurísticas locales (MVP, sin LLM) tres cosas:
 *   1. Nombre real ("me llamo X" / "mi nombre es X").
 *   2. Consultas de tarot ("tirada de amor por Jose") -> topic + about.
 *   3. Hitos personales ("viaje a la costa", "reunión el lunes", "cumpleaños").
 * - Expone `getViewerProfiles()` para el scoring por relación y
 *   `getViewContext(author)` para inyectar el bloque de memoria en el
 *   prompt del turno.
 * - Gestiona la sesión de stream: `startStream()` / `endStream()` cierran
 *   sesión por espectador activo y guardan un resumen.
 */

// ---- Singleton a nivel de módulo (sobrevive a remounts del hook) ----
let sharedStore: ViewerMemoryStore | null = null;
function getSharedStore(): ViewerMemoryStore {
  if (!sharedStore) {
    sharedStore = new ViewerMemoryStore();
  }
  return sharedStore;
}

/** Detecta el nombre real en el texto: "me llamo X", "mi nombre es X". */
function extractRealName(text: string): string | undefined {
  const patterns = [
    /(?:me\s+llamo|mi\s+nombre\s+es|soy)[\s:]+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'-]{1,30})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      // Descartar si es un verbo o pronombre común.
      if (/^(es|soy|tengo|me|te|se|lo|la|que|y|o|a|en|por|con|para)$/.test(candidate.toLowerCase())) {
        continue;
      }
      return candidate;
    }
  }
  return undefined;
}

const CONSULTATION_TOPICS = [
  'amor',
  'trabajo',
  'estudio',
  'familia',
  'dinero',
  'salud',
  'viaje',
  'suerte',
  'futuro',
  'decisión',
] as const;

/** Detecta una consulta de tarot: "tirada de amor por Jose". */
function extractConsultation(text: string): {
  topic: string;
  about?: string;
} | undefined {
  const lower = text.toLowerCase();
  const topicHit = CONSULTATION_TOPICS.find((topic) =>
    lower.includes(topic),
  );
  if (!topicHit) {
    return undefined;
  }
  // Solo si parece una consulta (pregunta o palabra clave de tirada).
  const looksLikeQuery =
    lower.includes('tirada') ||
    lower.includes('tarot') ||
    lower.includes('cartas') ||
    lower.includes('?') ||
    lower.includes('como va') ||
    lower.includes('como esta') ||
    lower.includes('que hay');
  if (!looksLikeQuery) {
    return undefined;
  }
  // Sujeto: "por Jose", "sobre Maria", "con Paco".
  let about: string | undefined;
  const aboutMatch = lower.match(
    /\b(?:por|sobre|con)\s+([a-záéíóúñ][a-záéíóúñ'-]+)/i,
  );
  if (aboutMatch) {
    const raw = aboutMatch[1];
    if (!/^(amor|trabajo|estudio|familia|dinero|salud|viaje|suerte|vida)$/.test(raw)) {
      about = raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }
  return { topic: topicHit, about };
}

const PERSONAL_EVENT_KINDS: Array<{
  kind: 'viaje' | 'trabajo' | 'salud' | 'relacion' | 'aniversario';
  keywords: RegExp;
}> = [
  { kind: 'viaje', keywords: /\bviaje\s+(a|de|por)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i },
  { kind: 'trabajo', keywords: /\breunión(?:\s+(?:el|a las)\s+[^,.\n]{0,30})/i },
  { kind: 'trabajo', keywords: /\b(entrevista|oferta|nuevo trabajo|ascenso)/i },
  { kind: 'salud', keywords: /\b(consulta médica|operación|médico|check-up)/i },
  { kind: 'aniversario', keywords: /\b(cumpleaños|aniversario|bodas?)\b.*\b(\d{1,2}|el [a-z]+)\b/i },
  { kind: 'relacion', keywords: /\b(novio|novia|muy pronto|pedirle|pedirme)/i },
];

/** Detecta hitos personales: tipo + resumen corto. */
function extractPersonalEvent(
  text: string,
): { kind: 'viaje' | 'trabajo' | 'salud' | 'relacion' | 'aniversario'; summary: string } | undefined {
  for (const { kind, keywords } of PERSONAL_EVENT_KINDS) {
    const match = text.match(keywords);
    if (match) {
      return {
        kind,
        summary: text.trim().slice(0, 120),
      };
    }
  }
  return undefined;
}

export type UseViewerMemoryResult = {
  store: ViewerMemoryStore;
  /** Registra un mensaje de un espectador (tras la normalización). */
  recordViewerMessage: (input: {
    handle: string;
    nickname: string;
    text: string;
    platform: string;
  }) => void;
  /** Registra un regalo. */
  recordViewerGift: (input: {
    handle: string;
    nickname: string;
    giftName: string;
    diamonds?: number;
    platform?: string;
  }) => void;
  /** Contexto de memoria para inyectar en el prompt del turno. */
  getViewContext: (handle: string, nickname: string) => string;
  /** Perfiles para el scoring de comment-intelligence. */
  getViewerProfiles: () => ViewerProfile[];
  /** Abre la sesión de stream (marca inicio, resetea contadores de sesión). */
  startStream: (platform: string) => void;
  /** Cierra la sesión: guarda resumen por espectador activo. */
  endStream: (platform: string) => void;
  /** Lista de espectadores con su tier (para depuración/inspección). */
  getRankedViewers: () => Array<{ viewer: ViewerRecord; tier: string }>;
};

/** Devuelve una versión estable del store para poder memorizar callbacks. */
function useStableStore(): ViewerMemoryStore {
  const ref = useRef<ViewerMemoryStore | null>(null);
  if (!ref.current) {
    ref.current = getSharedStore();
  }
  return ref.current;
}

export function useViewerMemory(): UseViewerMemoryResult {
  const store = useStableStore();
  const streamStartedAtRef = useRef<number | null>(null);
  const sessionMessageCountsRef = useRef<Map<string, number>>(new Map());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Si cambia el store (p.ej. recarga), limpiar contadores de sesión.
  useEffect(() => {
    return () => {
      // No cerrar sesión al desmontar: es el componente responsable.
    };
  }, [store]);

  const recordViewerMessage = useCallback(
    ({ handle, nickname, text, platform }: {
      handle: string;
      nickname: string;
      text: string;
      platform: string;
    }) => {
      const id = normalizeViewerId(handle);
      store.recordMessage(id, nickname, platform);
      sessionMessageCountsRef.current.set(
        id,
        (sessionMessageCountsRef.current.get(id) ?? 0) + 1,
      );

      const realName = extractRealName(text);
      if (realName) {
        store.setRealName(id, realName);
      }
      const consultation = extractConsultation(text);
      if (consultation) {
        store.recordConsultation(id, {
          topic: consultation.topic,
          about: consultation.about,
          platform,
        });
      }
      const event = extractPersonalEvent(text);
      if (event) {
        store.recordPersonalEvent(id, {
          kind: event.kind,
          summary: event.summary,
        });
      }
      bump();
    },
    [store, bump],
  );

  const recordViewerGift = useCallback(
    ({ handle, nickname, giftName, diamonds, platform: _platform }: {
      handle: string;
      nickname: string;
      giftName: string;
      diamonds?: number;
      platform?: string;
    }) => {
      const id = normalizeViewerId(handle);
      store.recordGift(id, nickname, {
        name: giftName,
        diamonds,
      });
      bump();
    },
    [store, bump],
  );

  const getViewContext = useCallback(
    (handle: string, _nickname: string): string => {
      const id = normalizeViewerId(handle);
      const record = store.get(id);
      if (!record || record.totalMessageCount === 0) {
        return '';
      }
      return buildViewerContext(record);
    },
    [store],
  );

  const getViewerProfiles = useCallback((): ViewerProfile[] => {
    const map = new Map<string, ViewerProfile>();
    for (const viewer of store.getAll()) {
      const profile = store.getViewerProfile(viewer.viewerId);
      if (profile) {
        map.set(viewer.viewerId, profile);
      }
    }
    return Array.from(map.values());
  }, [store]);

  const startStream = useCallback(
    (_platform: string) => {
      streamStartedAtRef.current = Date.now();
      sessionMessageCountsRef.current.clear();
    },
    [],
  );

  const endStream = useCallback(
    (platform: string) => {
      const startedAt = streamStartedAtRef.current ?? Date.now();
      const counts = sessionMessageCountsRef.current;
      for (const [id, count] of counts.entries()) {
        if (count <= 0) continue;
        const record = store.get(id);
        if (!record || !record.nickname) continue;
        const name = record.realName ?? record.displayName;
        const topics = record.consultations
          .slice(0, 3)
          .map((c) => (c.about ? `${c.topic} (${c.about})` : c.topic));
        const summary =
          count === 1
            ? `${name} envió 1 mensaje`
            : `${name} fue activo (${count} mensajes)` +
              (topics.length > 0 ? `, consultas: ${topics.join(', ')}` : '');
        store.endSession(id, summary, startedAt, platform, count);
      }
      counts.clear();
      streamStartedAtRef.current = null;
      bump();
    },
    [store, bump],
  );

  const getRankedViewers = useCallback(() => {
    return store
      .rankViewersByPriority()
      .map((viewer) => ({ viewer, tier: store.getDonorTier(viewer.viewerId) }));
  }, [store]);

  // Garantiza que `version` se use en el deps para re-render.
  void version;

  return {
    store,
    recordViewerMessage,
    recordViewerGift,
    getViewContext,
    getViewerProfiles,
    startStream,
    endStream,
    getRankedViewers,
  };
}
