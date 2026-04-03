import type {
  Message,
  SimilarityResult,
  TextAnalysisOptions,
} from '../types/index.js';
import {
  CACHE_EVICTION_BATCH,
  CACHE_TTL_MS,
  DEFAULT_SIMILARITY_THRESHOLD,
  MAX_CACHE_SIZE,
} from '../config/constants.js';
import {
  calculateTextSimilarity,
  tokenize,
  generateNgrams,
} from '../utils/textUtils.js';
import { measurePerformance } from '../utils/browserUtils.js';

export class SimilarityAnalyzer {
  private readonly options: TextAnalysisOptions;
  private readonly cache: Map<string, number> = new Map();
  private readonly cacheTimeout: number = CACHE_TTL_MS;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(options: Partial<TextAnalysisOptions> = {}) {
    this.options = {
      minWordLength: 2,
      maxNgrams: 3,
      includeStopWords: false,
      caseSensitive: false,
      language: 'auto',
      ...options,
    };
  }

  calculateSimilarity(text1: string, text2: string): number {
    const cacheKey = this.getCacheKey(text1, text2);

    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;

    const similarity = measurePerformance(
      'calculateSimilarity',
      () => calculateTextSimilarity(text1, text2, this.options),
      false
    );

    this.setCacheValue(cacheKey, similarity);
    return similarity;
  }

  analyzeSimilarity(
    currentMessage: Message,
    previousMessages: Message[],
    threshold: number = DEFAULT_SIMILARITY_THRESHOLD
  ): SimilarityResult {
    if (previousMessages.length === 0) {
      return {
        score: 0,
        isRepeated: false,
        matchedMessages: [],
      };
    }

    const currentContent = currentMessage.content.trim();
    if (currentContent.length === 0) {
      return {
        score: 0,
        isRepeated: false,
        matchedMessages: [],
      };
    }

    let maxSimilarity = 0;
    const matchedMessages: Message[] = [];

    for (const message of previousMessages) {
      if (message.role === currentMessage.role) {
        const similarity = this.calculateSimilarity(
          currentContent,
          message.content
        );

        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }

        if (similarity >= threshold) {
          matchedMessages.push(message);
        }
      }
    }

    return {
      score: maxSimilarity,
      isRepeated: maxSimilarity >= threshold,
      matchedMessages,
    };
  }

  findSimilarMessages(
    targetMessage: Message,
    messages: Message[],
    threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
    sameRoleOnly = true
  ): Message[] {
    const similarMessages: Message[] = [];
    const targetContent = targetMessage.content.trim();

    for (const message of messages) {
      if (message === targetMessage) continue;

      if (sameRoleOnly && message.role !== targetMessage.role) continue;

      const similarity = this.calculateSimilarity(
        targetContent,
        message.content
      );

      if (similarity >= threshold) {
        similarMessages.push(message);
      }
    }

    return similarMessages;
  }

  analyzeSequenceSimilarity(
    messages: Message[],
    sequenceLength = 3,
    threshold: number = DEFAULT_SIMILARITY_THRESHOLD
  ): Array<{ sequence: Message[]; similarity: number }> {
    if (messages.length < sequenceLength * 2) {
      return [];
    }

    const sequences: Array<{ sequence: Message[]; similarity: number }> = [];

    for (let i = 0; i <= messages.length - sequenceLength; i++) {
      const sequence1 = messages.slice(i, i + sequenceLength);

      for (
        let j = i + sequenceLength;
        j <= messages.length - sequenceLength;
        j++
      ) {
        const sequence2 = messages.slice(j, j + sequenceLength);

        const similarity = this.calculateSequenceSimilarity(
          sequence1,
          sequence2
        );

        if (similarity >= threshold) {
          sequences.push({
            sequence: sequence1,
            similarity,
          });
        }
      }
    }

    return sequences.sort((a, b) => b.similarity - a.similarity);
  }

  private calculateSequenceSimilarity(
    sequence1: Message[],
    sequence2: Message[]
  ): number {
    if (sequence1.length !== sequence2.length) return 0;

    let totalSimilarity = 0;
    let validPairs = 0;

    for (let i = 0; i < sequence1.length; i++) {
      if (sequence1[i].role === sequence2[i].role) {
        const similarity = this.calculateSimilarity(
          sequence1[i].content,
          sequence2[i].content
        );
        totalSimilarity += similarity;
        validPairs++;
      }
    }

    return validPairs > 0 ? totalSimilarity / validPairs : 0;
  }

  analyzeNgramSimilarity(text1: string, text2: string, ngramSize = 2): number {
    const tokens1 = tokenize(text1, this.options);
    const tokens2 = tokenize(text2, this.options);

    if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
    if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

    const ngrams1 = new Set(generateNgrams(tokens1, ngramSize));
    const ngrams2 = new Set(generateNgrams(tokens2, ngramSize));

    if (ngrams1.size === 0 && ngrams2.size === 0) return 1.0;
    if (ngrams1.size === 0 || ngrams2.size === 0) return 0.0;

    const intersection = new Set([...ngrams1].filter((x) => ngrams2.has(x)));
    const union = new Set([...ngrams1, ...ngrams2]);

    return intersection.size / union.size;
  }

  private getCacheKey(text1: string, text2: string): string {
    const sortedTexts = [text1, text2].sort();
    return JSON.stringify(sortedTexts);
  }

  private setCacheValue(key: string, value: number): void {
    this.cache.set(key, value);

    setTimeout(() => {
      this.cache.delete(key);
    }, this.cacheTimeout);

    if (this.cache.size > MAX_CACHE_SIZE) {
      const keysToDelete = Array.from(this.cache.keys()).slice(
        0,
        CACHE_EVICTION_BATCH
      );
      for (const k of keysToDelete) {
        this.cache.delete(k);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  getCacheStats(): {
    size: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    const total = this.cacheHits + this.cacheMisses;

    return {
      size: this.cache.size,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      hits: this.cacheHits,
      misses: this.cacheMisses,
    };
  }
}
