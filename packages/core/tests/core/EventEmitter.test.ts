import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from '../../src/core/EventEmitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    // initialize instance before each test
    emitter = new EventEmitter();
  });

  describe('on / emit', () => {
    it('should register and trigger event listeners', () => {
      // Arrange
      const listener = vi.fn();
      emitter.on('test', listener);

      // Act
      emitter.emit('test', 'arg1', 'arg2');

      // Assert
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should support multiple listeners for same event', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      emitter.on('test', listener1);
      emitter.on('test', listener2);

      // Act
      emitter.emit('test', 'data');

      // Assert
      expect(listener1).toHaveBeenCalledWith('data');
      expect(listener2).toHaveBeenCalledWith('data');
    });

    it('should not trigger listeners for different events', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      emitter.on('test1', listener1);
      emitter.on('test2', listener2);

      // Act
      emitter.emit('test1', 'data');

      // Assert
      expect(listener1).toHaveBeenCalledWith('data');
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should trigger listener only once', () => {
      // Arrange
      const listener = vi.fn();
      emitter.once('test', listener);

      // Act
      emitter.emit('test', 'first');
      emitter.emit('test', 'second');

      // Assert
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('first');
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      emitter.on('test', listener1);
      emitter.on('test', listener2);

      // Act
      emitter.off('test', listener1);
      emitter.emit('test', 'data');

      // Assert
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith('data');
    });

    it('should remove all listeners for an event when no listener is specified', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      emitter.on('test', listener1);
      emitter.on('test', listener2);

      // Act
      emitter.off('test');
      emitter.emit('test', 'data');

      // Assert
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for all events', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      emitter.on('test1', listener1);
      emitter.on('test2', listener2);

      // Act
      emitter.removeAllListeners();
      emitter.emit('test1', 'data');
      emitter.emit('test2', 'data');

      // Assert
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors in listeners and continue execution', () => {
      // Arrange
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const successListener = vi.fn();

      // mock console
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      emitter.on('test', errorListener);
      emitter.on('test', successListener);

      // Act
      emitter.emit('test', 'data');

      // Assert
      expect(errorListener).toHaveBeenCalled();
      expect(successListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      // クリーンアップ
      consoleSpy.mockRestore();
    });
  });
});
