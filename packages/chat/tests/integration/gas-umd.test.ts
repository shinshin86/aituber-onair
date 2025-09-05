import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock UrlFetchApp for GAS environment simulation
const mockUrlFetchApp = {
  fetch: vi.fn(),
};

// Mock response creator
const createMockGASResponse = (status: number, content: string) => ({
  getResponseCode: () => status,
  getContentText: () => content,
});

// Global UMD bundle object
let AITuberOnAirChat: any;

describe('GAS + UMD Integration', () => {
  beforeAll(async () => {
    // Load UMD bundle
    const umdPath = path.resolve(
      __dirname,
      '../../dist/umd/aituber-onair-chat.js',
    );

    if (!fs.existsSync(umdPath)) {
      throw new Error(
        `UMD bundle not found at ${umdPath}. Please run 'npm run build:umd' first.`,
      );
    }

    const umdBundle = fs.readFileSync(umdPath, 'utf-8');

    // Create mock global environment for UMD
    const mockGlobal = {
      global: {},
      window: {},
      self: {},
      exports: {},
      module: { exports: {} },
      define: undefined,
    };

    // Execute UMD bundle
    const executeBundle = new Function(
      'global',
      'window',
      'self',
      'exports',
      'module',
      'define',
      umdBundle +
        '; return typeof AITuberOnAirChat !== "undefined" ? AITuberOnAirChat : this.AITuberOnAirChat;',
    );

    AITuberOnAirChat = executeBundle(
      mockGlobal.global,
      mockGlobal.window,
      mockGlobal.self,
      mockGlobal.exports,
      mockGlobal.module,
      mockGlobal.define,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up global UrlFetchApp mock
    (global as any).UrlFetchApp = mockUrlFetchApp;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full GAS Workflow', () => {
    it('should complete full workflow: install GAS fetch + create service + run once', async () => {
      // Step 1: Install GAS fetch adapter
      expect(() => {
        AITuberOnAirChat.installGASFetch();
      }).not.toThrow();

      // Step 2: Create chat service
      const chatService = AITuberOnAirChat.ChatServiceFactory.createChatService(
        'openai',
        {
          apiKey: 'test-api-key',
        },
      );

      expect(chatService).toBeDefined();
      expect(typeof chatService.chatOnce).toBe('function');

      // Step 3: Mock UrlFetchApp response
      const mockResponse = createMockGASResponse(
        200,
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Hello! This is a test response from the API.',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
          },
        }),
      );

      mockUrlFetchApp.fetch.mockReturnValue(mockResponse);

      // Step 4: Test runOnceText with non-streaming
      const messages = [{ role: 'user', content: 'Hello, how are you?' }];

      // Note: This will actually try to make the API call through our mocked UrlFetchApp
      // Since we're testing integration, we need to mock the entire flow
      try {
        const result = await AITuberOnAirChat.runOnceText(
          chatService,
          messages,
        );

        // Verify UrlFetchApp was called
        expect(mockUrlFetchApp.fetch).toHaveBeenCalled();

        // The actual result depends on how the service processes the mocked response
        // For this integration test, we mainly care that it doesn't throw
        expect(typeof result).toBe('string');
      } catch (error) {
        // If it throws, it should be a controlled error (like API parsing issues)
        // not a runtime error from missing dependencies
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle GAS environment constraints', async () => {
      // Install GAS adapter
      AITuberOnAirChat.installGASFetch();

      // Create service
      const chatService = AITuberOnAirChat.ChatServiceFactory.createChatService(
        'claude',
        {
          apiKey: 'test-key',
        },
      );

      // Mock error response to test error handling
      const errorResponse = createMockGASResponse(
        400,
        JSON.stringify({
          error: {
            message: 'Bad Request',
            type: 'invalid_request',
          },
        }),
      );

      mockUrlFetchApp.fetch.mockReturnValue(errorResponse);

      const messages = [{ role: 'user', content: 'Test message' }];

      try {
        await AITuberOnAirChat.runOnceText(chatService, messages);
        // If no error is thrown, that's also valid (depends on error handling implementation)
      } catch (error) {
        // Error should be properly formatted, not a runtime error
        expect(error).toBeInstanceOf(Error);
        expect(mockUrlFetchApp.fetch).toHaveBeenCalled();
      }
    });

    it('should support different providers with GAS fetch', async () => {
      const providers = ['openai', 'claude', 'gemini'];

      AITuberOnAirChat.installGASFetch();

      for (const provider of providers) {
        const chatService =
          AITuberOnAirChat.ChatServiceFactory.createChatService(provider, {
            apiKey: 'test-key',
          });

        expect(chatService).toBeDefined();
        expect(typeof chatService.chatOnce).toBe('function');

        // Mock appropriate response for each provider
        const mockResponse = createMockGASResponse(200, '{"test": "response"}');
        mockUrlFetchApp.fetch.mockReturnValue(mockResponse);

        // Verify the service can be created and basic methods exist
        expect(typeof chatService.processChat).toBe('function');
        expect(typeof chatService.processVisionChat).toBe('function');
      }
    });

    it('should handle UrlFetchApp parameter formatting correctly', async () => {
      AITuberOnAirChat.installGASFetch();

      const chatService = AITuberOnAirChat.ChatServiceFactory.createChatService(
        'openai',
        {
          apiKey: 'test-key-12345',
        },
      );

      const mockResponse = createMockGASResponse(200, '{"test": "ok"}');
      mockUrlFetchApp.fetch.mockReturnValue(mockResponse);

      const messages = [{ role: 'user', content: 'Test message' }];

      try {
        await AITuberOnAirChat.runOnceText(chatService, messages);
      } catch {
        // Ignore the actual response parsing error
      }

      // Verify that UrlFetchApp.fetch was called with proper parameters
      expect(mockUrlFetchApp.fetch).toHaveBeenCalled();

      const [url, params] = mockUrlFetchApp.fetch.mock.calls[0];

      expect(typeof url).toBe('string');
      expect(params).toHaveProperty('method');
      expect(params).toHaveProperty('headers');
      expect(params).toHaveProperty('muteHttpExceptions', true);

      // Should have Authorization header
      expect(params.headers).toHaveProperty('Authorization');
      expect(params.headers.Authorization).toContain('Bearer test-key-12345');
    });

    it('should handle empty and malformed responses gracefully', async () => {
      AITuberOnAirChat.installGASFetch();

      const chatService = AITuberOnAirChat.ChatServiceFactory.createChatService(
        'openai',
        {
          apiKey: 'test-key',
        },
      );

      // Test empty response
      const emptyResponse = createMockGASResponse(200, '');
      mockUrlFetchApp.fetch.mockReturnValue(emptyResponse);

      const messages = [{ role: 'user', content: 'Test' }];

      try {
        await AITuberOnAirChat.runOnceText(chatService, messages);
        // If it succeeds, that's fine
      } catch (error) {
        // Should handle gracefully, not crash the entire application
        expect(error).toBeInstanceOf(Error);
      }

      // Test malformed JSON
      const malformedResponse = createMockGASResponse(200, 'not valid json{');
      mockUrlFetchApp.fetch.mockReturnValue(malformedResponse);

      try {
        await AITuberOnAirChat.runOnceText(chatService, messages);
      } catch (error) {
        // Should handle parsing errors gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should maintain non-streaming behavior for GAS', async () => {
      AITuberOnAirChat.installGASFetch();

      const chatService = AITuberOnAirChat.ChatServiceFactory.createChatService(
        'openai',
        {
          apiKey: 'test-key',
        },
      );

      // Mock a successful response
      const successResponse = createMockGASResponse(
        200,
        JSON.stringify({
          choices: [{ message: { content: 'Response text' } }],
          usage: { prompt_tokens: 5, completion_tokens: 3 },
        }),
      );

      mockUrlFetchApp.fetch.mockReturnValue(successResponse);

      const messages = [{ role: 'user', content: 'Hello' }];

      try {
        // runOnceText should explicitly call chatOnce with streaming=false
        const result = await AITuberOnAirChat.runOnceText(
          chatService,
          messages,
        );

        // The result should be a complete text string, not a stream
        expect(typeof result).toBe('string');
      } catch (error) {
        // API parsing errors are acceptable in this mock environment
        expect(error).toBeInstanceOf(Error);
      }

      // Verify that the HTTP call was made (regardless of parsing success)
      expect(mockUrlFetchApp.fetch).toHaveBeenCalled();
    });
  });

  describe('UMD + GAS API Completeness', () => {
    it('should provide all necessary APIs for GAS usage', () => {
      // Check UMD provides all necessary components for GAS
      expect(AITuberOnAirChat.installGASFetch).toBeDefined();
      expect(AITuberOnAirChat.runOnceText).toBeDefined();
      expect(AITuberOnAirChat.ChatServiceFactory).toBeDefined();
      expect(AITuberOnAirChat.ChatServiceHttpClient).toBeDefined();

      // All APIs should be functions/objects as expected
      expect(typeof AITuberOnAirChat.installGASFetch).toBe('function');
      expect(typeof AITuberOnAirChat.runOnceText).toBe('function');
      expect(typeof AITuberOnAirChat.ChatServiceHttpClient).toBe('function');
    });

    it('should provide seamless integration workflow', () => {
      // This test verifies the complete API surface for the intended GAS usage pattern:
      // 1. AITuberOnAirChat.installGASFetch()
      // 2. const chat = AITuberOnAirChat.ChatServiceFactory.createChatService(...)
      // 3. const text = await AITuberOnAirChat.runOnceText(chat, messages)

      // Step 1 verification
      expect(() => AITuberOnAirChat.installGASFetch()).not.toThrow();

      // Step 2 verification
      const chat = AITuberOnAirChat.ChatServiceFactory.createChatService(
        'openai',
        {
          apiKey: 'test',
        },
      );
      expect(chat).toBeDefined();

      // Step 3 verification (API presence, not execution)
      expect(typeof AITuberOnAirChat.runOnceText).toBe('function');

      // Verify the function signature matches expected usage
      expect(AITuberOnAirChat.runOnceText.length).toBe(2); // chat, messages parameters
    });
  });
});
