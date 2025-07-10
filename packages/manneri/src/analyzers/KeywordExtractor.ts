import type {
  Message,
  TopicInfo,
  TextAnalysisOptions,
} from '../types/index.js';
import { tokenize, extractKeywords } from '../utils/textUtils.js';
import { measurePerformance } from '../utils/browserUtils.js';

export interface KeywordFrequency {
  keyword: string;
  frequency: number;
  score: number;
  firstSeen: number;
  lastSeen: number;
  contexts: string[];
}

export interface TopicCluster {
  id: string;
  keywords: string[];
  score: number;
  messageCount: number;
  firstMessage: number;
  lastMessage: number;
}

export class KeywordExtractor {
  private readonly options: TextAnalysisOptions;
  private readonly keywordFrequencies: Map<string, KeywordFrequency> =
    new Map();
  private readonly topicClusters: Map<string, TopicCluster> = new Map();
  private readonly maxKeywords: number = 50;
  private readonly maxContextLength: number = 100;

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

  extractKeywordsFromMessage(message: Message): string[] {
    return measurePerformance(
      'extractKeywords',
      () => extractKeywords(message.content, this.options),
      false
    );
  }

  extractKeywordsFromMessages(messages: Message[]): string[] {
    const allKeywords: string[] = [];

    for (const message of messages) {
      const keywords = this.extractKeywordsFromMessage(message);
      allKeywords.push(...keywords);
    }

    const keywordCounts = new Map<string, number>();

    for (const keyword of allKeywords) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    }

