import type { TextAnalysisOptions } from '../types/index.js';

export function normalizeText(
  text: string,
  options: Partial<TextAnalysisOptions> = {}
): string {
  const opts = {
    caseSensitive: false,
    language: 'auto' as const,
    ...options,
  };

  let normalized = text.trim();

  if (!opts.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  normalized = normalized.replace(/\s+/g, ' ');

  if (
    opts.language === 'ja' ||
    (opts.language === 'auto' && containsJapanese(text))
  ) {
    normalized = normalized.replace(/[、。！？]/g, '');
  }

  return normalized;
}

export function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

export function tokenize(
  text: string,
  options: Partial<TextAnalysisOptions> = {}
): string[] {
  const opts = {
    minWordLength: 2,
    includeStopWords: false,
    language: 'auto' as const,
    ...options,
  };

  const normalized = normalizeText(text, opts);

  const isJapanese =
    opts.language === 'ja' ||
    (opts.language === 'auto' && containsJapanese(text));

  let tokens: string[];

  if (isJapanese) {
    tokens = tokenizeJapanese(normalized);
  } else {
    tokens = normalized.split(/\s+/).filter((token) => token.length > 0);
  }

  tokens = tokens.filter((token) => token.length >= opts.minWordLength);

  if (!opts.includeStopWords) {
    tokens = tokens.filter((token) => !isStopWord(token, isJapanese));
  }

  return tokens;
}

function tokenizeJapanese(text: string): string[] {
  const tokens: string[] = [];
  let currentToken = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char)) {
      if (
        currentToken &&
        !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(currentToken)
      ) {
        tokens.push(currentToken);
        currentToken = '';
      }
      currentToken += char;
    } else if (/[a-zA-Z0-9]/.test(char)) {
      if (
        currentToken &&
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(currentToken)
      ) {
        tokens.push(currentToken);
        currentToken = '';
      }
      currentToken += char;
    } else {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = '';
      }
    }
  }

  if (currentToken) {
    tokens.push(currentToken);
  }

  return tokens.filter((token) => token.length > 0);
}

function isStopWord(word: string, isJapanese: boolean): boolean {
  const japaneseStopWords = [
    'は',
    'が',
    'を',
    'に',
    'で',
    'と',
    'から',
    'まで',
    'より',
    'の',
    'や',
    'か',
    'な',
    'だ',
    'である',
    'です',
    'ます',
    'した',
    'します',
    'する',
    'されて',
    'いる',
    'いた',
    'ある',
    'あり',
    'あった',
    'この',
    'その',
    'あの',
    'どの',
    'ここ',
    'そこ',
    'あそこ',
    'どこ',
    'こと',
    'もの',
    'はい',
    'いいえ',
    'そうです',
    'そうですね',
  ];

  const englishStopWords = [
    'the',
    'is',
    'at',
    'which',
    'on',
    'and',
    'a',
    'an',
    'as',
    'are',
    'was',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'me',
    'him',
    'her',
    'us',
    'them',
    'my',
    'your',
    'his',
    'her',
    'its',
    'our',
    'their',
    'this',
    'that',
    'these',
    'those',
    'yes',
    'no',
    'ok',
    'okay',
  ];

  const stopWords = isJapanese ? japaneseStopWords : englishStopWords;
  return stopWords.includes(word.toLowerCase());
}

export function generateNgrams(tokens: string[], n: number): string[] {
  if (n <= 0 || n > tokens.length) return [];

  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }

  return ngrams;
}

export function calculateJaccardSimilarity(
  set1: Set<string>,
  set2: Set<string>
): number {
  if (set1.size === 0 && set2.size === 0) return 1.0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

export function calculateCosineSimilarity(
  vector1: number[],
  vector2: number[]
): number {
  if (vector1.length !== vector2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    norm1 += vector1[i] * vector1[i];
    norm2 += vector2[i] * vector2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export function createTfIdfVector(
  tokens: string[],
  vocabulary: string[],
  documentFrequencies: Map<string, number>,
  totalDocuments: number
): number[] {
  const tokenCounts = new Map<string, number>();

  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }

  return vocabulary.map((term) => {
    const tf = (tokenCounts.get(term) || 0) / tokens.length;
    const df = documentFrequencies.get(term) || 1;
    const idf = Math.log(totalDocuments / df);
    return tf * idf;
  });
}

export function extractKeywords(
  text: string,
  options: Partial<TextAnalysisOptions> = {}
): string[] {
  const tokens = tokenize(text, options);
  const tokenCounts = new Map<string, number>();

  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }

  const sortedTokens = Array.from(tokenCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);

  return sortedTokens.slice(0, Math.min(10, sortedTokens.length));
}

export function calculateTextSimilarity(
  text1: string,
  text2: string,
  options: Partial<TextAnalysisOptions> = {}
): number {
  const normalized1 = normalizeText(text1, options);
  const normalized2 = normalizeText(text2, options);

  // Quick check for exact match after normalization
  if (normalized1 === normalized2) return 1.0;

  const tokens1 = tokenize(text1, options);
  const tokens2 = tokenize(text2, options);

  if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const jaccardSimilarity = calculateJaccardSimilarity(set1, set2);

  // For short texts or when Jaccard similarity is very high, just use Jaccard
  if (tokens1.length < 5 || tokens2.length < 5 || jaccardSimilarity > 0.9) {
    return jaccardSimilarity;
  }

  // For longer texts, use a combination of Jaccard and token-based similarity
  const vocabulary = Array.from(new Set([...tokens1, ...tokens2]));
  const tokenFreq1 = new Map<string, number>();
  const tokenFreq2 = new Map<string, number>();

  for (const token of tokens1) {
    tokenFreq1.set(token, (tokenFreq1.get(token) || 0) + 1);
  }
  for (const token of tokens2) {
    tokenFreq2.set(token, (tokenFreq2.get(token) || 0) + 1);
  }

  // Calculate simple cosine similarity based on token frequencies
  const vector1 = vocabulary.map(term => tokenFreq1.get(term) || 0);
  const vector2 = vocabulary.map(term => tokenFreq2.get(term) || 0);
  const cosineSimilarity = calculateCosineSimilarity(vector1, vector2);

  return (jaccardSimilarity + cosineSimilarity) / 2;
}
