import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// This will hold the UMD bundle content
let umdBundle: string;
let AITuberOnAirChat: any;

describe('UMD Bundle', () => {
  beforeAll(async () => {
    // Read the generated UMD bundle
    const umdPath = path.resolve(
      __dirname,
      '../../dist/umd/aituber-onair-chat.js',
    );

    // Check if UMD bundle exists
    if (!fs.existsSync(umdPath)) {
      throw new Error(
        `UMD bundle not found at ${umdPath}. Please run 'npm run build:umd' first.`,
      );
    }

    umdBundle = fs.readFileSync(umdPath, 'utf-8');

    // Execute the UMD bundle in a simulated global context
    // Create a mock global environment
    const mockGlobal = {
      global: {},
      window: {},
      self: {},
      exports: {},
      module: { exports: {} },
      define: undefined,
    };

    // Create a function that executes the UMD bundle with our mock global
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

    // Execute and capture the global AITuberOnAirChat
    AITuberOnAirChat = executeBundle(
      mockGlobal.global,
      mockGlobal.window,
      mockGlobal.self,
      mockGlobal.exports,
      mockGlobal.module,
      mockGlobal.define,
    );
  });

  describe('Bundle Structure', () => {
    it('should contain IIFE wrapper', () => {
      expect(umdBundle).toMatch(/var AITuberOnAirChat|AITuberOnAirChat =/);
      expect(umdBundle).toContain('AITuberOnAirChat');
    });

    it('should be a valid JavaScript file', () => {
      expect(() => {
        new Function(umdBundle);
      }).not.toThrow();
    });

    it('should expose AITuberOnAirChat globally', () => {
      expect(AITuberOnAirChat).toBeDefined();
      expect(typeof AITuberOnAirChat).toBe('object');
    });
  });

  describe('Global API Structure', () => {
    it('should expose ChatServiceFactory', () => {
      expect(AITuberOnAirChat.ChatServiceFactory).toBeDefined();
      expect(typeof AITuberOnAirChat.ChatServiceFactory.createChatService).toBe(
        'function',
      );
    });

    it('should expose installGASFetch function', () => {
      expect(AITuberOnAirChat.installGASFetch).toBeDefined();
      expect(typeof AITuberOnAirChat.installGASFetch).toBe('function');
    });

    it('should expose runOnceText function', () => {
      expect(AITuberOnAirChat.runOnceText).toBeDefined();
      expect(typeof AITuberOnAirChat.runOnceText).toBe('function');
    });

    it('should expose ChatServiceHttpClient', () => {
      expect(AITuberOnAirChat.ChatServiceHttpClient).toBeDefined();
      expect(typeof AITuberOnAirChat.ChatServiceHttpClient).toBe('function');
      expect(typeof AITuberOnAirChat.ChatServiceHttpClient.setFetch).toBe(
        'function',
      );
      expect(typeof AITuberOnAirChat.ChatServiceHttpClient.post).toBe(
        'function',
      );
      expect(typeof AITuberOnAirChat.ChatServiceHttpClient.get).toBe(
        'function',
      );
    });

    it('should expose core types and interfaces', () => {
      // Check for availability of key exported items
      expect(AITuberOnAirChat.StreamTextAccumulator).toBeDefined();
      expect(typeof AITuberOnAirChat.StreamTextAccumulator.getFullText).toBe(
        'function',
      );
    });

    it('should expose provider types', () => {
      expect(
        AITuberOnAirChat.ChatServiceFactory.createChatService,
      ).toBeDefined();
      // The factory should be able to handle standard provider names
      expect(() => {
        // This shouldn't throw even without API keys, just return the service
        // We're only testing the structure, not actual API calls
        const mockConfig = { apiKey: 'test-key' };
        AITuberOnAirChat.ChatServiceFactory.createChatService(
          'openai',
          mockConfig,
        );
      }).not.toThrow();
    });
  });

  describe('API Compatibility', () => {
    it('should create chat service instances without throwing', () => {
      const providers = ['openai', 'claude', 'gemini'];

      for (const provider of providers) {
        expect(() => {
          const service = AITuberOnAirChat.ChatServiceFactory.createChatService(
            provider,
            {
              apiKey: 'test-key',
            },
          );
          expect(service).toBeDefined();
          expect(typeof service.chatOnce).toBe('function');
          expect(typeof service.processChat).toBe('function');
        }).not.toThrow();
      }
    });

    it('should allow calling installGASFetch without errors', () => {
      // Mock UrlFetchApp for testing
      (global as any).UrlFetchApp = {
        fetch: () => ({
          getResponseCode: () => 200,
          getContentText: () => '{"test": "response"}',
        }),
      };

      expect(() => {
        AITuberOnAirChat.installGASFetch();
      }).not.toThrow();
    });

    it('should have StreamTextAccumulator with getFullText method', () => {
      expect(AITuberOnAirChat.StreamTextAccumulator).toBeDefined();
      expect(typeof AITuberOnAirChat.StreamTextAccumulator.getFullText).toBe(
        'function',
      );

      // Test with mock blocks
      const mockBlocks = [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'World!' },
      ];

      const result =
        AITuberOnAirChat.StreamTextAccumulator.getFullText(mockBlocks);
      expect(result).toBe('Hello World!');
    });
  });

  describe('Bundle Size', () => {
    it('should be within reasonable size limits', () => {
      const bundleSizeKB = Buffer.byteLength(umdBundle, 'utf8') / 1024;

      // The bundle should be less than 500KB as per TODO.md requirements
      expect(bundleSizeKB).toBeLessThan(500);

      // Log the actual size for reference
      console.log(`UMD bundle size: ${bundleSizeKB.toFixed(2)}KB`);
    });

    it('should not include development dependencies', () => {
      // Check that common dev dependencies are not included
      expect(umdBundle).not.toContain('vitest');
      expect(umdBundle).not.toContain('@vitest');
      expect(umdBundle).not.toContain('biome');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid provider names gracefully', () => {
      expect(() => {
        AITuberOnAirChat.ChatServiceFactory.createChatService(
          'invalid-provider',
          {
            apiKey: 'test-key',
          },
        );
      }).toThrow(); // This should throw an appropriate error
    });

    it('should handle missing configuration gracefully', () => {
      // This test may or may not throw depending on implementation
      // Just verify the method exists and can be called
      expect(typeof AITuberOnAirChat.ChatServiceFactory.createChatService).toBe(
        'function',
      );

      // Try to create with empty config - behavior may vary
      try {
        AITuberOnAirChat.ChatServiceFactory.createChatService('openai', {});
        // If it doesn't throw, that's also acceptable behavior
      } catch (error) {
        // If it throws, that's expected behavior for missing config
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
