/**
 * Interpretación de nombres a partir de nicks de stream.
 *
 * El agente debe dirigirse a cada espectador con un nombre humano, no con
 * el nick literal. Heurísticas (en orden):
 *   1. Si existe `realName`, prevalece (se resuelve en `interpretDisplayName`).
 *   2. Extrae la racha inicial de letras del nick (Andrea425 -> "Andrea"),
 *      la partea en camelCase (elMati -> ["el","Mati"], xCarlos -> ["x","Carlos"])
 *      y descarta tokens-noise cortos en minúsculas ("el", "la", "x", "de"...).
 *   3. Capitaliza y devuelve hasta 2 tokens; si todo se descarta, conserva
 *      el primer token original para no perder la identidad.
 */

/** Prefijos cortos que se tratan como ruido cuando van solitos en minúsculas. */
const NOISE_PREFIXES = new Set([
  'x',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'lo',
  'de',
  'y',
  'o',
  'a',
  'al',
  'en',
  'por',
]);

type CamelMatch = RegExpMatchArray | null;

/** Parte un token en camelCase: "elMati" -> ["el","Mati"], "xCarlos" -> ["x","Carlos"]. */
function splitCamel(token: string): string[] {
  const parts: CamelMatch = token.match(/[A-Z]+(?![a-z])|[A-Z][a-z]*|[a-z]+/g);
  return parts ?? (token ? [token] : []);
}

/**
 * Extrae el nombre a partir del prefijo alfabético de un nick.
 * "Andrea425" -> "Andrea"; "elMati_90" -> "Mati"; "xCarlos" -> "Carlos".
 */
export function extractNicknameName(nickname: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return '';
  }

  // 1. Racha inicial de letras (se detiene en el primer número/_/espacio).
  let alphaPrefix = '';
  for (const ch of trimmed) {
    if (/[a-zA-Z]/.test(ch)) {
      alphaPrefix += ch;
    } else if (alphaPrefix.length > 0) {
      break;
    }
  }
  const raw = alphaPrefix || trimmed;

  // 2. Parte en camelCase.
  const camelTokens = splitCamel(raw);

  // 3. Descarta tokens-noise: cortos, en minúscula total y en la lista.
  const kept = camelTokens.filter((token) => {
    if (token.length <= 3 && /^[a-z]+$/.test(token) && NOISE_PREFIXES.has(token)) {
      return false;
    }
    return true;
  });
  const finalTokens = kept.length > 0 ? kept : camelTokens;

  // 4. Capitaliza hasta 2 tokens.
  return finalTokens
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resuelve el nombre con el que el agente debe dirigirse al espectador:
 * el nombre real si existe, si no el interpretado, y si todo falla el nick
 * tal cual con la primera letra en mayúscula.
 */
export function interpretDisplayName(
  nickname: string,
  realName?: string,
): string {
  if (realName && realName.trim()) {
    return realName.trim();
  }
  const extracted = extractNicknameName(nickname);
  if (extracted && extracted.length >= 2) {
    return extracted;
  }
  const trimmed = nickname.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
}
