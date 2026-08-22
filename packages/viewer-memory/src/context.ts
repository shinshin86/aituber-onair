import type { ViewerRecord } from './types.js';

/**
 * Construye el bloque de contexto de memoria para inyectar en el system
 * prompt (o en el input del turno) del agente, para que sepa quién habla,
 * qué le ha preguntado antes y qué datos personales tiene.
 *
 * Salida es texto plano en español, con una extensión acotada (máx. ~320
 * caracteres por línea de consulta) para no inflar el contexto.
 *
 * Si el espectador no tiene memoria, devuelve una cadena vacía.
 */
export function buildViewerContext(
  record: ViewerRecord,
  options?: { maxConsultations?: number; now?: number },
): string {
  const maxConsultations = options?.maxConsultations ?? 5;
  const now = options?.now ?? Date.now();

  const name = record.realName ?? record.displayName;
  const lines: string[] = [];

  // Identidad: si el nick no es un nombre natural, se avisa.
  const nick = record.nickname;
  let identityNote = '';
  if (record.realName) {
    identityNote = `Su nombre real es ${record.realName} (dirígete a ella/él así).`;
  } else if (nicknameNeedsInterpretation(nick)) {
    identityNote = `Su nick es ${nick}; dirígete a esta persona como ${name}.`;
  } else {
    identityNote = `Su nick es ${nick}.`;
  }
  lines.push(`[Espectador] ${identityNote}`);

  if (record.totalMessageCount > 1) {
    lines.push(
      `Lleva ${record.totalMessageCount} mensajes y relación de nivel ${record.relationshipLevel} (0-10).`,
    );
  }
  if (record.relationshipLevel >= 5) {
    lines.push('Es un espectador habitual: puedes tratarle con más confianza.');
  }
  if (record.gifts.totalDiamonds > 0) {
    lines.push(
      `Ha enviado regalos (${record.gifts.totalDiamonds} diamantes acumulados; último: ${record.gifts.lastGiftName ?? '?'}). Agradece sus regalos con calidez.`,
    );
  }

  // Consultas anteriores (las más recientes primero).
  const consults = record.consultations.slice(0, maxConsultations);
  if (consults.length > 0) {
    const olderRef = record.consultations[maxConsultations];
    lines.push('Consultas de tarot anteriores:');
    for (const c of consults) {
      const when = formatDateRelative(c.at, now);
      const about = c.about ? ` sobre ${c.about}` : '';
      lines.push(`- ${when}: tirada de ${c.topic}${about}.`);
    }
    if (olderRef || record.consultations.length > maxConsultations) {
      lines.push(
        `Hay ${record.consultations.length} consultas en total. Puedes hacer referencia a las pasadas para crear continuidad.`,
      );
    }
  }

  // Eventos personales.
  const events = record.personalEvents.slice(0, 5);
  if (events.length > 0) {
    lines.push('Datos personales que comentó:');
    for (const e of events) {
      lines.push(`- ${e.summary}.`);
    }
    lines.push('Si tiene sentido, pregúntale cómo le fue o hace referencia a estos temas.');
  }

  // Último resumen de sesión.
  const lastSession = record.sessions[0];
  if (lastSession) {
    lines.push(
      `Última sesión: ${lastSession.summary} ${formatDateRelative(lastSession.endedAt, now)}.`,
    );
  }

  return lines.join('\n');
}

/**
 * Decide si un nick necesita interpretación (numerales, underscores, prefijos
 * tipo x). Si es un nombre limpio de una o dos palabras, no.
 */
export function nicknameNeedsInterpretation(nickname: string): boolean {
  const trimmed = nickname.trim();
  if (!trimmed) return false;
  if (/\d/.test(trimmed)) return true;
  if (/[_\-.*]/.test(trimmed)) return true;
  // Prefijo tipo "xAlgo" o "elAlgo" pegado.
  if (/^[a-z]{1,3}[A-Z]/.test(trimmed)) return true;
  // Más de dos o menos de dos palabras.
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length > 2;
}

function formatDateRelative(at: number, now: number): string {
  const diffMs = now - at;
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  if (diffMs < hour && diffMs >= 0) return `hace un momento`;
  if (diffMs < 2 * day) return 'ayer';
  if (diffMs < 7 * day) return `hace ${Math.floor(diffMs / day)} días`;
  const d = new Date(at);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `el ${dd}/${mm}`;
}