    return Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword]) => keyword);
  }

  analyzeKeywordFrequencies(messages: Message[]): KeywordFrequency[] {
    const keywordData = new Map<string, KeywordFrequency>();

    for (const message of messages) {
      const keywords = this.extractKeywordsFromMessage(message);
      const timestamp = message.timestamp || Date.now();

      for (const keyword of keywords) {
        if (keywordData.has(keyword)) {
          const data = keywordData.get(keyword)!;
          data.frequency++;
          data.lastSeen = Math.max(data.lastSeen, timestamp);
          data.score = this.calculateKeywordScore(
            data.frequency,
            data.firstSeen,
            data.lastSeen
          );

          if (data.contexts.length < 5) {
            const context = message.content.substring(0, this.maxContextLength);
            if (!data.contexts.includes(context)) {
              data.contexts.push(context);
            }
          }
        } else {
          keywordData.set(keyword, {
            keyword,
            frequency: 1,
            score: 1,
            firstSeen: timestamp,
            lastSeen: timestamp,
            contexts: [message.content.substring(0, this.maxContextLength)],
          });
        }
      }
    }

    return Array.from(keywordData.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxKeywords);
  }

  detectTopicShift(
    recentMessages: Message[],
    historicalMessages: Message[],
    threshold: number = 0.5
  ): { hasShift: boolean; newTopics: string[]; oldTopics: string[] } {
    const recentKeywords = new Set(
      this.extractKeywordsFromMessages(recentMessages)
    );
    const historicalKeywords = new Set(
      this.extractKeywordsFromMessages(historicalMessages)
    );

    const intersection = new Set(
      [...recentKeywords].filter((x) => historicalKeywords.has(x))
    );
    const union = new Set([...recentKeywords, ...historicalKeywords]);

    const similarity = intersection.size / union.size;
    const hasShift = similarity < threshold;

    const newTopics = Array.from(recentKeywords).filter(
      (k) => !historicalKeywords.has(k)
    );
    const oldTopics = Array.from(historicalKeywords).filter(
      (k) => !recentKeywords.has(k)
    );

    return {
      hasShift,
      newTopics,
      oldTopics,
    };
  }

  analyzeTopicClusters(messages: Message[]): TopicCluster[] {
    const keywordFrequencies = this.analyzeKeywordFrequencies(messages);
    const clusters = new Map<string, TopicCluster>();

    for (const message of messages) {
      const keywords = this.extractKeywordsFromMessage(message);
      const timestamp = message.timestamp || Date.now();

      for (const keyword of keywords) {
        const relatedKeywords = this.findRelatedKeywords(
          keyword,
          keywordFrequencies
        );
        const clusterId = this.generateClusterId(relatedKeywords);

        if (clusters.has(clusterId)) {
          const cluster = clusters.get(clusterId)!;
          cluster.messageCount++;
          cluster.lastMessage = Math.max(cluster.lastMessage, timestamp);
          cluster.score = this.calculateClusterScore(cluster);
        } else {
          clusters.set(clusterId, {
            id: clusterId,
            keywords: relatedKeywords,
            score: 1,
            messageCount: 1,
            firstMessage: timestamp,
            lastMessage: timestamp,
          });
        }
      }
    }

    return Array.from(clusters.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  getTopicInfo(messages: Message[]): TopicInfo[] {
    const clusters = this.analyzeTopicClusters(messages);

    return clusters.map((cluster) => ({
      keywords: cluster.keywords,
      score: cluster.score,
      category: this.categorizeKeywords(cluster.keywords),
      confidence: Math.min(cluster.score / 10, 1.0),
    }));
  }

  findRepeatedKeywords(
    messages: Message[],
    minRepetitions: number = 3,
    windowSize: number = 5
  ): Array<{ keyword: string; positions: number[]; density: number }> {
    const keywordPositions = new Map<string, number[]>();

    for (let i = 0; i < messages.length; i++) {
      const keywords = this.extractKeywordsFromMessage(messages[i]);

      for (const keyword of keywords) {
        if (!keywordPositions.has(keyword)) {
          keywordPositions.set(keyword, []);
        }
        keywordPositions.get(keyword)!.push(i);
      }
    }

    const repeatedKeywords: Array<{
      keyword: string;
      positions: number[];
      density: number;
    }> = [];

    for (const [keyword, positions] of keywordPositions) {
      if (positions.length >= minRepetitions) {
        const density = this.calculateKeywordDensity(positions, windowSize);

        if (density > 0.5) {
          repeatedKeywords.push({
            keyword,
            positions,
            density,
          });
        }
      }
    }

    return repeatedKeywords.sort((a, b) => b.density - a.density);
  }

  private calculateKeywordScore(
    frequency: number,
    firstSeen: number,
    lastSeen: number
  ): number {
    const recencyFactor = 1 - (Date.now() - lastSeen) / (24 * 60 * 60 * 1000);
    const persistenceFactor = (lastSeen - firstSeen) / (60 * 60 * 1000);

    return (
      frequency *
      (1 + Math.max(0, recencyFactor)) *
      (1 + Math.min(1, persistenceFactor / 24))
    );
  }

  private findRelatedKeywords(
    keyword: string,
    frequencies: KeywordFrequency[]
  ): string[] {
    const related = [keyword];

    for (const freq of frequencies) {
      if (freq.keyword !== keyword && freq.frequency > 1) {
        const similarity = this.calculateSemanticSimilarity(
          keyword,
          freq.keyword
        );
        if (similarity > 0.3) {
          related.push(freq.keyword);
        }
      }
    }

    return related.slice(0, 5);
  }

  private calculateSemanticSimilarity(word1: string, word2: string): number {
    const tokens1 = tokenize(word1, this.options);
    const tokens2 = tokenize(word2, this.options);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private generateClusterId(keywords: string[]): string {
    return keywords.sort().join('|');
  }

  private calculateClusterScore(cluster: TopicCluster): number {
    const keywordCount = cluster.keywords.length;
    const messageCount = cluster.messageCount;
    const timeSpan = cluster.lastMessage - cluster.firstMessage;

    return (
      keywordCount *
      messageCount *
      (1 + Math.min(1, timeSpan / (60 * 60 * 1000)))
    );
  }

  private categorizeKeywords(keywords: string[]): string {
    const categories = {
      技術: [
        '技術',
        'プログラミング',
        'コード',
        'システム',
        'API',
        'データベース',
        'サーバー',
      ],
      エンターテイメント: [
        'ゲーム',
        '音楽',
        '映画',
        'アニメ',
        'TV',
        'スポーツ',
      ],
      日常: ['食事', '天気', '仕事', '家族', '友達', '学校'],
      その他: [],
    };

    for (const [category, categoryKeywords] of Object.entries(categories)) {
      if (category === 'その他') continue;

      const matchCount = keywords.filter((k) =>
        categoryKeywords.some((ck) => k.includes(ck) || ck.includes(k))
      ).length;

      if (matchCount > 0) {
        return category;
      }
    }

    return 'その他';
  }

  private calculateKeywordDensity(
    positions: number[],
    windowSize: number
  ): number {
    if (positions.length < 2) return 0;

    let maxDensity = 0;

    for (let i = 0; i < positions.length - 1; i++) {
      let count = 1;
      const start = positions[i];

      for (let j = i + 1; j < positions.length; j++) {
        if (positions[j] - start < windowSize) {
          count++;
        } else {
          break;
        }
      }

      const density = count / windowSize;
      maxDensity = Math.max(maxDensity, density);
    }

    return maxDensity;
  }

  clearCache(): void {
    this.keywordFrequencies.clear();
    this.topicClusters.clear();
  }
}
