import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeChatServiceProvider } from '../../../../../src/services/chat/providers/claude/ClaudeChatServiceProvider.ts';
import { ClaudeChatService } from '../../../../../src/services/chat/providers/claude/ClaudeChatService.ts';
import {
  MODEL_CLAUDE_3_HAIKU,
  MODEL_CLAUDE_3_5_HAIKU,
  CLAUDE_VISION_SUPPORTED_MODELS,
} from '../../../../../src/constants';
import { ChatServiceOptions } from '../../../../../src/services/chat/providers/ChatServiceProvider.ts';

describe('ClaudeChatServiceProvider', () => {
  let provider: ClaudeChatServiceProvider;

  beforeEach(() => {
    provider = new ClaudeChatServiceProvider();
  });

  it('should return "claude" as provider name', () => {
    expect(provider.getProviderName()).toBe('claude');
  });

  it('should return default model', () => {
    expect(provider.getDefaultModel()).toBe(MODEL_CLAUDE_3_HAIKU);
  });

  it('should create ClaudeChatService with given apiKey and model', () => {
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
      model: MODEL_CLAUDE_3_5_HAIKU,
    };
    const chatService = provider.createChatService(options);

    expect(chatService).toBeInstanceOf(ClaudeChatService);
    expect(chatService.getModel()).toBe(MODEL_CLAUDE_3_5_HAIKU);
  });

  it('should fall back to default model if none is provided', () => {
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
    };
    const chatService = provider.createChatService(options);
    expect(chatService.getModel()).toBe(MODEL_CLAUDE_3_HAIKU);
  });

  it('should use visionModel if provided', () => {
    const visionModel = CLAUDE_VISION_SUPPORTED_MODELS[0];
    const options: ChatServiceOptions = {
      apiKey: 'test-key',
      model: MODEL_CLAUDE_3_HAIKU,
      visionModel,
    };
    const chatService = provider.createChatService(options);

    expect(chatService).toBeInstanceOf(ClaudeChatService);
  });

  it('should check if a model supports vision', () => {
    expect(
      provider.supportsVisionForModel(CLAUDE_VISION_SUPPORTED_MODELS[0]),
    ).toBe(true);
    expect(provider.supportsVisionForModel('unsupported-model')).toBe(false);
  });
});
