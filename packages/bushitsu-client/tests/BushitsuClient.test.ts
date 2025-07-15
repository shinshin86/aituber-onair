import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BushitsuClient } from '../src/client/BushitsuClient';
import type { BushitsuClientOptions } from '../src/client/types';

describe('BushitsuClient', () => {
  let mockOnReceiveMessage: ReturnType<typeof vi.fn>;
  let mockOnConnectionChange: ReturnType<typeof vi.fn>;
  let clientOptions: BushitsuClientOptions;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOnReceiveMessage = vi.fn();
    mockOnConnectionChange = vi.fn();

    clientOptions = {
      serverUrl: 'ws://localhost:8080',
      room: 'test-room',
      userName: 'test-user',
      onReceiveMessage: mockOnReceiveMessage,
      onConnectionChange: mockOnConnectionChange,
    };
  });

  describe('constructor', () => {
    it('should create client with provided options', () => {
      const client = new BushitsuClient(clientOptions);
      expect(client).toBeInstanceOf(BushitsuClient);
    });

    it('should initialize with disconnected state', () => {
      const client = new BushitsuClient(clientOptions);
      expect(client.getConnectionStatus()).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return false when not connected', () => {
      const client = new BushitsuClient(clientOptions);
      expect(client.getConnectionStatus()).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should log error when not connected', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const client = new BushitsuClient(clientOptions);

      client.sendMessage('test message');

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket is not connected');
      consoleSpy.mockRestore();
    });

    it('should handle sendMessage with mention parameter', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const client = new BushitsuClient(clientOptions);

      client.sendMessage('test message', 'target-user');

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket is not connected');
      consoleSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should reset connection state', () => {
      const client = new BushitsuClient(clientOptions);
      client.disconnect();

      expect(client.getConnectionStatus()).toBe(false);
      expect(mockOnConnectionChange).toHaveBeenCalledWith(false);
    });

    it('should be safe to call multiple times', () => {
      const client = new BushitsuClient(clientOptions);

      client.disconnect();
      client.disconnect();
      client.disconnect();

      expect(client.getConnectionStatus()).toBe(false);
    });
  });

  describe('option validation', () => {
    it('should accept valid options', () => {
      const validOptions: BushitsuClientOptions = {
        serverUrl: 'wss://example.com:443',
        room: 'valid-room',
        userName: 'valid-user',
        onReceiveMessage: mockOnReceiveMessage,
        onConnectionChange: mockOnConnectionChange,
      };

      const client = new BushitsuClient(validOptions);
      expect(client).toBeInstanceOf(BushitsuClient);
    });

    it('should accept minimal required options', () => {
      const minimalOptions: BushitsuClientOptions = {
        serverUrl: 'ws://localhost:8080',
        room: 'test',
        userName: 'user',
        onReceiveMessage: mockOnReceiveMessage,
      };

      const client = new BushitsuClient(minimalOptions);
      expect(client).toBeInstanceOf(BushitsuClient);
    });

    it('should handle empty room and username', () => {
      const emptyOptions: BushitsuClientOptions = {
        serverUrl: 'ws://localhost:8080',
        room: '',
        userName: '',
        onReceiveMessage: mockOnReceiveMessage,
      };

      const client = new BushitsuClient(emptyOptions);
      expect(client).toBeInstanceOf(BushitsuClient);
    });
  });

  describe('callback handling', () => {
    it('should store callback references', () => {
      const client = new BushitsuClient(clientOptions);

      // Verify callbacks are stored (implementation detail)
      expect((client as any).options.onReceiveMessage).toBe(
        mockOnReceiveMessage,
      );
      expect((client as any).options.onConnectionChange).toBe(
        mockOnConnectionChange,
      );
    });

    it('should work without optional onConnectionChange callback', () => {
      const optionsWithoutCallback = {
        ...clientOptions,
        onConnectionChange: undefined,
      };

      const client = new BushitsuClient(optionsWithoutCallback);

      // Should not throw when calling disconnect
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe('state management', () => {
    it('should maintain internal state correctly', () => {
      const client = new BushitsuClient(clientOptions);

      // Initial state
      expect(client.getConnectionStatus()).toBe(false);

      // After disconnect
      client.disconnect();
      expect(client.getConnectionStatus()).toBe(false);
    });

    it('should handle repeated operations gracefully', () => {
      const client = new BushitsuClient(clientOptions);

      // Multiple disconnects should be safe
      for (let i = 0; i < 5; i++) {
        client.disconnect();
        expect(client.getConnectionStatus()).toBe(false);
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid messages gracefully', () => {
      const client = new BushitsuClient(clientOptions);

      // Should not throw for various message types
      expect(() => client.sendMessage('')).not.toThrow();
      expect(() => client.sendMessage('valid message')).not.toThrow();
      expect(() => client.sendMessage('message', 'user')).not.toThrow();
    });

    it('should log appropriate errors for disconnected state', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const client = new BushitsuClient(clientOptions);

      client.sendMessage('test');
      client.sendMessage('test', 'user');

      // May log additional debug information, so check at least 2 calls
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket is not connected');
      expect(consoleSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on disconnect', () => {
      const client = new BushitsuClient(clientOptions);

      client.disconnect();

      expect(client.getConnectionStatus()).toBe(false);
      expect(mockOnConnectionChange).toHaveBeenCalledWith(false);
    });
  });
});
