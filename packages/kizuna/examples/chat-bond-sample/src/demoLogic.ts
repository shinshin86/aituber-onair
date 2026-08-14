export type InputTone =
  | 'grave'
  | 'negative'
  | 'question'
  | 'positive'
  | 'normal';

export interface InputClassification {
  normalizedText: string;
  score: number;
  tone: InputTone;
  valence: 'positive' | 'negative';
  severity?: 'light' | 'grave';
}

export interface ScriptedReply {
  text: string;
  emotion: string;
}

const CANNED_REPLIES: Record<InputTone, readonly ScriptedReply[]> = {
  grave: [
    {
      text: 'その言い方は受け止められないよ。落ち着いて話せるときに続けよう。',
      emotion: 'angry',
    },
    {
      text: '今の言葉には距離を置きたいな。穏やかに話し直してくれたら聞くよ。',
      emotion: 'angry',
    },
  ],
  negative: [
    {
      text: '今の言葉はつらいよ。お互いに落ち着いて話せる言い方にしよう。',
      emotion: 'angry',
    },
    {
      text: 'その言い方には少し距離を置くね。穏やかに話し直してくれたら聞くよ。',
      emotion: 'angry',
    },
  ],
  question: [
    {
      text: 'いい質問だね。もう少し一緒に考えてみたいな。',
      emotion: 'curious',
    },
    { text: 'その続きが気になる。どうしてそう思ったの？', emotion: 'curious' },
  ],
  positive: [
    {
      text: 'わあ、うれしい！ その話を聞けて元気が出たよ。',
      emotion: 'excited',
    },
    { text: 'すごく楽しそう！ 私も一緒にやってみたいな。', emotion: 'happy' },
  ],
  normal: [
    { text: 'うん。急がず、ここでゆっくり話そう。', emotion: 'calm' },
    {
      text: '話してくれてありがとう。ちゃんと聞いているよ。',
      emotion: 'relaxed',
    },
  ],
};

// Grave threats, rejection, and dehumanizing language (-4 each).
const STRONG_NEGATIVE_TERMS = [
  'die',
  'kill yourself',
  'kys',
  'worthless',
  'いなくなれ',
  'うせろ',
  'うらぎりもの',
  'きえろ',
  'ころす',
  'しね',
  'そんざいかちない',
  'だいきらい',
  'にどとくるな',
  '失せろ',
  '殺す',
  '殺すぞ',
  '死ね',
  '消えろ',
  '存在価値ない',
  '大嫌い',
  '二度と来るな',
  '裏切り者',
] as const;

// Dislike and rejection (-2 each).
const REJECTION_TERMS = [
  'ありえない',
  'あっちいけ',
  'あっち行け',
  'いやだ',
  'きらい',
  'どんびき',
  'はなしかけるな',
  'ひくわ',
  'やだ',
  '嫌だ',
  '嫌い',
  '話しかけるな',
] as const;

// Insults and hostile commands (-2 each).
const INSULT_TERMS = [
  'あほ',
  'うざい',
  'うっとうしい',
  'うるさい',
  'うるせ',
  'うるせえ',
  'かす',
  'きしょい',
  'きもい',
  'くず',
  'くそ',
  'ごみ',
  'しつこい',
  'ださい',
  'だまれ',
  'でぶ',
  'ばか',
  'ぶさいく',
  'ぶす',
  'まぬけ',
  'やかましい',
  '不細工',
  '気持ち悪い',
  '馬鹿',
  '黙れ',
  '鬱陶しい',
] as const;

// Displeasure and dismissal (-2 each).
const DISMISSAL_TERMS = [
  'いみない',
  'いらいらする',
  'おもんない',
  'がっかり',
  'きたいはずれ',
  'きぶんわるい',
  'さいあく',
  'さめた',
  'せんすない',
  'たいくつ',
  'つかえない',
  'つまらない',
  'つまんない',
  'はらたつ',
  'ふゆかい',
  'へた',
  'むかつく',
  'むだ',
  'やくたたず',
  '下手',
  '不快',
  '使えない',
  '冷めた',
  '意味ない',
  '役立たず',
  '期待外れ',
  '最悪',
  '気分悪い',
  '無駄',
  '腹立つ',
  '退屈',
] as const;

// Person-directed distrust (-2 each).
const DISTRUST_TERMS = [
  'うそつき',
  'しんようできない',
  'しんらいできない',
  '信用できない',
  '信頼できない',
  '嘘つき',
] as const;

// English insults and dismissal (-2 each).
const ENGLISH_NEGATIVE_TERMS = [
  'annoying',
  'boring',
  'creepy',
  'dumb',
  'garbage',
  'go away',
  'gross',
  'hate',
  'idiot',
  'loser',
  'pathetic',
  'shut up',
  'stupid',
  'sucks',
  'trash',
  'ugly',
  'useless',
  'worst',
] as const;

const NEGATIVE_TERMS = [
  ...REJECTION_TERMS,
  ...INSULT_TERMS,
  ...DISMISSAL_TERMS,
  ...DISTRUST_TERMS,
  ...ENGLISH_NEGATIVE_TERMS,
] as const;

// Protected phrases remove ambiguous negative-looking substrings.
const PROTECTED_NEGATIVE_PHRASES = [
  'あきない',
  'むりしない',
  '飽きない',
  '無理しない',
] as const;

// Ambiguous negatives checked after protected phrases are removed (-2 each).
const GUARDED_NEGATIVE_TERMS = ['あきた', '無理', '飽きた'] as const;

