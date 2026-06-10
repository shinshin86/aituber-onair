import type {
  ContaminateConstraints,
  ProtectedDraft,
  ProtectedSpan,
} from './types.js';

const URL_PATTERN = /https?:\/\/[^\s)]+/g;
const NUMBER_PATTERN =
  /\b\d+(?:[.,:/-]\d+)*(?:[%年月日時分秒円ドル個人回回目日])?/g;
const HIGH_STAKES_PATTERN =
  /医療|法律|投資|金融|薬|診断|税金|契約|medical|legal|financial|investment|diagnosis|tax/i;
const IDENTITY_ATTACK_PATTERN =
  /人種|民族|国籍|障害|性別|性的指向|宗教|race|ethnicity|disability|gender|religion/i;

export function protectSensitiveSpans(
  draft: string,
  constraints: Required<
    Pick<
      ContaminateConstraints,
      'preserveCodeBlocks' | 'preserveUrls' | 'preserveNumbers'
    >
  >
): ProtectedDraft {
  const ranges: Array<{ start: number; end: number }> = [];

  if (constraints.preserveCodeBlocks) {
    collectRanges(draft, /```[\s\S]*?```|`[^`\n]+`/g, ranges);
  }

  if (constraints.preserveUrls) {
    collectRanges(draft, URL_PATTERN, ranges);
  }

  if (constraints.preserveNumbers) {
    collectRanges(draft, NUMBER_PATTERN, ranges);
  }

  const filtered = ranges
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .filter((range, index, sorted) => {
      const previous = sorted[index - 1];
      return !previous || range.start >= previous.end;
    });

  let text = '';
  let cursor = 0;
  const spans: ProtectedSpan[] = [];

  filtered.forEach((range, index) => {
    const token = `__AITUBER_NOISE_SPAN_${index}__`;
    text += draft.slice(cursor, range.start);
    text += token;
    spans.push({
      token,
      value: draft.slice(range.start, range.end),
    });
    cursor = range.end;
  });

  text += draft.slice(cursor);

  return {
    text,
    spans,
  };
}

export function restoreSensitiveSpans(
  text: string,
  spans: ProtectedSpan[]
): string {
  return spans.reduce(
    (restored, span) => restored.split(span.token).join(span.value),
    text
  );
}

export function safetyGuard(input: {
  before: string;
  after: string;
  constraints?: ContaminateConstraints;
}): { text: string } {
  const constraints = input.constraints ?? {};

  if (
    constraints.avoidMedicalLegalFinancialMutation !== false &&
    HIGH_STAKES_PATTERN.test(input.before) &&
    input.before !== input.after
  ) {
    return { text: input.before };
  }

  if (
    constraints.avoidIdentityAttack !== false &&
    IDENTITY_ATTACK_PATTERN.test(input.before) &&
    input.before !== input.after
  ) {
    return { text: input.before };
  }

  if (
    constraints.preserveUrls !== false &&
    listMatches(input.before, URL_PATTERN).join('\n') !==
      listMatches(input.after, URL_PATTERN).join('\n')
  ) {
    return { text: input.before };
  }

  if (
    constraints.preserveNumbers !== false &&
    listMatches(input.before, NUMBER_PATTERN).join('\n') !==
      listMatches(input.after, NUMBER_PATTERN).join('\n')
  ) {
    return { text: input.before };
  }

  if (
    typeof constraints.maxAddedChars === 'number' &&
    input.after.length > input.before.length + constraints.maxAddedChars
  ) {
    return { text: input.before };
  }

  return { text: input.after };
}

function collectRanges(
  text: string,
  pattern: RegExp,
  ranges: Array<{ start: number; end: number }>
): void {
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }

    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }
}

function listMatches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[0]);
}
