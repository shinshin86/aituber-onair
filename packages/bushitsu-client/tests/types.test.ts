import { describe, it, expect } from 'vitest';
import type {
  BushitsuMessage,
  BushitsuClientOptions,
  UseBushitsuClientOptions,
  UseBushitsuClientReturn,
  BushitsuInitiativeOptions,
  UseBushitsuInitiativeReturn,
} from '../src/types';

// Helper function to check if an object matches the expected interface
function assertType<T>(value: T): T {
  return value;
}

describe('types', () => {
  describe('BushitsuMessage', () => {
    it('should accept valid chat message', () => {
      const chatMessage: BushitsuMessage = {
        type: 'chat',
        room: 'test-room',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          from: 'user1',
          fromId: 'session123',
          text: 'Hello world',
          mention: ['user2'],
        },
      };

      expect(chatMessage.type).toBe('chat');
      expect(chatMessage.data.text).toBe('Hello world');
    });

    it('should accept valid user_event message', () => {
      const userEventMessage: BushitsuMessage = {
        type: 'user_event',
        room: 'test-room',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          from: 'system',
          event: 'user_joined',
          user: 'newuser',
        },
      };

      expect(userEventMessage.type).toBe('user_event');
      expect(userEventMessage.data.event).toBe('user_joined');
    });

    it('should accept valid system message', () => {
      const systemMessage: BushitsuMessage = {
        type: 'system',
        room: 'test-room',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          from: 'server',
          details: { status: 'ok' },
        },
      };

      expect(systemMessage.type).toBe('system');
      expect(systemMessage.data.details.status).toBe('ok');
    });

    it('should have all required properties', () => {
      const message: BushitsuMessage = {
        type: 'chat',
        room: 'test',
        timestamp: '2023-01-01T00:00:00Z',
        data: {
          from: 'user',
        },
      };

      assertType<BushitsuMessage>(message);
      expect(message).toBeDefined();
    });
  });

  describe('BushitsuClientOptions', () => {
    it('should accept valid client options', () => {
      const options: BushitsuClientOptions = {
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'test-user',
        onReceiveMessage: (text, userName, isMention) => {
          console.log(text, userName, isMention);
        },
        onConnectionChange: (connected) => {
          console.log(connected);
        },
      };

      assertType<BushitsuClientOptions>(options);
      expect(options.serverUrl).toBe('ws://localhost:8080');
    });

    it('should work with minimal required options', () => {
      const minimalOptions: BushitsuClientOptions = {
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'test-user',
        onReceiveMessage: () => {},
      };

      assertType<BushitsuClientOptions>(minimalOptions);
      expect(minimalOptions.onConnectionChange).toBeUndefined();
    });
  });

  describe('UseBushitsuClientOptions', () => {
    it('should accept valid hook options', () => {
      const options: UseBushitsuClientOptions = {
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'test-user',
        isEnabled: true,
        onComment: (text, userName, isMention) => {
          console.log(text, userName, isMention);
        },
      };

      assertType<UseBushitsuClientOptions>(options);
      expect(options.isEnabled).toBe(true);
    });

    it('should require all properties', () => {
      // This should cause TypeScript compilation error if properties are missing
      const options: UseBushitsuClientOptions = {
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'test-user',
        isEnabled: false,
        onComment: () => {},
      };

      expect(options.isEnabled).toBe(false);
    });
  });

  describe('UseBushitsuClientReturn', () => {
    it('should have all required return functions and properties', () => {
      const mockReturn: UseBushitsuClientReturn = {
        isConnected: true,
        sendMessage: (text, mentionTo) => {
          console.log(text, mentionTo);
        },
        getLastMentionUser: () => 'user1',
        resetRateLimit: () => {},
        forceReconnect: () => {},
      };

      assertType<UseBushitsuClientReturn>(mockReturn);
      expect(typeof mockReturn.sendMessage).toBe('function');
      expect(typeof mockReturn.getLastMentionUser).toBe('function');
      expect(typeof mockReturn.resetRateLimit).toBe('function');
      expect(typeof mockReturn.forceReconnect).toBe('function');
      expect(typeof mockReturn.isConnected).toBe('boolean');
    });
  });

  describe('BushitsuInitiativeOptions', () => {
    it('should accept valid initiative options', () => {
      const options: BushitsuInitiativeOptions = {
        enabled: true,
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'bot-user',
        sendMessage: (text, mentionTo) => {
          console.log(text, mentionTo);
        },
        onProcessMessage: async (message) => {
          console.log(message);
        },
        runWithPriority: (priority, task) => {
          task();
        },
        priority: 1,
      };

      assertType<BushitsuInitiativeOptions>(options);
      expect(options.enabled).toBe(true);
    });

    it('should work with minimal required options', () => {
      const minimalOptions: BushitsuInitiativeOptions = {
        enabled: false,
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'bot-user',
      };

      assertType<BushitsuInitiativeOptions>(minimalOptions);
      expect(minimalOptions.sendMessage).toBeUndefined();
      expect(minimalOptions.onProcessMessage).toBeUndefined();
      expect(minimalOptions.runWithPriority).toBeUndefined();
      expect(minimalOptions.priority).toBeUndefined();
    });
  });

  describe('UseBushitsuInitiativeReturn', () => {
    it('should have all required return functions and properties', () => {
      const mockReturn: UseBushitsuInitiativeReturn = {
        sendInitiativeMessage: async (message, mentionTo, skipVoice) => {
          console.log(message, mentionTo, skipVoice);
        },
        sendDirectMessage: async (message, mentionTo) => {
          console.log(message, mentionTo);
        },
        canSendMessage: () => true,
        createPeriodicTask: (message, mentionTo) => {
          return async () => {
            console.log(message, mentionTo);
          };
        },
        isEnabled: true,
        connectionInfo: {
          serverUrl: 'ws://localhost:8080',
          room: 'test-room',
          userName: 'bot-user',
        },
      };

      assertType<UseBushitsuInitiativeReturn>(mockReturn);
      expect(typeof mockReturn.sendInitiativeMessage).toBe('function');
      expect(typeof mockReturn.sendDirectMessage).toBe('function');
      expect(typeof mockReturn.canSendMessage).toBe('function');
      expect(typeof mockReturn.createPeriodicTask).toBe('function');
      expect(typeof mockReturn.isEnabled).toBe('boolean');
      expect(typeof mockReturn.connectionInfo).toBe('object');
    });

    it('should have correct connectionInfo structure', () => {
      const connectionInfo: UseBushitsuInitiativeReturn['connectionInfo'] = {
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'bot-user',
      };

      expect(connectionInfo.serverUrl).toBeDefined();
      expect(connectionInfo.room).toBeDefined();
      expect(connectionInfo.userName).toBeDefined();
    });
  });

  describe('function signatures', () => {
    it('should have correct onReceiveMessage signature', () => {
      const callback: BushitsuClientOptions['onReceiveMessage'] = (
        text: string,
        userName: string,
        isMention: boolean,
      ) => {
        expect(typeof text).toBe('string');
        expect(typeof userName).toBe('string');
        expect(typeof isMention).toBe('boolean');
      };

      callback('test', 'user', true);
    });

    it('should have correct onComment signature', () => {
      const callback: UseBushitsuClientOptions['onComment'] = (
        text: string,
        userName: string,
        isMention: boolean,
      ) => {
        expect(typeof text).toBe('string');
        expect(typeof userName).toBe('string');
        expect(typeof isMention).toBe('boolean');
      };

      callback('test', 'user', false);
    });

    it('should have correct sendMessage signature', () => {
      const sendMessage: UseBushitsuClientReturn['sendMessage'] = (
        text: string,
        mentionTo?: string,
      ) => {
        expect(typeof text).toBe('string');
        if (mentionTo !== undefined) {
          expect(typeof mentionTo).toBe('string');
        }
      };

      sendMessage('test');
      sendMessage('test', 'user');
    });

    it('should have correct onProcessMessage signature', () => {
      const onProcessMessage: NonNullable<
        BushitsuInitiativeOptions['onProcessMessage']
      > = async (message: string): Promise<void> => {
        expect(typeof message).toBe('string');
      };

      onProcessMessage('test message');
    });

    it('should have correct runWithPriority signature', () => {
      const runWithPriority: NonNullable<
        BushitsuInitiativeOptions['runWithPriority']
      > = (priority: number, task: () => Promise<void>): void => {
        expect(typeof priority).toBe('number');
        expect(typeof task).toBe('function');
      };

      runWithPriority(1, async () => {});
    });
  });

  describe('optional properties', () => {
    it('should allow optional properties to be undefined', () => {
      const options: BushitsuInitiativeOptions = {
        enabled: true,
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'bot-user',
        // All optional properties omitted
      };

      expect(options.sendMessage).toBeUndefined();
      expect(options.onProcessMessage).toBeUndefined();
      expect(options.runWithPriority).toBeUndefined();
      expect(options.priority).toBeUndefined();
    });

    it('should handle optional BushitsuClientOptions properties', () => {
      const options: BushitsuClientOptions = {
        serverUrl: 'ws://localhost:8080',
        room: 'test-room',
        userName: 'test-user',
        onReceiveMessage: () => {},
        // onConnectionChange is optional
      };

      expect(options.onConnectionChange).toBeUndefined();
    });
  });
});
