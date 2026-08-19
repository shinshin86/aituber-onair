import type { NewsdeskScript, ScriptLine } from '../types.js';

const TOP_LEVEL_FIELDS = new Set([
  'avatar',
  'avatarAnimation',
  'output',
  'voice',
  'leadIn',
  'leadOut',
  'defaultPauseAfter',
  'background',
  'telop',
  'avatarLayout',
  'avatarFraming',
  'motion',
  'blinkSeed',
  'lines',
]);
const LINE_FIELDS = new Set([
  'text',
  'reading',
  'spoken',
  'duration',
  'pauseAfter',
  'chapter',
]);
const RESPONSE_FIELDS = new Set(['analysis', 'script']);
const ANALYSIS_FIELDS = new Set(['docType', 'title', 'keyFacts']);
const PROVENANCE_TOKEN_PATTERN =
  /v?\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?|\d+(?:\.\d+)*/g;

type UnknownRecord = Record<string, unknown>;

export interface ScriptAnalysis {
  docType: string;
  title: string;
  keyFacts: string[];
}

export interface GeneratedScriptResponse {
  analysis: ScriptAnalysis;
  script: NewsdeskScript;
}

interface NumberRange {
  min?: number;
  max?: number;
}

function isObject(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addUnknownFieldErrors(
  value: UnknownRecord,
  allowed: Set<string>,
  valuePath: string,
  errors: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${valuePath}.${key} is not allowed.`);
  }
}

function requireString(
  value: unknown,
  valuePath: string,
  errors: string[],
  options: { maxLength?: number } = {},
): void {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${valuePath} must be a non-empty string.`);
    return;
  }
  if (options.maxLength && Array.from(value).length > options.maxLength) {
    errors.push(
      `${valuePath} must be at most ${options.maxLength} Unicode characters.`,
    );
  }
}

