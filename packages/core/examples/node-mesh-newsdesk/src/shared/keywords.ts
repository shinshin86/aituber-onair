/**
 * Pick words worth popping up next to the avatar when a line has no explicit
 * `keywords`: numbers with their unit, version strings, and 「quoted」 terms.
 */

const QUOTED = /[「『]([^」』]{1,16})[」』]/g;
// 3.2倍 / 100万人 / 30% / 2026年 / v1.2.3 / 12月 / 5つ
const NUMBER_WITH_UNIT =
  /v?\d+(?:[.,]\d+)*(?:\s?(?:万|億|千|百))?(?:\s?(?:%|％|倍|人|件|円|年|月|日|時間|分|秒|種類|個|つ|回|位|歳|社|本|台|ドル|GB|MB|TB|fps|px))?/g;

export function extractKeywords(text: string, max = 2): string[] {
  const found: string[] = [];
  const push = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || found.includes(trimmed)) return;
    found.push(trimmed);
  };
  for (const match of text.matchAll(QUOTED)) push(match[1]);
  for (const match of text.matchAll(NUMBER_WITH_UNIT)) {
    const value = match[0];
    // a bare one-digit number reads as noise ("1つ目" is fine, "1" is not)
    if (/^\d$/.test(value)) continue;
    push(value);
  }
  return found.slice(0, max);
}
