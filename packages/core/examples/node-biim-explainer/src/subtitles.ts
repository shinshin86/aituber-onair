import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { STYLE, layout } from './layout.js';

export const FONT =
  '"Biim Japanese", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';
let initialized = false;
export function initializeFonts() {
  if (initialized) return;
  if (
    process.env.BIIM_FONT_PATH &&
    !GlobalFonts.registerFromPath(process.env.BIIM_FONT_PATH, 'Biim Japanese')
  ) {
    throw new Error('BIIM_FONT_PATH: cannot load font');
  }
  initialized = true;
}

/** Group Japanese words through particles so auxiliary verbs stay with stems. */
function chunks(paragraph: string): string[] {
  const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
  const result: string[] = [];
  let phrase = '';
  for (const { segment } of segmenter.segment(paragraph)) {
    if (/^[、。，．！？!?）」』】]+$/u.test(segment)) {
      if (phrase) {
        result.push(phrase + segment);
        phrase = '';
      } else if (result.length) result[result.length - 1] += segment;
      else result.push(segment);
    } else if (
      /^(は|が|を|に|へ|で|と|も|から|まで|より|ので|では|には)$/u.test(segment)
    ) {
      if (phrase) result.push(phrase + segment);
      else if (result.length) result[result.length - 1] += segment;
      else result.push(segment);
      phrase = '';
    } else if (/[ぁ-んァ-ン一-龠「『（]/u.test(segment)) phrase += segment;
    else {
      if (phrase) {
        result.push(phrase);
        phrase = '';
      }
      result.push(segment);
    }
  }
  if (phrase) result.push(phrase);
  return result;
}

/** Keep words intact where possible, avoid punctuation at the start of a row. */
export function wrapText(
  text: string,
  width: number,
  size: number = STYLE.subtitleSize,
): string[] {
  initializeFonts();
  const ctx = createCanvas(1, 1).getContext('2d');
  ctx.font = `${size}px ${FONT}`;
  const rows: string[] = [];
  for (const paragraph of text.split('\n')) {
    let row = '';
    for (const segment of chunks(paragraph)) {
      if (ctx.measureText(row + segment).width <= width) {
        row += segment;
        continue;
      }
      if (/^[、。，．！？!?）」』】]/u.test(segment) && row) {
        // Move the final grapheme with punctuation if it cannot fit this row.
        const chars = Array.from(row);
        const last = chars.pop() ?? '';
        rows.push(chars.join('').trimEnd());
        row = last + segment;
      } else {
        if (row.trim()) rows.push(row.trimEnd());
        row = segment.trimStart();
      }
      // A single long unbreakable token still must fit the speech bubble.
      if (ctx.measureText(row).width > width) {
        let part = '';
        for (const char of Array.from(row)) {
          if (part && ctx.measureText(part + char).width > width) {
            rows.push(part);
            part = '';
          }
          part += char;
        }
        row = part;
      }
    }
    if (row.trim()) rows.push(row.trimEnd());
  }
  return rows.filter(Boolean);
}

export function subtitlePages(
  text: string,
  width: number,
  duo: boolean,
): string[][] {
  const bubble = layout(width, duo, false).bubble;
  const rows = wrapText(text, bubble.w - STYLE.textPadding * 2);
  const pages: string[][] = [];
  for (let i = 0; i < rows.length; i += 2) pages.push(rows.slice(i, i + 2));
  return pages;
}
