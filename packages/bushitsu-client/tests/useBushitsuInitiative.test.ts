import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBushitsuInitiative } from '../src/hooks/useBushitsuInitiative';
import type { BushitsuInitiativeOptions } from '../src/types';

describe('useBushitsuInitiative', () => {
  let defaultOptions: BushitsuInitiativeOptions;
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let mockOnProcessMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSendMessage = vi.fn();
    mockOnProcessMessage = vi.fn().mockResolvedValue(undefined);

    defaultOptions = {
      enabled: true,
      serverUrl: 'ws://localhost:8080',
      room: 'test-room',
      userName: 'bot-user',
      sendMessage: mockSendMessage,
      onProcessMessage: mockOnProcessMessage,
      priority: 1,
    };
  });

  describe('initialization', () => {
    it('should return correct interface functions', () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      expect(typeof result.current.sendInitiativeMessage).toBe('function');
      expect(typeof result.current.sendDirectMessage).toBe('function');
      expect(typeof result.current.canSendMessage).toBe('function');
      expect(typeof result.current.createPeriodicTask).toBe('function');
      expect(result.current.isEnabled).toBe(true);
      expect(result.current.connectionInfo).toEqual({
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'bot-user',
      });
    });

    it('should reflect enabled state', () => {
      const disabledOptions = { ...defaultOptions, enabled: false };
      const { result } = renderHook(() =>
        useBushitsuInitiative(disabledOptions),
      );

      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('sendInitiativeMessage', () => {
    it('should send message with voice processing when enabled', async () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      await act(async () => {
        await result.current.sendInitiativeMessage('Hello world');
      });

      expect(mockOnProcessMessage).toHaveBeenCalledWith('Hello world');
      expect(mockSendMessage).toHaveBeenCalledWith('Hello world', undefined);
    });

    it('should send message without voice processing when skipVoice is true', async () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      await act(async () => {
        await result.current.sendInitiativeMessage(
          'Hello world',
          undefined,
          true,
        );
      });

      expect(mockOnProcessMessage).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith('Hello world', undefined);
    });

    it('should send message with mention', async () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      await act(async () => {
        await result.current.sendInitiativeMessage('Hello user', 'target-user');
      });

      expect(mockSendMessage).toHaveBeenCalledWith('Hello user', 'target-user');
    });

    it('should not send message when disabled', async () => {
      const disabledOptions = { ...defaultOptions, enabled: false };
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useBushitsuInitiative(disabledOptions),
      );

      await act(async () => {
        await result.current.sendInitiativeMessage('Hello world');
      });

      expect(mockOnProcessMessage).not.toHaveBeenCalled();
      expect(mockSendMessage).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not send empty message', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      await act(async () => {
        await result.current.sendInitiativeMessage('   ');
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('sendDirectMessage', () => {
    it('should send message without voice processing', async () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      await act(async () => {
        await result.current.sendDirectMessage('Direct message');
      });

      expect(mockOnProcessMessage).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith('Direct message', undefined);
    });

    it('should send direct message with mention', async () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      await act(async () => {
        await result.current.sendDirectMessage('Direct message', 'target-user');
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        'Direct message',
        'target-user',
      );
    });
  });

  describe('canSendMessage', () => {
    it('should return true when enabled and sendMessage is available', () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      expect(result.current.canSendMessage()).toBe(true);
    });

    it('should return false when disabled', () => {
      const disabledOptions = { ...defaultOptions, enabled: false };
      const { result } = renderHook(() =>
        useBushitsuInitiative(disabledOptions),
      );

      expect(result.current.canSendMessage()).toBe(false);
    });

    it('should return false when sendMessage is not provided', () => {
      const optionsWithoutSendMessage = {
        ...defaultOptions,
        sendMessage: undefined,
      };
      const { result } = renderHook(() =>
        useBushitsuInitiative(optionsWithoutSendMessage),
      );

      expect(result.current.canSendMessage()).toBe(false);
    });
  });

  describe('createPeriodicTask', () => {
    it('should create a reusable task function', async () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      const periodicTask =
        result.current.createPeriodicTask('Periodic message');

      await act(async () => {
        await periodicTask();
      });

      expect(mockOnProcessMessage).toHaveBeenCalledWith('Periodic message');
      expect(mockSendMessage).toHaveBeenCalledWith(
        'Periodic message',
        undefined,
      );
    });

    it('should create periodic task with mention', async () => {
      const { result } = renderHook(() =>
        useBushitsuInitiative(defaultOptions),
      );

      const periodicTask = result.current.createPeriodicTask(
        'Periodic message',
        'target-user',
      );

      await act(async () => {
        await periodicTask();
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        'Periodic message',
        'target-user',
      );
    });
  });

  describe('option updates', () => {
    it('should update connection info when options change', () => {
      const { result, rerender } = renderHook(
        (props) => useBushitsuInitiative(props),
        { initialProps: defaultOptions },
      );

      const newOptions = {
        ...defaultOptions,
        room: 'new-room',
        userName: 'new-user',
      };

      rerender(newOptions);

      expect(result.current.connectionInfo).toEqual({
        serverUrl: 'ws://localhost:8080',
        room: 'new-room',
        userName: 'new-user',
      });
    });

    it('should update enabled state when options change', () => {
      const { result, rerender } = renderHook(
        (props) => useBushitsuInitiative(props),
        { initialProps: defaultOptions },
      );

      rerender({ ...defaultOptions, enabled: false });

      expect(result.current.isEnabled).toBe(false);
    });
  });
});
