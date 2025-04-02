import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIChatServiceProvider } from '../../../../../src/services/chat/providers/openai/OpenAIChatServiceProvider.ts';
import { OpenAIChatService } from '../../../../../src/services/chat/providers/openai/OpenAIChatService.ts';
import {
  MODEL_GPT_4O_MINI,
  MODEL_GPT_4O,
  MODEL_O3_MINI,
  VISION_SUPPORTED_MODELS,
} from '../../../../../src/constants';
import { ChatServiceOptions } from '../../../../../src/services/chat/providers/ChatServiceProvider.ts';

describe('OpenAIChatServiceProvider', () => {
  let provider: OpenAIChatServiceProvider;

  beforeEach(() => {
    provider = new OpenAIChatServiceProvider();
  });

  it('should return "openai" as provider name', () => {
    expect(provider.getProviderName()).toBe('openai');
  });

  it('should return default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_GPT_4O_MINI);
  });

  it('should create OpenAIChatService with given apiKey and model', () => {
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
      model: 'my-openai-model',
    };
    const chatService = provider.createChatService(options);

    expect(chatService).toBeInstanceOf(OpenAIChatService);
    expect(chatService.getModel()).toBe('my-openai-model');
  });

  it('should fall back to default model if none is provided', () => {
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
    };
    const chatService = provider.createChatService(options);
    expect(chatService.getModel()).toBe(MODEL_GPT_4O_MINI);
  });

  it('should use visionModel if provided', () => {
    const visionModel = MODEL_GPT_4O;
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
      model: MODEL_O3_MINI,
      visionModel,
    };
    const chatService = provider.createChatService(options);

    // provider's createChatService method passes visionModel to OpenAIChatService constructor
    expect(chatService).toBeInstanceOf(OpenAIChatService);
  });

  it('should check if a model supports vision', () => {
    // support vision model
    expect(provider.supportsVisionForModel(VISION_SUPPORTED_MODELS[0])).toBe(
      true,
    );
    // not support vision model
    expect(provider.supportsVisionForModel('some-other-model')).toBe(false);
  });
});
