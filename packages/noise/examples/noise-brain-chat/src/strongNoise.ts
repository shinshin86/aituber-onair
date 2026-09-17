// Character-level Levenshtein distance, normalized to the longer text.
export function textChangePercent(before: string, after: string): number {
  const a = Array.from(before);
  const b = Array.from(after);
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diagonal = old;
    }
  }
  return Math.round((100 * row[b.length]) / Math.max(a.length, b.length, 1));
}
