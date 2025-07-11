import type { Message, ConversationPattern } from '../types/index.js';
import { generateId } from '../utils/browserUtils.js';
import { calculateTextSimilarity } from '../utils/textUtils.js';

export interface PatternDetectionResult {
  patterns: ConversationPattern[];
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface MessageSequence {
  messages: Message[];
  pattern: string;
  frequency: number;
  positions: number[];
}

export class PatternDetector {
  private readonly detectedPatterns: Map<string, ConversationPattern> =
    new Map();
  private readonly sequenceCache: Map<string, MessageSequence> = new Map();
  private readonly maxPatterns: number = 100;
  private readonly minPatternLength: number = 2;
  private readonly maxPatternLength: number = 5;

  detectPatterns(messages: Message[]): PatternDetectionResult {
    this.cleanupOldPatterns();

    const newPatterns = this.findNewPatterns(messages);
    const repeatedPatterns = this.findRepeatedPatterns(messages);
    const structuralPatterns = this.findStructuralPatterns(messages);

    const allPatterns = [
      ...newPatterns,
      ...repeatedPatterns,
      ...structuralPatterns,
    ];
    const uniquePatterns = this.deduplicatePatterns(allPatterns);

    // Clean up again to maintain the limit
    this.cleanupOldPatterns();

    const severity = this.calculateSeverity(uniquePatterns);
    const confidence = this.calculateConfidence(
      uniquePatterns,
      messages.length
    );

    return {
      patterns: uniquePatterns,
      severity,
      confidence,
    };
  }

  private findNewPatterns(messages: Message[]): ConversationPattern[] {
    const newPatterns: ConversationPattern[] = [];

    for (
      let length = this.minPatternLength;
      length <= this.maxPatternLength;
      length++
    ) {
      const patterns = this.extractSequencePatterns(messages, length);
      newPatterns.push(...patterns);
    }

    return newPatterns;
  }

  private extractSequencePatterns(
    messages: Message[],
    sequenceLength: number
  ): ConversationPattern[] {
    const patterns: ConversationPattern[] = [];
    const sequenceMap = new Map<string, MessageSequence>();

    for (let i = 0; i <= messages.length - sequenceLength; i++) {
      const sequence = messages.slice(i, i + sequenceLength);
      const pattern = this.createPatternSignature(sequence);

      if (sequenceMap.has(pattern)) {
        const existing = sequenceMap.get(pattern);
        if (!existing) continue;
        existing.frequency++;
        existing.positions.push(i);
      } else {
        sequenceMap.set(pattern, {
          messages: sequence,
          pattern,
          frequency: 1,
          positions: [i],
        });
      }
    }

    for (const [patternSignature, sequence] of sequenceMap) {
      if (sequence.frequency >= 2) {
        const pattern: ConversationPattern = {
          id: generateId(),
          pattern: patternSignature,
          frequency: sequence.frequency,
          firstSeen: sequence.messages[0].timestamp || Date.now(),
          lastSeen:
            sequence.messages[sequence.messages.length - 1].timestamp ||
            Date.now(),
          messages: sequence.messages,
        };

        patterns.push(pattern);
        this.detectedPatterns.set(pattern.id, pattern);
      }
    }

    return patterns;
  }

  private findRepeatedPatterns(messages: Message[]): ConversationPattern[] {
    const repeatedPatterns: ConversationPattern[] = [];
    const foundPairs = new Set<string>();

    for (let i = 0; i < messages.length - 1; i++) {
      const currentMessage = messages[i];

      for (let j = i + 1; j < messages.length; j++) {
        const compareMessage = messages[j];

        if (currentMessage.role === compareMessage.role) {
          const similarity = calculateTextSimilarity(
            currentMessage.content,
            compareMessage.content
          );

          if (similarity >= 0.8) {
            // Create a unique key for this pair to avoid duplicates
            const pairKey = `${Math.min(i, j)}_${Math.max(i, j)}`;

            if (!foundPairs.has(pairKey)) {
              foundPairs.add(pairKey);

              const pattern: ConversationPattern = {
                id: generateId(),
                pattern: `Repeated ${currentMessage.role} message`,
                frequency: 2,
                firstSeen: currentMessage.timestamp || Date.now(),
                lastSeen: compareMessage.timestamp || Date.now(),
                messages: [currentMessage, compareMessage],
              };

              repeatedPatterns.push(pattern);
              this.detectedPatterns.set(pattern.id, pattern);
            }
          }
        }
      }
    }

    return repeatedPatterns;
  }

  private findStructuralPatterns(messages: Message[]): ConversationPattern[] {
    const structuralPatterns: ConversationPattern[] = [];

    const roleSequences = this.extractRoleSequences(messages);
    const repeatedRoleSequences = this.findRepeatedRoleSequences(roleSequences);

    for (const sequence of repeatedRoleSequences) {
      const pattern: ConversationPattern = {
        id: generateId(),
        pattern: `Role sequence: ${sequence.pattern}`,
        frequency: sequence.frequency,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        messages: sequence.messages,
      };

      structuralPatterns.push(pattern);
    }

    return structuralPatterns;
  }

