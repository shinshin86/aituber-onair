import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatServiceFactory } from '../../../src/services/chat/ChatServiceFactory';
import {
  ChatServiceProvider,
  ChatServiceOptions,
} from '../../../src/services/chat/providers/ChatServiceProvider';
import { ChatService } from '../../../src/services/chat/ChatService';

// Simple mock ChatService implementation
class MockChatService implements ChatService {
  constructor(private model: string = 'mock-model') {}
  getModel(): string {
    return this.model;
  }
  getVisionModel(): string {
    return 'mock-vision';
  }
  async processChat() {
    /* noop */
  }
  async processVisionChat() {
    /* noop */
  }
  async chatOnce() {
    return {} as any;
  }
  async visionChatOnce() {
    return {} as any;
  }
}

// Mock provider returning the mock service
class MockProvider implements ChatServiceProvider {
  createChatService(options: ChatServiceOptions): ChatService {
    return new MockChatService(options.model || this.getDefaultModel());
  }
  getProviderName(): string {
    return 'mock';
  }
  getSupportedModels(): string[] {
    return ['mock-model'];
  }
  getDefaultModel(): string {
    return 'mock-model';
  }
  supportsVision(): boolean {
    return true;
  }
}

describe('ChatServiceFactory', () => {
  const mockProvider = new MockProvider();
  let originalProviders: Map<string, ChatServiceProvider>;

  beforeEach(() => {
    // backup existing providers and register mock
    originalProviders = new Map(ChatServiceFactory.getProviders());
    ChatServiceFactory.getProviders().clear();
    originalProviders.forEach((p) => ChatServiceFactory.registerProvider(p));
    ChatServiceFactory.registerProvider(mockProvider);
  });

  afterEach(() => {
    // restore original providers
    ChatServiceFactory.getProviders().clear();
    originalProviders.forEach((p) => ChatServiceFactory.registerProvider(p));
  });

  it('creates chat service using registered provider', () => {
    const service = ChatServiceFactory.createChatService('mock', {
      apiKey: 'key',
    });
    expect(service).toBeInstanceOf(MockChatService);
    expect(service.getModel()).toBe('mock-model');
  });

  it('returns available providers including mock', () => {
    const providers = ChatServiceFactory.getAvailableProviders();
    expect(providers).toContain('mock');
  });

  it('returns supported models for mock provider', () => {
    const models = ChatServiceFactory.getSupportedModels('mock');
    expect(models).toEqual(['mock-model']);
  });

  it('throws on unknown provider', () => {
    expect(() =>
      ChatServiceFactory.createChatService('not_exist', {} as any),
    ).toThrow('Unknown chat provider');
  });
});
