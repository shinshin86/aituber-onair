import { describe, expect, it } from 'vitest';
import {
  ChatServiceFactory,
  createAgentChatService,
  registerAgentChatProviders,
} from '../../../src/agent';

describe('Agent chat entry', () => {
  it('registers agent providers through the agent entry', () => {
    expect(ChatServiceFactory.getAvailableProviders()).toContain('codex-sdk');
    expect(ChatServiceFactory.getAvailableProviders()).toContain(
      'claude-agent-sdk',
    );
    expect(ChatServiceFactory.getAvailableProviders()).toContain('copilot-sdk');
    expect(ChatServiceFactory.getAvailableProviders()).toContain('cursor-sdk');
    expect(
      ChatServiceFactory.getProviderCapabilities('codex-sdk'),
    ).toMatchObject({ streaming: false, tools: false });
    expect(
      ChatServiceFactory.getProviderCapabilities('cursor-sdk'),
    ).toMatchObject({ streaming: true, tools: false });
  });

  it('creates agent services with typed helper', async () => {
    registerAgentChatProviders({
      copilotSDKLoader: async () => ({
        CopilotClient: class {
          async createSession() {
            return {
              async sendAndWait() {
                return { data: { content: 'created' } };
              },
            };
          }
        },
      }),
    });

    const service = createAgentChatService('copilot-sdk', {});
    const result = await service.chatOnce(
      [{ role: 'user', content: 'hello' }],
      false,
      () => {},
    );

    expect(result.blocks).toEqual([{ type: 'text', text: 'created' }]);
  });

  it('registers and creates Cursor SDK services with an injected loader', async () => {
    registerAgentChatProviders({
      cursorSDKLoader: async () => ({
        Agent: {
          async create() {
            return {
              async send() {
                return {
                  async wait() {
                    return { status: 'finished', result: 'from cursor' };
                  },
                };
              },
              close() {},
            };
          },
        },
      }),
    });

    const service = createAgentChatService('cursor-sdk', {});
    const result = await service.chatOnce(
      [{ role: 'user', content: 'hello' }],
      false,
      () => {},
    );

    expect(result.blocks).toEqual([{ type: 'text', text: 'from cursor' }]);
  });
});