  private extractRoleSequences(messages: Message[]): MessageSequence[] {
    const sequences: MessageSequence[] = [];

    for (let length = 2; length <= Math.min(4, messages.length); length++) {
      for (let i = 0; i <= messages.length - length; i++) {
        const sequence = messages.slice(i, i + length);
        const pattern = sequence.map((m) => m.role).join('-');

        sequences.push({
          messages: sequence,
          pattern,
          frequency: 1,
          positions: [i],
        });
      }
    }

    return sequences;
  }

  private findRepeatedRoleSequences(
    sequences: MessageSequence[]
  ): MessageSequence[] {
    const sequenceMap = new Map<string, MessageSequence>();

    for (const sequence of sequences) {
      if (sequenceMap.has(sequence.pattern)) {
        const existing = sequenceMap.get(sequence.pattern);
        if (!existing) continue;
        existing.frequency++;
        existing.positions.push(...sequence.positions);
      } else {
        sequenceMap.set(sequence.pattern, { ...sequence });
      }
    }

    return Array.from(sequenceMap.values()).filter((seq) => seq.frequency >= 3);
  }

  private createPatternSignature(messages: Message[]): string {
    return messages
      .map((m) => {
        const contentWords = m.content.split(/\s+/).slice(0, 3);
        return `${m.role}:${contentWords.join(' ')}`;
      })
      .join('|');
  }

  private deduplicatePatterns(
    patterns: ConversationPattern[]
  ): ConversationPattern[] {
    const unique = new Map<string, ConversationPattern>();

    for (const pattern of patterns) {
      const key = `${pattern.pattern}_${pattern.frequency}`;

      const existingPattern = unique.get(key);
      if (
        !unique.has(key) ||
        (existingPattern && existingPattern.frequency < pattern.frequency)
      ) {
        unique.set(key, pattern);
      }
    }

    return Array.from(unique.values()).sort(
      (a, b) => b.frequency - a.frequency
    );
  }

  private calculateSeverity(
    patterns: ConversationPattern[]
  ): 'low' | 'medium' | 'high' {
    if (patterns.length === 0) return 'low';

    const maxFrequency = Math.max(...patterns.map((p) => p.frequency));
    const totalPatterns = patterns.length;

    if (maxFrequency >= 5 || totalPatterns >= 10) return 'high';
    if (maxFrequency >= 3 || totalPatterns >= 5) return 'medium';
    return 'low';
  }

  private calculateConfidence(
    patterns: ConversationPattern[],
    totalMessages: number
  ): number {
    if (patterns.length === 0 || totalMessages === 0) return 0;

    const totalPatternMessages = patterns.reduce(
      (sum, p) => sum + p.messages.length * p.frequency,
      0
    );
    const confidence = Math.min(totalPatternMessages / totalMessages, 1.0);

    return Math.round(confidence * 100) / 100;
  }

  getPatternStatistics(): {
    totalPatterns: number;
    averageFrequency: number;
    mostFrequentPattern: ConversationPattern | null;
    oldestPattern: ConversationPattern | null;
  } {
    const patterns = Array.from(this.detectedPatterns.values());

    if (patterns.length === 0) {
      return {
        totalPatterns: 0,
        averageFrequency: 0,
        mostFrequentPattern: null,
        oldestPattern: null,
      };
    }

    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const averageFrequency = totalFrequency / patterns.length;

    const mostFrequentPattern = patterns.reduce((max, p) =>
      p.frequency > max.frequency ? p : max
    );

    const oldestPattern = patterns.reduce((oldest, p) =>
      p.firstSeen < oldest.firstSeen ? p : oldest
    );

    return {
      totalPatterns: patterns.length,
      averageFrequency: Math.round(averageFrequency * 100) / 100,
      mostFrequentPattern,
      oldestPattern,
    };
  }

  private cleanupOldPatterns(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24時間

    // First, remove old patterns
    for (const [id, pattern] of this.detectedPatterns) {
      if (now - pattern.lastSeen > maxAge) {
        this.detectedPatterns.delete(id);
      }
    }

    // Then, enforce the maximum pattern limit
    while (this.detectedPatterns.size >= this.maxPatterns) {
      const sortedPatterns = Array.from(this.detectedPatterns.values()).sort(
        (a, b) => a.lastSeen - b.lastSeen
      );

      if (sortedPatterns.length > 0) {
        // Remove the oldest pattern
        this.detectedPatterns.delete(sortedPatterns[0].id);
      } else {
        break;
      }
    }
  }

  clearPatterns(): void {
    this.detectedPatterns.clear();
    this.sequenceCache.clear();
  }
}