function requireFiniteNumber(
  value: unknown,
  valuePath: string,
  errors: string[],
  { min, max }: NumberRange = {},
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${valuePath} must be a finite number.`);
    return;
  }
  if (min !== undefined && value < min)
    errors.push(`${valuePath} must be at least ${min}.`);
  if (max !== undefined && value > max)
    errors.push(`${valuePath} must be at most ${max}.`);
}

function validateOptionalNumber(
  value: unknown,
  valuePath: string,
  errors: string[],
  range: NumberRange,
): void {
  if (value !== undefined) requireFiniteNumber(value, valuePath, errors, range);
}

function validateVoice(voice: unknown, errors: string[]): void {
  if (!isObject(voice)) {
    errors.push('script.voice must be an object.');
    return;
  }
  addUnknownFieldErrors(
    voice,
    new Set(['engine', 'options']),
    'script.voice',
    errors,
  );
  if (!['sine', 'say', 'aituber-voice'].includes(String(voice.engine))) {
    errors.push(
      'script.voice.engine must be "sine", "say", or "aituber-voice".',
    );
  }
  if (!isObject(voice.options))
    errors.push('script.voice.options must be an object.');
}

function validateBackground(background: unknown, errors: string[]): void {
  if (!isObject(background)) {
    errors.push('script.background must be an object.');
    return;
  }
  addUnknownFieldErrors(
    background,
    new Set(['color', 'image']),
    'script.background',
    errors,
  );
  requireString(background.color, 'script.background.color', errors);
  if (background.image !== undefined)
    requireString(background.image, 'script.background.image', errors);
}

function validateAvatarLayout(layout: unknown, errors: string[]): void {
  if (!isObject(layout)) {
    errors.push('script.avatarLayout must be an object.');
    return;
  }
  addUnknownFieldErrors(
    layout,
    new Set(['scale', 'x', 'y']),
    'script.avatarLayout',
    errors,
  );
  requireFiniteNumber(layout.scale, 'script.avatarLayout.scale', errors, {
    min: 0.01,
  });
  requireFiniteNumber(layout.x, 'script.avatarLayout.x', errors);
  requireFiniteNumber(layout.y, 'script.avatarLayout.y', errors);
}

function validateAvatarFraming(framing: unknown, errors: string[]): void {
  if (!isObject(framing)) {
    errors.push('script.avatarFraming must be an object.');
    return;
  }
  addUnknownFieldErrors(
    framing,
    new Set(['visibleHeightRatio', 'lookAtHeightRatio']),
    'script.avatarFraming',
    errors,
  );
  validateOptionalNumber(
    framing.visibleHeightRatio,
    'script.avatarFraming.visibleHeightRatio',
    errors,
    { min: 0.1, max: 2 },
  );
  validateOptionalNumber(
    framing.lookAtHeightRatio,
    'script.avatarFraming.lookAtHeightRatio',
    errors,
    { min: 0, max: 1.5 },
  );
}

function validateMotion(motion: unknown, errors: string[]): void {
  if (!isObject(motion)) {
    errors.push('script.motion must be an object.');
    return;
  }
  addUnknownFieldErrors(
    motion,
    new Set(['intensity']),
    'script.motion',
    errors,
  );
  requireFiniteNumber(motion.intensity, 'script.motion.intensity', errors, {
    min: 0,
    max: 3,
  });
}

function validateLines(lines: unknown, errors: string[]): void {
  if (!Array.isArray(lines)) {
    errors.push('script.lines must be an array.');
    return;
  }
  if (lines.length < 3 || lines.length > 12)
    errors.push('script.lines must contain between 3 and 12 entries.');

  for (let index = 0; index < lines.length; index += 1) {
    const line: unknown = lines[index];
    const linePath = `script.lines[${index}]`;
    if (!isObject(line)) {
      errors.push(`${linePath} must be an object.`);
      continue;
    }
    addUnknownFieldErrors(line, LINE_FIELDS, linePath, errors);
    requireString(line.text, `${linePath}.text`, errors, { maxLength: 35 });
    if (line.reading !== undefined)
      requireString(line.reading, `${linePath}.reading`, errors);
    if (line.chapter !== undefined)
      requireString(line.chapter, `${linePath}.chapter`, errors, {
        maxLength: 30,
      });
    if (line.spoken !== undefined && typeof line.spoken !== 'boolean')
      errors.push(`${linePath}.spoken must be a boolean.`);
    validateOptionalNumber(line.pauseAfter, `${linePath}.pauseAfter`, errors, {
      min: 0,
    });
    validateOptionalNumber(line.duration, `${linePath}.duration`, errors, {
      min: 0,
    });
    if (line.spoken === false && line.duration === undefined)
      errors.push(`${linePath}.duration is required when spoken is false.`);
  }
}

/** Return every strict schema violation in a candidate script. */
export function validateScript(script: unknown): string[] {
  const errors: string[] = [];
  if (!isObject(script)) return ['script must be a JSON object.'];

  addUnknownFieldErrors(script, TOP_LEVEL_FIELDS, 'script', errors);
  requireString(script.avatar, 'script.avatar', errors);
  if (script.avatarAnimation !== undefined) {
    requireString(script.avatarAnimation, 'script.avatarAnimation', errors);
  }
  if (script.output !== undefined)
    requireString(script.output, 'script.output', errors);
  validateVoice(script.voice, errors);
  validateOptionalNumber(script.leadIn, 'script.leadIn', errors, { min: 0 });
  validateOptionalNumber(script.leadOut, 'script.leadOut', errors, { min: 0 });
  validateOptionalNumber(
    script.defaultPauseAfter,
    'script.defaultPauseAfter',
    errors,
    { min: 0 },
  );
  validateBackground(script.background, errors);
  if (script.telop !== undefined)
    requireString(script.telop, 'script.telop', errors);
  validateAvatarLayout(script.avatarLayout, errors);
  if (script.avatarFraming !== undefined)
    validateAvatarFraming(script.avatarFraming, errors);
  requireFiniteNumber(script.blinkSeed, 'script.blinkSeed', errors);
  validateMotion(script.motion, errors);
  validateLines(script.lines, errors);
  return errors;
}

/** Parse and strictly validate the analysis-plus-script model response. */
export function parseAndValidateScript(raw: string): GeneratedScriptResponse {
  let response: unknown;
  try {
    response = JSON.parse(raw.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Generated response is not valid JSON: ${message}`, {
      cause: error,
    });
  }

  const errors: string[] = [];
  if (!isObject(response)) {
    errors.push('response must be a JSON object.');
  } else {
    addUnknownFieldErrors(response, RESPONSE_FIELDS, 'response', errors);
    if (!isObject(response.analysis)) {
      errors.push('response.analysis must be an object.');
    } else {
      addUnknownFieldErrors(
        response.analysis,
        ANALYSIS_FIELDS,
        'response.analysis',
        errors,
      );
      requireString(
        response.analysis.docType,
        'response.analysis.docType',
        errors,
      );
      requireString(response.analysis.title, 'response.analysis.title', errors);
      if (
        !Array.isArray(response.analysis.keyFacts) ||
        response.analysis.keyFacts.length === 0
      ) {
        errors.push('response.analysis.keyFacts must be a non-empty array.');
      } else {
        for (
          let index = 0;
          index < response.analysis.keyFacts.length;
          index += 1
        ) {
          requireString(
            response.analysis.keyFacts[index],
            `response.analysis.keyFacts[${index}]`,
            errors,
          );
        }
      }
    }
    errors.push(...validateScript(response.script));
  }
  if (errors.length > 0) {
    throw new Error(
      `Generated response failed schema validation:\n- ${errors.join('\n- ')}`,
    );
  }
  return response as unknown as GeneratedScriptResponse;
}

function announcementText(script: NewsdeskScript): string {
  return [
    script.telop,
    ...script.lines.flatMap((line: ScriptLine) => [
      line.chapter,
      line.text,
      line.reading,
    ]),
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');
}

function provenanceTokens(text: string): Set<string> {
  return new Set(
    (text.match(PROVENANCE_TOKEN_PATTERN) ?? []).map((token) => {
      const withoutVersionPrefix = /^v\d/.test(token) ? token.slice(1) : token;
      return /^\d+$/.test(withoutVersionPrefix)
        ? withoutVersionPrefix.replace(/^0+(?=\d)/, '')
        : withoutVersionPrefix;
    }),
  );
}

/** Reject numeric/version claims absent from both source text and focus. */
export function assertTokenProvenance(
  script: NewsdeskScript,
  sourceText: string,
  focus = '',
): void {
  const allowedTokens = provenanceTokens(`${sourceText}\n${focus}`);
  const unsupportedTokens = [
    ...new Set(
      [...provenanceTokens(announcementText(script))].filter(
        (token) => !allowedTokens.has(token),
      ),
    ),
  ];
  if (unsupportedTokens.length > 0) {
    throw new Error(
      `Generated script contains numeric token(s) not present in the source text or focus: ${unsupportedTokens.join(', ')}`,
    );
  }
}
