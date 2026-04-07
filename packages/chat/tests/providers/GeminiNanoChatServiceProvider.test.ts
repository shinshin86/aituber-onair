import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiNanoChatServiceProvider } from '../../src/services/providers/geminiNano/GeminiNanoChatServiceProvider';
import { MODEL_GEMINI_NANO } from '../../src/constants';

vi.mock('../../src/services/providers/geminiNano/GeminiNanoChatService');
import { GeminiNanoChatService } from '../../src/services/providers/geminiNano/GeminiNanoChatService';

describe('GeminiNanoChatServiceProvider', () => {
  let provider: GeminiNanoChatServiceProvider;

  beforeEach(() => {
    provider = new GeminiNanoChatServiceProvider();
    vi.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return "gemini-nano"', () => {
      expect(provider.getProviderName()).toBe('gemini-nano');
    });
  });

  describe('getSupportedModels', () => {
    it('should return array with gemini-nano', () => {
      const models = provider.getSupportedModels();
      expect(models).toEqual([MODEL_GEMINI_NANO]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return gemini-nano as default model', () => {
      expect(provider.getDefaultModel()).toBe(MODEL_GEMINI_NANO);
    });
  });

  describe('supportsVision', () => {
    it('should return false', () => {
      expect(provider.supportsVision()).toBe(false);
      expect(provider.getVisionSupportLevel()).toBe('unsupported');
    });
  });

  describe('createChatService', () => {
    it('should create GeminiNanoChatService with default options', () => {
      provider.createChatService({});
      expect(GeminiNanoChatService).toHaveBeenCalledWith({
        expectedInputLanguages: undefined,
        expectedOutputLanguages: undefined,
        responseLength: undefined,
      });
    });

    it('should pass language options through', () => {
      provider.createChatService({
        expectedInputLanguages: ['en'],
        expectedOutputLanguages: ['en'],
        responseLength: 'short',
      });
      expect(GeminiNanoChatService).toHaveBeenCalledWith({
        expectedInputLanguages: ['en'],
        expectedOutputLanguages: ['en'],
        responseLength: 'short',
      });
    });
  });
});