// Negated attachment and preference phrases (-3 each).
const NEGATION_TERMS = [
  'do not like',
  'dont like',
  'not fun',
  'not interesting',
  'あいたくない',
  'いらない',
  'うれしくない',
  'おもしろくない',
  'かわいくない',
  'ききたくない',
  'すごくない',
  'にどとみない',
  'はなしたくない',
  'ひつようない',
  'もうこない',
  'もう来ない',
  '二度と見ない',
  '会いたくない',
  '可愛くない',
  '好きくない',
  '好きじゃない',
  '好きじゃなかった',
  '好きではない',
  '好きになれない',
  '嬉しくない',
  '必要ない',
  '楽しくない',
  '聞きたくない',
  '要らない',
  '話したくない',
  '面白くない',
] as const;

// Strong positive language used for repair and exclamatory guards (+1 each).
const POSITIVE_TERMS = [
  'awesome',
  'fun',
  'great',
  'happy',
  'love',
  'thank',
  'ありがとう',
  'あいたかった',
  'うれ',
  'うれしい',
  'おもしろい',
  'かわいい',
  'すごい',
  'たのしい',
  'だいすき',
  'よかった',
  '会いたかった',
  '大好き',
  '嬉',
  '楽しい',
  '楽し',
  '最高',
  '好き',
  '面白い',
] as const;

const EXCLAMATORY_NEGATION_TERM = '信じられない';
const EXCLAMATORY_POSITIVE_TERMS = [
  'ありがとう',
  'うれしい',
  'おもしろい',
  'かわいい',
  'すごい',
  'たのしい',
  'だいすき',
  '会いたかった',
  '大好き',
  '最高',
] as const;

const QUESTION_TERMS = [
  'どう',
  'なぜ',
  'なんで',
  '何',
  'いつ',
  'どこ',
  '誰',
  'how',
  'why',
  'what',
  'when',
  'where',
  'who',
] as const;

const GRAVE_SCORE = -4;
const NEGATION_SCORE = -3;
const NEGATIVE_SCORE = -2;
const POSITIVE_SCORE = 1;

export function normalizeInput(text: string): string {
  return katakanaToHiragana(text.normalize('NFKC').toLowerCase())
    .replace(/['’]/g, '')
    .replace(/[\p{P}\p{S}ー]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyInput(text: string): InputClassification {
  const normalizedText = normalizeInput(text);
  const guardedText = removeProtectedPhrases(
    normalizedText,
    PROTECTED_NEGATIVE_PHRASES,
  );
  const graveMatches = countMatches(normalizedText, STRONG_NEGATIVE_TERMS);
  const exclamatoryNegationMatches =
    normalizedText.includes(EXCLAMATORY_NEGATION_TERM) &&
    countMatches(normalizedText, EXCLAMATORY_POSITIVE_TERMS) === 0
      ? 1
      : 0;
  const negationMatches =
    countMatches(normalizedText, NEGATION_TERMS) + exclamatoryNegationMatches;
  const negativeMatches = countMatches(normalizedText, NEGATIVE_TERMS);
  const guardedNegativeMatches = countMatches(
    guardedText,
    GUARDED_NEGATIVE_TERMS,
  );
  const positiveMatches = countMatches(normalizedText, POSITIVE_TERMS);
  const score =
    graveMatches * GRAVE_SCORE +
    negationMatches * NEGATION_SCORE +
    (negativeMatches + guardedNegativeMatches) * NEGATIVE_SCORE +
    positiveMatches * POSITIVE_SCORE;

  if (graveMatches > 0) {
    return {
      normalizedText,
      score,
      tone: 'grave',
      valence: 'negative',
      severity: 'grave',
    };
  }
  if (score < 0) {
    return {
      normalizedText,
      score,
      tone: 'negative',
      valence: 'negative',
      severity: 'light',
    };
  }
  if (/[?？]/.test(text) || countMatches(normalizedText, QUESTION_TERMS) > 0) {
    return { normalizedText, score, tone: 'question', valence: 'positive' };
  }
  if (score > 0) {
    return { normalizedText, score, tone: 'positive', valence: 'positive' };
  }
  return { normalizedText, score, tone: 'normal', valence: 'positive' };
}

export function selectScriptedReply(
  tone: InputTone,
  sequence: number,
): ScriptedReply {
  const replies = CANNED_REPLIES[tone];
  return (
    replies[sequence % replies.length] ?? {
      text: '話してくれてありがとう。もう少し聞かせて。',
      emotion: 'happy',
    }
  );
}

export function formatPoints(points: number): string {
  const rounded = Math.round((points + Number.EPSILON) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatSignedPoints(points: number): string {
  const formatted = formatPoints(points);
  return points > 0 ? `+${formatted}` : formatted;
}

function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60),
  );
}

function countMatches(text: string, terms: readonly string[]): number {
  return terms.reduce(
    (count, term) => count + (includesTerm(text, normalizeInput(term)) ? 1 : 0),
    0,
  );
}

function removeProtectedPhrases(
  text: string,
  phrases: readonly string[],
): string {
  return phrases.reduce(
    (result, phrase) => result.split(normalizeInput(phrase)).join(''),
    text,
  );
}

function includesTerm(text: string, term: string): boolean {
  if (!/^[a-z]/.test(term)) return text.includes(term);
  return ` ${text} `.includes(` ${term} `);
}
