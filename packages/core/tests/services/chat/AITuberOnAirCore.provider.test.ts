import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreOptions,
} from '../../../src/core/AITuberOnAirCore';
import { ChatServiceFactory } from '../../../src/services/chat/ChatServiceFactory';
import { OpenAIChatServiceProvider } from '../../../src/services/chat/providers/OpenAIChatServiceProvider';

// Mock the ChatService
const mockChatService = {
  processChat: vi.fn().mockResolvedValue(undefined),
  processVisionChat: vi.fn().mockResolvedValue(undefined),
  provider: 'openai',
  getModel: vi.fn().mockReturnValue('gpt-4o-mini'),
};

// Create default options for testing
const getDefaultOptions = (): AITuberOnAirCoreOptions => ({
  apiKey: 'test-key',
  chatOptions: {
    systemPrompt: 'You are a test AI',
  },
  voiceOptions: {
    speaker: '1',
    engineType: 'voicevox',
  }
});

// Mock the OpenAIChatService constructor
vi.mock('../../src/services/chat/OpenAIChatService', () => {
  return {
    OpenAIChatService: vi.fn().mockImplementation(() => mockChatService),
  };
});

// Mock VoiceEngineAdapter
vi.mock('../../src/services/voice/VoiceEngineAdapter', () => {
  return {
    VoiceEngineAdapter: vi.fn().mockImplementation(() => ({
      speakText: vi.fn().mockResolvedValue(undefined),
      speak: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      updateOptions: vi.fn(),
    })),
  };
});

describe('AITuberOnAirCore - ChatProvider tests', () => {
  // Keep track of original methods
  const originalRegisterProvider = ChatServiceFactory.registerProvider;
  const originalCreateChatService = ChatServiceFactory.createChatService;
  const originalGetProviders = ChatServiceFactory.getProviders;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock ChatServiceFactory methods
    ChatServiceFactory.createChatService = vi.fn().mockReturnValue(mockChatService);
    ChatServiceFactory.getProviders = vi.fn().mockReturnValue(new Map([
      ['openai', new OpenAIChatServiceProvider()]
    ]));
  });

  afterEach(() => {
    // Restore original methods
    ChatServiceFactory.registerProvider = originalRegisterProvider;
    ChatServiceFactory.createChatService = originalCreateChatService;
    ChatServiceFactory.getProviders = originalGetProviders;
  });

  it('should use openai provider by default when chatProvider is not specified', () => {
    // Create AITuberOnAirCore instance without specifying chatProvider
    const options = getDefaultOptions();
    const core = new AITuberOnAirCore(options);
    
    // Verify ChatServiceFactory.createChatService was called with correct parameters
    expect(ChatServiceFactory.createChatService).toHaveBeenCalledWith(
      'openai',
      expect.objectContaining({
        apiKey: 'test-key',
      })
    );
  });

  it('should use specified provider when chatProvider is set explicitly', () => {
    // Create AITuberOnAirCore instance with explicit chatProvider
    const options = {
      ...getDefaultOptions(),
      chatProvider: 'openai',
    };
    const core = new AITuberOnAirCore(options);
    
    // Verify ChatServiceFactory.createChatService was called with correct parameters
    expect(ChatServiceFactory.createChatService).toHaveBeenCalledWith(
      'openai',
      expect.objectContaining({
        apiKey: 'test-key',
      })
    );
  });

  it('should throw error when invalid provider is specified', () => {
    // Mock createChatService to throw error for invalid provider
    ChatServiceFactory.createChatService = vi.fn().mockImplementation((providerName) => {
      if (providerName !== 'openai') {
        throw new Error(`Unknown chat provider: ${providerName}`);
      }
      return mockChatService;
    });

    // Expect error when creating AITuberOnAirCore with invalid provider
    const options = {
      ...getDefaultOptions(),
      chatProvider: 'invalid-provider',
    };
    
    expect(() => {
      new AITuberOnAirCore(options);
    }).toThrow('Unknown chat provider: invalid-provider');
  });
}); 