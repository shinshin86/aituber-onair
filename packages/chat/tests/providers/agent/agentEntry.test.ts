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
});
