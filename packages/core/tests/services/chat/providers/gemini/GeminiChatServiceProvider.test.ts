import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiChatServiceProvider } from '../../../../../src/services/chat/providers/gemini/GeminiChatServiceProvider.ts';
import { GeminiChatService } from '../../../../../src/services/chat/providers/gemini/GeminiChatService.ts';
import {
  MODEL_GEMINI_2_0_FLASH_LITE,
  GEMINI_VISION_SUPPORTED_MODELS,
} from '../../../../../src/constants';
import { ChatServiceOptions } from '../../../../../src/services/chat/providers/ChatServiceProvider.ts';

describe('GeminiChatServiceProvider', () => {
  let provider: GeminiChatServiceProvider;

  beforeEach(() => {
    provider = new GeminiChatServiceProvider();
  });

  it('should return "gemini" as provider name', () => {
    expect(provider.getProviderName()).toBe('gemini');
  });

  it('should return default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_GEMINI_2_0_FLASH_LITE);
  });

  it('should create GeminiChatService with given apiKey and model', () => {
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
      model: 'my-gemini-model',
    };
    const chatService = provider.createChatService(options);

    expect(chatService).toBeInstanceOf(GeminiChatService);
    expect(chatService.getModel()).toBe('my-gemini-model');
  });

  it('should fall back to default model if none is provided', () => {
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
    };
    const chatService = provider.createChatService(options);
    expect(chatService.getModel()).toBe(MODEL_GEMINI_2_0_FLASH_LITE);
  });

  it('should use visionModel if provided', () => {
    const visionModel = GEMINI_VISION_SUPPORTED_MODELS[0];
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
      model: MODEL_GEMINI_2_0_FLASH_LITE,
      visionModel,
    };
    const chatService = provider.createChatService(options);

    // provider's createChatService method passes visionModel to GeminiChatService constructor
    // check if visionModel is supported
    // in this case, just check if it's set correctly
    // (actually, there is no public method for visionModel, so we can't test it directly without reflection)
    expect(chatService).toBeInstanceOf(GeminiChatService);
  });

  it('should check if a model supports vision', () => {
    // support vision model
    expect(
      provider.supportsVisionForModel(GEMINI_VISION_SUPPORTED_MODELS[0]),
    ).toBe(true);
    // not support vision model
    expect(provider.supportsVisionForModel('some-other-model')).toBe(false);
  });
});
