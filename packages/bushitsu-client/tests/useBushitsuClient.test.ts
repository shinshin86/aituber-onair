import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBushitsuClient } from '../src/hooks/useBushitsuClient';
import type { UseBushitsuClientOptions } from '../src/types';

// Mock BushitsuClient
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockSendMessage = vi.fn();
const mockGetConnectionStatus = vi.fn();

vi.mock('../src/client/BushitsuClient', () => ({
  BushitsuClient: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    sendMessage: mockSendMessage,
    getConnectionStatus: mockGetConnectionStatus,
  })),
}));

describe('useBushitsuClient', () => {
  let defaultOptions: UseBushitsuClientOptions;
  let mockOnComment: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOnComment = vi.fn();
    defaultOptions = {
      serverUrl: 'ws://localhost:8080',
      room: 'test-room',
      userName: 'test-user',
      isEnabled: true,
      onComment: mockOnComment,
    };

    // Reset mock implementations
    mockConnect.mockResolvedValue(undefined);
    mockGetConnectionStatus.mockReturnValue(false);
  });

  describe('initialization', () => {
    it('should initialize with correct return interface', () => {
      const { result } = renderHook(() => useBushitsuClient(defaultOptions));

      expect(result.current.isConnected).toBe(false);
      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.getLastMentionUser).toBe('function');
      expect(typeof result.current.resetRateLimit).toBe('function');
      expect(typeof result.current.forceReconnect).toBe('function');
    });

    it('should not connect when isEnabled is false', () => {
      const options = { ...defaultOptions, isEnabled: false };
      renderHook(() => useBushitsuClient(options));

      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe('message sending', () => {
    it('should send message when connected', () => {
      mockGetConnectionStatus.mockReturnValue(true);

      const { result } = renderHook(() => useBushitsuClient(defaultOptions));

      act(() => {
        result.current.sendMessage('test message');
      });

      expect(mockSendMessage).toHaveBeenCalledWith('test message', undefined);
    });

    it('should not send message when disconnected', () => {
      mockGetConnectionStatus.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useBushitsuClient(defaultOptions));

      act(() => {
        result.current.sendMessage('test message');
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[useBushitsuClient] WebSocket is not connected, cannot send message',
      );

      consoleSpy.mockRestore();
    });

    it('should send message with mention', () => {
      mockGetConnectionStatus.mockReturnValue(true);

      const { result } = renderHook(() => useBushitsuClient(defaultOptions));

      act(() => {
        result.current.sendMessage('test message', 'target-user');
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        'test message',
        'target-user',
      );
    });
  });

  describe('utility functions', () => {
    it('should return null for getLastMentionUser initially', () => {
      const { result } = renderHook(() => useBushitsuClient(defaultOptions));

      expect(result.current.getLastMentionUser()).toBeNull();
    });

    it('should provide resetRateLimit function', () => {
      const { result } = renderHook(() => useBushitsuClient(defaultOptions));

      act(() => {
        result.current.resetRateLimit();
      });

      // Should not throw
      expect(result.current.resetRateLimit).toBeDefined();
    });

    it('should provide forceReconnect function', () => {
      const { result } = renderHook(() => useBushitsuClient(defaultOptions));

      act(() => {
        result.current.forceReconnect();
      });

      // Should call disconnect
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('option validation', () => {
    it('should handle missing required parameters gracefully', () => {
      const incompleteOptions = {
        ...defaultOptions,
        serverUrl: '',
      };

      const { result } = renderHook(() => useBushitsuClient(incompleteOptions));

      expect(result.current.isConnected).toBe(false);
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should handle option changes', () => {
      const { rerender } = renderHook((props) => useBushitsuClient(props), {
        initialProps: defaultOptions,
      });

      // Change room - should not throw
      const newOptions = { ...defaultOptions, room: 'new-room' };
      expect(() => rerender(newOptions)).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should not throw on unmount', () => {
      const { unmount } = renderHook(() => useBushitsuClient(defaultOptions));

      expect(() => unmount()).not.toThrow();
    });
  });
});
