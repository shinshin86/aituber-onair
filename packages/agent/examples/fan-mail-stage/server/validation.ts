import type { Draft, MailEvent } from '../src/protocol.js';

export const MAX_FILE_BYTES = 32 * 1024;
const fieldLimits = {
  eventId: 100,
  source: 100,
  receivedAt: 40,
  aliasTag: 100,
  subject: 200,
  bodyText: 8000,
};
// biome-ignore lint/suspicious/noControlCharactersInRegex: Reject control bytes in external input.
const controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a JSON object.');
  return value as Record<string, unknown>;
}

export function boundedText(value: unknown, max: number): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    controls.test(value)
  )
    throw new Error('Text is empty, too long, or contains control characters.');
  return value.trim();
}

export function parseMail(value: unknown): MailEvent {
  const data = object(value);
  if (
    data.schemaVersion !== 1 ||
    Object.keys(data).length !== Object.keys(fieldLimits).length + 1 ||
    Object.keys(data).some(
      (key) => key !== 'schemaVersion' && !(key in fieldLimits)
    )
  )
    throw new Error('Unsupported mail schema.');
  for (const [key, max] of Object.entries(fieldLimits))
    boundedText(data[key], max);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(String(data.eventId)))
    throw new Error('Invalid eventId.');
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(
      String(data.receivedAt)
    ) ||
    !Number.isFinite(Date.parse(String(data.receivedAt)))
  )
    throw new Error('Invalid receivedAt.');
  return {
    schemaVersion: 1,
    eventId: String(data.eventId),
    source: String(data.source),
    receivedAt: String(data.receivedAt),
    aliasTag: String(data.aliasTag),
    subject: String(data.subject),
    bodyText: String(data.bodyText),
  };
}

export function parseDraft(value: unknown): Draft {
  const data = object(value);
  if (
    Object.keys(data).length !== 3 ||
    Object.keys(data).some(
      (key) => !['publicSubject', 'publicExcerpt', 'speechText'].includes(key)
    )
  )
    throw new Error('Invalid reaction format.');
  return {
    publicSubject: boundedText(data.publicSubject, 120),
    publicExcerpt: boundedText(data.publicExcerpt, 300),
    speechText: boundedText(data.speechText, 500),
  };
}

export function isSensitive(mail: MailEvent): boolean {
  return /認証|確認コード|ワンタイム|パスワード|ログイン|verification|one[ -]?time|\botp\b|password|sign[ -]?in|log[ -]?in|secret|api[_ -]?key/i.test(
    `${mail.subject}\n${mail.bodyText}`
  );
}
