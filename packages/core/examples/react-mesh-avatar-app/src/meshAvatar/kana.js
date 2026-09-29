// Japanese text -> timed mouth shapes, for previewing lip sync without audio.
// Only kana are read; other characters are skipped, punctuation makes a short pause.

// open: how far the mouth opens, form: -1 wide (い) .. 0 (あ) .. +1 round (う)
export const VOWELS = {
  a: { open: 0.9, form: 0, label: 'あ' },
  i: { open: 0.5, form: -0.85, label: 'い' },
  u: { open: 0.4, form: 0.9, label: 'う' },
  e: { open: 0.62, form: -0.4, label: 'え' },
  o: { open: 0.75, form: 0.6, label: 'お' },
  n: { open: 0, form: null, label: 'ん' },   // closes with the previous shape
};

const ROWS = {
  a: 'あかさたなはまやらわがざだばぱぁ',
  i: 'いきしちにひみりぎじぢびぴぃ',
  u: 'うくすつぬふむゆるぐずづぶぷぅゔ',
  e: 'えけせてねへめれげぜでべぺぇ',
  o: 'おこそとのほもよろをごぞどぼぽぉ',
};
const VOWEL_OF = {};
for (const [v, chars] of Object.entries(ROWS)) for (const c of chars) VOWEL_OF[c] = v;
const LIPS_CLOSE = new Set([...'まみむめもばびぶべぼぱぴぷぺぽ']); // m / b / p close the lips first
const PLAIN_VOWEL = new Set([...'あいうえおぁぃぅぇぉ']);
const SMALL_Y = { ゃ: 'a', ゅ: 'u', ょ: 'o' };
const PAUSE = new Set([...'、。，．,.！？!? 　…']);

const toHiragana = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** -> [{ vowel, dur, onset }] where onset is 'lips' | 'consonant' | null */
export function kanaToMoras(text, mora = 0.14) {
  const out = [];
  for (const c of toHiragana(text)) {
    const last = out[out.length - 1];
    if (SMALL_Y[c] && last) { last.vowel = SMALL_Y[c]; continue; }
    if (c === 'ー' && last) { last.dur += mora; continue; }
    if (c === 'っ') { out.push({ vowel: 'n', dur: mora * 0.8, onset: null }); continue; }
    if (c === 'ん') { out.push({ vowel: 'n', dur: mora, onset: null }); continue; }
    if (PAUSE.has(c)) { out.push({ vowel: 'n', dur: mora * 2.2, onset: null }); continue; }
    const v = VOWEL_OF[c];
    if (!v) continue;
    out.push({ vowel: v, dur: mora, onset: LIPS_CLOSE.has(c) ? 'lips' : PLAIN_VOWEL.has(c) ? null : 'consonant' });
  }
  return out;
}

/** Mouth target at time t (s) of a mora timeline, or null when it is over. */
export function sampleMoras(moras, t) {
  let start = 0;
  for (const m of moras) {
    if (t < start + m.dur) {
      const x = (t - start) / m.dur;
      const v = VOWELS[m.vowel];
      // consonants: the mouth is nearly shut (lips) or half shut at the start of the mora
      const onset = m.onset === 'lips' ? 0.05 : m.onset === 'consonant' ? 0.45 : 1;
      const k = x < 0.35 ? onset + (1 - onset) * (x / 0.35) : 1;
      return { open: v.open * k, form: v.form, vowel: m.vowel };
    }
    start += m.dur;
  }
  return null;
}
