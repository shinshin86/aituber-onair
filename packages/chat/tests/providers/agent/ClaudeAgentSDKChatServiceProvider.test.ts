import { describe, expect, it } from 'vitest';
import { ClaudeAgentSDKChatServiceProvider } from '../../../src/services/providers/agent/ClaudeAgentSDKChatServiceProvider';

describe('ClaudeAgentSDKChatServiceProvider', () => {
  it('creates a text-only Claude Agent SDK chat service without apiKey', async () => {
    let queryPrompt: string | undefined;
    let queryOptions: Record<string, unknown> | undefined;

    const provider = new ClaudeAgentSDKChatServiceProvider(async () => ({
      query: async function* (params: {
        prompt: string;
        options?: Record<string, unknown>;
      }) {
        queryPrompt = params.prompt;
        queryOptions = params.options;
        yield {
          type: 'result',
          is_error: false,
          result: 'hi from claude agent',
        };
      },
    }));

    const service = provider.createChatService({
      model: 'claude-sonnet-4-6',
      responseLength: 'short',
      workingDirectory: '/tmp/project',
      maxTurns: 1,
      pathToClaudeCodeExecutable: '/tmp/claude',
      env: { CLAUDE_AGENT_SDK_CLIENT_APP: 'aituber-onair-chat-test' },
    });
    const partials: string[] = [];
    const result = await service.chatOnce(
      [
        { role: 'system', content: 'Be brief.' },
        { role: 'user', content: 'hello' },
      ],
      false,
      (text) => partials.push(text),
    );

    expect(service.provider).toBe('claude-agent-sdk');
    expect(service.getModel()).toBe('claude-sonnet-4-6');
    expect(queryPrompt).toContain('System: Be brief.');
    expect(queryPrompt).toContain('User: hello');
    expect(queryOptions).toEqual({
      tools: [],
      permissionMode: 'dontAsk',
      settingSources: [],
      model: 'claude-sonnet-4-6',
      cwd: '/tmp/project',
      maxTurns: 1,
      pathToClaudeCodeExecutable: '/tmp/claude',
      env: { CLAUDE_AGENT_SDK_CLIENT_APP: 'aituber-onair-chat-test' },
    });
    expect(partials).toEqual(['hi from claude agent']);
    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'hi from claude agent' }],
      stop_reason: 'end',
    });
  });

  it('forwards streaming text deltas from Claude Agent SDK', async () => {
    const provider = new ClaudeAgentSDKChatServiceProvider(async () => ({
      query: async function* () {
        yield {
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'hello' },
          },
        };
        yield {
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: ' world' },
          },
        };
        yield {
          type: 'result',
          is_error: false,
          result: 'hello world',
        };
      },
    }));

    const service = provider.createChatService({});
    const partials: string[] = [];
    const result = await service.chatOnce(
      [{ role: 'user', content: 'hello' }],
      true,
      (text) => partials.push(text),
    );

    expect(partials).toEqual(['hello', ' world']);
    expect(result.blocks).toEqual([{ type: 'text', text: 'hello world' }]);
  });

  it('rejects API and tool options', () => {
    const provider = new ClaudeAgentSDKChatServiceProvider();

    expect(() =>
      provider.createChatService({ apiKey: 'secret' } as any),
    ).toThrow('claude-agent-sdk provider does not accept apiKey');

    expect(() => provider.createChatService({ tools: [] } as any)).toThrow(
      'claude-agent-sdk provider does not support tools yet',
    );

    expect(provider.getVisionSupportLevel()).toBe('unsupported');
  });

  it('wraps likely authentication errors while preserving SDK details', async () => {
    const provider = new ClaudeAgentSDKChatServiceProvider(async () => ({
      query: () => ({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw new Error('authentication_failed: login required');
            },
          };
        },
      }),
    }));
    const service = provider.createChatService({});

    await expect(
      service.chatOnce([{ role: 'user', content: 'hello' }], false, () => {}),
    ).rejects.toThrow(
      /claude-agent-sdk provider failed\. This looks like an authentication or subscription permission failure\.[\s\S]*authentication_failed: login required/,
    );
  });

  it('throws explicit unsupported errors for vision chat', async () => {
    const provider = new ClaudeAgentSDKChatServiceProvider(async () => ({
      query: async function* () {
        yield { type: 'result', result: '' };
      },
    }));
    const service = provider.createChatService({});

    await expect(service.visionChatOnce([], false, () => {})).rejects.toThrow(
      'claude-agent-sdk does not support vision chat yet',
    );
  });
});
