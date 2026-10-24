export function overlapScore(text: string, panels: string, n = 3): number {
  const normalize = (s: string) =>
    Array.from(
      s
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\p{P}\p{Z}\s]/gu, ''),
    );
  const a = normalize(text);
  const b = normalize(panels);
  if (!a.length || !b.length) return 0;
  const size = Math.min(n, a.length, b.length);
  const grams = (s: string[]) =>
    new Set(
      Array.from({ length: Math.max(0, s.length - size + 1) }, (_, i) =>
        s.slice(i, i + size).join(''),
      ),
    );
  const ag = grams(a);
  const bg = grams(b);
  return [...ag].filter((g) => bg.has(g)).length / Math.min(ag.size, bg.size);
}
