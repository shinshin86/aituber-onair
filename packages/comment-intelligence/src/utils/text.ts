export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function truncateText(text: string, maxLength = 500): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

export function includesAny(text: string, patterns: Array<string | RegExp>) {
  return patterns.some((pattern) =>
    typeof pattern === 'string'
      ? text.includes(pattern.toLowerCase())
      : pattern.test(text)
  );
}
