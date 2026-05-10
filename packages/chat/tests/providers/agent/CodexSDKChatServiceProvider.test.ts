import { describe, expect, it } from 'vitest';
import { CodexSDKChatServiceProvider } from '../../../src/services/providers/agent/CodexSDKChatServiceProvider';

describe('CodexSDKChatServiceProvider', () => {
  it('creates a text-only Codex SDK chat service without apiKey', async () => {
    let codexOptions: Record<string, unknown> | undefined;
    let threadOptions: Record<string, unknown> | undefined;

    const provider = new CodexSDKChatServiceProvider(async () => ({
      Codex: class {
        constructor(options?: Record<string, unknown>) {
          codexOptions = options;
        }

        async startThread(options?: Record<string, unknown>) {
          threadOptions = options;
          return {
            async run(prompt: string) {
              expect(prompt).toContain('System: Be brief.');
              expect(prompt).toContain('User: hello');
              return { finalResponse: 'hi from codex' };
            },
          };
        }
      },
    }));

    const service = provider.createChatService({
      model: 'gpt-5.1-codex',
      responseLength: 'short',
      workingDirectory: '/tmp/project',
      skipGitRepoCheck: true,
      config: { approvalPolicy: 'never' },
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

    expect(service.provider).toBe('codex-sdk');
    expect(service.getModel()).toBe('gpt-5.1-codex');
    expect(codexOptions).toEqual({
      config: {
        approvalPolicy: 'never',
        model: 'gpt-5.1-codex',
      },
    });
    expect(threadOptions).toEqual({
      workingDirectory: '/tmp/project',
      skipGitRepoCheck: true,
    });
    expect(partials).toEqual(['hi from codex']);
    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'hi from codex' }],
      stop_reason: 'end',
    });
  });

  it('rejects API and tool options', () => {
    const provider = new CodexSDKChatServiceProvider();

    expect(() =>
      provider.createChatService({ apiKey: 'secret' } as any),
    ).toThrow('codex-sdk provider does not accept apiKey');

    expect(() => provider.createChatService({ tools: [] } as any)).toThrow(
      'codex-sdk provider does not support tools yet',
    );

    expect(provider.getVisionSupportLevel()).toBe('unsupported');
  });

  it('wraps likely authentication errors while preserving SDK details', async () => {
    const provider = new CodexSDKChatServiceProvider(async () => ({
      Codex: class {
        async startThread() {
          throw new Error('403 forbidden: subscription required');
        }
      },
    }));
    const service = provider.createChatService({});

    await expect(
      service.chatOnce([{ role: 'user', content: 'hello' }], false, () => {}),
    ).rejects.toThrow(
      /codex-sdk provider failed\. This looks like an authentication or subscription permission failure\.[\s\S]*403 forbidden: subscription required/,
    );
  });

  it('throws explicit unsupported errors for vision chat', async () => {
    const provider = new CodexSDKChatServiceProvider(async () => ({
      Codex: class {},
    }));
    const service = provider.createChatService({});

    await expect(service.visionChatOnce([], false, () => {})).rejects.toThrow(
      'codex-sdk does not support vision chat yet',
    );
  });
});
