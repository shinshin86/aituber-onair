import { describe, expect, it, vi } from 'vitest';

type MockCodexCall = {
  clientOptions?: Record<string, unknown>;
  prompt?: string;
  threadOptions?: Record<string, unknown>;
};

function createMockCodexSDK(reply: string, call: MockCodexCall) {
  return {
    Codex: class {
      constructor(options?: Record<string, unknown>) {
        call.clientOptions = options;
      }

      async startThread(options?: Record<string, unknown>) {
        call.threadOptions = options;
        return {
          run: async (prompt: string) => {
            call.prompt = prompt;
            return { finalResponse: reply };
          },
        };
      }
    },
  };
}

describe.sequential('Core Agent SDK entry', () => {
  it('keeps agent provider registration out of the main entry', async () => {
    vi.resetModules();

    const { ChatServiceFactory } = await import('../src/index');

    expect(ChatServiceFactory.getAvailableProviders()).not.toContain(
      'codex-sdk',
    );
    expect(ChatServiceFactory.getAvailableProviders()).not.toContain(
      'claude-agent-sdk',
    );
    expect(ChatServiceFactory.getAvailableProviders()).not.toContain(
      'copilot-sdk',
    );
  });

  it('registers agent providers and creates a service with an injected loader', async () => {
    vi.resetModules();
    const call: MockCodexCall = {};
    const {
      ChatServiceFactory,
      createAgentChatService,
      registerAgentChatProviders,
    } = await import('../src/agent');

    expect(ChatServiceFactory.getAvailableProviders()).toEqual(
      expect.arrayContaining(['codex-sdk', 'claude-agent-sdk', 'copilot-sdk']),
    );

    registerAgentChatProviders({
      codexSDKLoader: async () => createMockCodexSDK('created', call),
    });
    const service = createAgentChatService('codex-sdk', {
      workingDirectory: '/tmp/core-agent-entry-test',
      skipGitRepoCheck: true,
    });

    const result = await service.chatOnce(
      [{ role: 'user', content: 'hello' }],
      false,
    );

    expect(result.blocks).toEqual([{ type: 'text', text: 'created' }]);
    expect(call.threadOptions).toEqual({
      workingDirectory: '/tmp/core-agent-entry-test',
      skipGitRepoCheck: true,
    });
    expect(call.prompt).toContain('User: hello');
  });

  it('runs AITuberOnAirCore with an agent provider and no API key', async () => {
    const call: MockCodexCall = {};
    const { AITuberOnAirCore, registerAgentChatProviders } = await import(
      '../src/agent'
    );
    registerAgentChatProviders({
      codexSDKLoader: async () => createMockCodexSDK('mocked reply', call),
    });

    const core = new AITuberOnAirCore({
      chatProvider: 'codex-sdk',
      chatOptions: { systemPrompt: 'You are a concise host.' },
      providerOptions: {
        workingDirectory: '/tmp/core-agent-integration-test',
        skipGitRepoCheck: true,
      },
    });

    const processed = await core.processChat('What is new?');

    expect(processed).toBe(true);
    expect(core.getChatHistory()).toEqual([
      expect.objectContaining({ role: 'user', content: 'What is new?' }),
      expect.objectContaining({ role: 'assistant', content: 'mocked reply' }),
    ]);
    expect(call.threadOptions).toEqual({
      workingDirectory: '/tmp/core-agent-integration-test',
      skipGitRepoCheck: true,
    });
    expect(call.prompt).toContain('System: You are a concise host.');
    expect(call.prompt).toContain('User: What is new?');
  });

  it('rejects memory summarization with agent providers clearly', async () => {
    const { AITuberOnAirCore } = await import('../src/agent');

    expect(
      () =>
        new AITuberOnAirCore({
          chatProvider: 'codex-sdk',
          chatOptions: { systemPrompt: 'system' },
          memoryOptions: {
            enableSummarization: true,
            shortTermDuration: 60_000,
            midTermDuration: 240_000,
            longTermDuration: 540_000,
            maxMessagesBeforeSummarization: 20,
          },
        }),
    ).toThrow('Memory summarization is not supported with Agent SDK providers');
  });
});
