import { describe, it, expect } from 'vitest';
import {
  CHAT_RESPONSE_LENGTH,
  MAX_TOKENS_BY_LENGTH,
  DEFAULT_MAX_TOKENS,
} from '@aituber-onair/chat';

describe('Chat Constants - Response Length Control', () => {
  describe('CHAT_RESPONSE_LENGTH', () => {
    it('should have all required response length constants', () => {
      // Assert
      expect(CHAT_RESPONSE_LENGTH).toBeDefined();
      expect(CHAT_RESPONSE_LENGTH.VERY_SHORT).toBe('veryShort');
      expect(CHAT_RESPONSE_LENGTH.SHORT).toBe('short');
      expect(CHAT_RESPONSE_LENGTH.MEDIUM).toBe('medium');
      expect(CHAT_RESPONSE_LENGTH.LONG).toBe('long');
      expect(CHAT_RESPONSE_LENGTH.VERY_LONG).toBe('veryLong');
      // Reasoning-aware response lengths
      expect(CHAT_RESPONSE_LENGTH.REASONING_SHORT).toBe('reasoningShort');
      expect(CHAT_RESPONSE_LENGTH.REASONING_MEDIUM).toBe('reasoningMedium');
      expect(CHAT_RESPONSE_LENGTH.REASONING_LONG).toBe('reasoningLong');
      expect(CHAT_RESPONSE_LENGTH.REASONING_DEEP).toBe('reasoningDeep');
    });

    it('should have consistent string values', () => {
      // Assert - Values should be camelCase or lowercase
      const values = Object.values(CHAT_RESPONSE_LENGTH);
      values.forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value).toMatch(/^[a-zA-Z]+$/);
      });
    });
  });

  describe('MAX_TOKENS_BY_LENGTH', () => {
    it('should have mappings for all response lengths', () => {
      // Assert
      expect(MAX_TOKENS_BY_LENGTH).toBeDefined();
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_SHORT]).toBe(40);
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.SHORT]).toBe(100);
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.MEDIUM]).toBe(200);
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.LONG]).toBe(300);
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_LONG]).toBe(1000);
      // Reasoning-aware response lengths
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_SHORT]).toBe(
        800,
      );
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_MEDIUM]).toBe(
        1500,
      );
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_LONG]).toBe(
        3000,
      );
      expect(MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_DEEP]).toBe(
        5000,
      );
    });

    it('should have ascending token values', () => {
      // Arrange
      const tokenValues = [
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_SHORT],
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.SHORT],
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.MEDIUM],
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.LONG],
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_SHORT],
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_LONG],
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_MEDIUM],
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_LONG],
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_DEEP],
      ];

      // Assert - Values should be in ascending order
      for (let i = 1; i < tokenValues.length; i++) {
        expect(tokenValues[i]).toBeGreaterThan(tokenValues[i - 1]);
      }
    });

    it('should have positive integer values', () => {
      // Assert
      Object.values(MAX_TOKENS_BY_LENGTH).forEach((value) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
        expect(Number.isInteger(value)).toBe(true);
      });
    });

    it('should have reasonable token limits', () => {
      // Assert - Token limits should be within reasonable bounds
      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_SHORT],
      ).toBeGreaterThanOrEqual(10);
      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_SHORT],
      ).toBeLessThanOrEqual(100);

      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.LONG],
      ).toBeGreaterThanOrEqual(200);
      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.LONG],
      ).toBeLessThanOrEqual(500);

      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_LONG],
      ).toBeGreaterThanOrEqual(500);
      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.VERY_LONG],
      ).toBeLessThanOrEqual(2000);

      // Reasoning-aware response lengths should have higher limits
      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_SHORT],
      ).toBeGreaterThanOrEqual(500);
      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_SHORT],
      ).toBeLessThanOrEqual(1000);

      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_DEEP],
      ).toBeGreaterThanOrEqual(3000);
      expect(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_DEEP],
      ).toBeLessThanOrEqual(10000);
    });
  });

  describe('DEFAULT_MAX_TOKENS', () => {
    it('should be defined as a positive integer', () => {
      // Assert
      expect(DEFAULT_MAX_TOKENS).toBeDefined();
      expect(typeof DEFAULT_MAX_TOKENS).toBe('number');
      expect(DEFAULT_MAX_TOKENS).toBeGreaterThan(0);
      expect(Number.isInteger(DEFAULT_MAX_TOKENS)).toBe(true);
    });

    it('should be higher than or equal to highest predefined limit', () => {
      // Assert - DEFAULT_MAX_TOKENS should be higher than or equal to the highest predefined limit
      expect(DEFAULT_MAX_TOKENS).toBeGreaterThanOrEqual(
        MAX_TOKENS_BY_LENGTH[CHAT_RESPONSE_LENGTH.REASONING_DEEP],
      );
    });

    it('should be within reasonable bounds', () => {
      // Assert
      expect(DEFAULT_MAX_TOKENS).toBeGreaterThanOrEqual(100);
      expect(DEFAULT_MAX_TOKENS).toBeLessThanOrEqual(10000);
    });
  });

  describe('consistency checks', () => {
    it('should have same number of response lengths and token mappings', () => {
      // Assert
      const responseLengthKeys = Object.keys(CHAT_RESPONSE_LENGTH);
      const tokenMappingKeys = Object.keys(MAX_TOKENS_BY_LENGTH);

      expect(tokenMappingKeys.length).toBe(responseLengthKeys.length);
    });

    it('should have all response lengths mapped to tokens', () => {
      // Assert
      Object.values(CHAT_RESPONSE_LENGTH).forEach((responseLength) => {
        expect(MAX_TOKENS_BY_LENGTH).toHaveProperty(responseLength);
        expect(typeof MAX_TOKENS_BY_LENGTH[responseLength]).toBe('number');
      });
    });

    it('should not have extra token mappings', () => {
      // Assert
      const validResponseLengths = Object.values(CHAT_RESPONSE_LENGTH);
      Object.keys(MAX_TOKENS_BY_LENGTH).forEach((key) => {
        expect(validResponseLengths).toContain(key);
      });
    });
  });

  describe('type safety', () => {
    it('should use ChatResponseLength type for keys', () => {
      // Assert - This is more of a compile-time check, but we can verify structure
      const expectedKeys = [
        'veryShort',
        'short',
        'medium',
        'long',
        'veryLong',
        'reasoningShort',
        'reasoningMedium',
        'reasoningLong',
        'reasoningDeep',
      ];
      const actualKeys = Object.values(CHAT_RESPONSE_LENGTH).sort();

      expect(actualKeys).toEqual(expectedKeys.sort());
    });

    it('should be compatible with common use cases', () => {
      // Assert - Test that constants can be used in typical scenarios
      const testResponseLength = CHAT_RESPONSE_LENGTH.MEDIUM;
      const testTokenLimit = MAX_TOKENS_BY_LENGTH[testResponseLength];

      expect(testTokenLimit).toBe(200);

      // Test fallback scenario
      const fallbackLimit =
        MAX_TOKENS_BY_LENGTH[testResponseLength] || DEFAULT_MAX_TOKENS;
      expect(fallbackLimit).toBe(200);
    });
  });

  describe('integration scenarios', () => {
    it('should support priority handling logic', () => {
      // Arrange - Simulate typical priority handling
      const directMaxTokens = 150;
      const responseLength = CHAT_RESPONSE_LENGTH.LONG;

      // Act - Priority: direct > preset > default
      const resultMaxTokens =
        directMaxTokens ||
        MAX_TOKENS_BY_LENGTH[responseLength] ||
        DEFAULT_MAX_TOKENS;

      // Assert
      expect(resultMaxTokens).toBe(directMaxTokens);
    });

    it('should support preset fallback logic', () => {
      // Arrange - Simulate when only preset is specified
      const directMaxTokens = undefined;
      const responseLength = CHAT_RESPONSE_LENGTH.SHORT;

      // Act
      const resultMaxTokens =
        directMaxTokens ||
        MAX_TOKENS_BY_LENGTH[responseLength] ||
        DEFAULT_MAX_TOKENS;

      // Assert
      expect(resultMaxTokens).toBe(100);
    });

    it('should support default fallback logic', () => {
      // Arrange - Simulate when nothing is specified
      const directMaxTokens = undefined;
      const responseLength = undefined;

      // Act
      const resultMaxTokens =
        directMaxTokens ||
        (responseLength ? MAX_TOKENS_BY_LENGTH[responseLength] : undefined) ||
        DEFAULT_MAX_TOKENS;

      // Assert
      expect(resultMaxTokens).toBe(DEFAULT_MAX_TOKENS);
    });
  });
});
