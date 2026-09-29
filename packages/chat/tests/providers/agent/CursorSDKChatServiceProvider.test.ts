import { describe, expect, it, vi } from 'vitest';
import { CodexSDKChatServiceProvider } from '../../../src/services/providers/agent/CodexSDKChatServiceProvider';
import { CursorSDKChatServiceProvider } from '../../../src/services/providers/agent/CursorSDKChatServiceProvider';

describe('CursorSDKChatServiceProvider', () => {
  it('creates a text-only agent with the default model and working directory', async () => {
    const close = vi.fn();
    const create = vi.fn(async () => ({
      async send(prompt: string) {
        expect(prompt).toContain('System: Be brief.');
        expect(prompt).toContain('User: hello');
        return {
          async wait() {
            return { status: 'finished' as const, result: 'hi from cursor' };
          },
        };
      },
      close,
    }));
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: { create },
    }));
    const partial = vi.fn();

    const service = provider.createChatService({ responseLength: 'short' });
    const result = await service.chatOnce(
      [
        { role: 'system', content: 'Be brief.' },
        { role: 'user', content: 'hello' },
      ],
      false,
      partial,
    );

    expect(service.provider).toBe('cursor-sdk');
    expect(service.getModel()).toBe('default');
    expect(create).toHaveBeenCalledWith({
      model: { id: 'default' },
      tools: [],
      local: { cwd: process.cwd(), settingSources: [] },
    });
    expect(partial).toHaveBeenCalledOnce();
    expect(partial).toHaveBeenCalledWith('hi from cursor');
    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'hi from cursor' }],
      stop_reason: 'end',
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('passes apiKey, a custom model, and a custom working directory', async () => {
    const create = vi.fn(async () => ({
      async send() {
        return {
          async wait() {
            return { status: 'finished' as const, result: 'configured' };
          },
        };
      },
      close() {},
    }));
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: { create },
    }));

    const service = provider.createChatService({
      apiKey: 'cursor-secret',
      model: 'cursor-model',
      workingDirectory: '/tmp/cursor-project',
    });
    await service.chatOnce([{ role: 'user', content: 'hello' }], false);

    expect(create).toHaveBeenCalledWith({
      apiKey: 'cursor-secret',
      model: { id: 'cursor-model' },
      tools: [],
      local: { cwd: '/tmp/cursor-project', settingSources: [] },
    });
  });

  it('resolves the default working directory when the prompt runs', async () => {
    const create = vi.fn(async () => ({
      async send() {
        return {
          async wait() {
            return { status: 'finished' as const, result: 'done' };
          },
        };
      },
      close() {},
    }));
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: { create },
    }));
    const service = provider.createChatService({});
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue('/runtime/cursor');

    try {
      await service.chatOnce([{ role: 'user', content: 'hello' }], false);
    } finally {
      cwd.mockRestore();
    }

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        local: { cwd: '/runtime/cursor', settingSources: [] },
      }),
    );
  });

  it('forwards text deltas in order and ignores non-text deltas', async () => {
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send(_prompt, { onDelta }) {
              onDelta({ update: { type: 'text-delta', text: 'hello' } });
              onDelta({ update: { type: 'thinking-delta', text: 'hidden' } });
              onDelta({ update: { type: 'tool-delta', name: 'unused' } });
              onDelta({ update: { type: 'text-delta', text: ' world' } });
              return {
                async wait() {
                  return {
                    status: 'finished' as const,
                    result: 'hello world',
                  };
                },
              };
            },
            close() {},
          };
        },
      },
    }));
    const partials: string[] = [];

    const service = provider.createChatService({});
    const result = await service.chatOnce(
      [{ role: 'user', content: 'hello' }],
      true,
      (text) => partials.push(text),
    );

    expect(partials).toEqual(['hello', ' world']);
    expect(result.blocks).toEqual([{ type: 'text', text: 'hello world' }]);
  });

  it('forwards the final result once when streaming has no text deltas', async () => {
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send() {
              return {
                async wait() {
                  return {
                    status: 'finished' as const,
                    result: 'final only',
                  };
                },
              };
            },
            close() {},
          };
        },
      },
    }));
    const partial = vi.fn();

    const service = provider.createChatService({});
    const result = await service.chatOnce(
      [{ role: 'user', content: 'hello' }],
      true,
      partial,
    );

    expect(partial).toHaveBeenCalledOnce();
    expect(partial).toHaveBeenCalledWith('final only');
    expect(result.blocks).toEqual([{ type: 'text', text: 'final only' }]);
  });

  it('does not forward deltas itself when streaming is disabled', async () => {
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send(_prompt, { onDelta }) {
              onDelta({ update: { type: 'text-delta', text: 'hello' } });
              onDelta({ update: { type: 'text-delta', text: ' world' } });
              return {
                async wait() {
                  return {
                    status: 'finished' as const,
                    result: 'hello world',
                  };
                },
              };
            },
            close() {},
          };
        },
      },
    }));
    const partial = vi.fn();

    const service = provider.createChatService({});
    await service.chatOnce(
      [{ role: 'user', content: 'hello' }],
      false,
      partial,
    );

    expect(partial).toHaveBeenCalledOnce();
    expect(partial).toHaveBeenCalledWith('hello world');
  });

  it('uses concatenated deltas when the finished result is empty', async () => {
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send(_prompt, { onDelta }) {
              onDelta({ update: { type: 'text-delta', text: 'delta ' } });
              onDelta({ update: { type: 'text-delta', text: 'fallback' } });
              return {
                async wait() {
                  return { status: 'finished' as const, result: '' };
                },
              };
            },
            close() {},
          };
        },
      },
    }));

    const service = provider.createChatService({});
    const result = await service.chatOnce(
      [{ role: 'user', content: 'hello' }],
      false,
    );

    expect(result.blocks).toEqual([{ type: 'text', text: 'delta fallback' }]);
  });

  it('rejects an empty result without deltas and disposes the agent', async () => {
    const close = vi.fn();
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send() {
              return {
                async wait() {
                  return { status: 'finished' as const, result: '' };
                },
              };
            },
            close,
          };
        },
      },
    }));
    const service = provider.createChatService({});

    await expect(
      service.chatOnce([{ role: 'user', content: 'hello' }], false),
    ).rejects.toThrow('cursor-sdk provider received an empty response');
    expect(close).toHaveBeenCalledOnce();
  });

  it('reports SDK errors with their code, auth hint, and no apiKey', async () => {
    const apiKey = 'cursor-secret-that-must-not-leak';
    const close = vi.fn();
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send() {
              return {
                async wait() {
                  return {
                    status: 'error' as const,
                    error: {
                      message: `401 unauthorized for ${apiKey}`,
                      code: 'AUTH_401',
                    },
                  };
                },
              };
            },
            close,
          };
        },
      },
    }));
    const service = provider.createChatService({ apiKey });

    let caught: unknown;
    try {
      await service.chatOnce([{ role: 'user', content: 'hello' }], false);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(
      /cursor-sdk provider failed\. This looks like an authentication or subscription permission failure\./,
    );
    expect((caught as Error).message).toContain('AUTH_401');
    expect((caught as Error).message).not.toContain(apiKey);
    expect(close).toHaveBeenCalledOnce();
  });

  it('preserves the run error when disposal also fails', async () => {
    const close = vi.fn(() => {
      throw new Error('dispose failed');
    });
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send() {
              return {
                async wait() {
                  return {
                    status: 'error' as const,
                    error: { message: 'original run failure' },
                  };
                },
              };
            },
            close,
          };
        },
      },
    }));
    const service = provider.createChatService({});

    let caught: unknown;
    try {
      await service.chatOnce([{ role: 'user', content: 'hello' }], false);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain('original run failure');
    expect((caught as Error).message).not.toContain('dispose failed');
    expect(close).toHaveBeenCalledOnce();
  });

  it('reports disposal failures after a successful run', async () => {
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send() {
              return {
                async wait() {
                  return { status: 'finished' as const, result: 'done' };
                },
              };
            },
            close() {
              throw new Error('dispose failed after success');
            },
          };
        },
      },
    }));
    const service = provider.createChatService({});

    await expect(
      service.chatOnce([{ role: 'user', content: 'hello' }], false),
    ).rejects.toThrow('dispose failed after success');
  });

  it('reports cancelled runs', async () => {
    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: {
        async create() {
          return {
            async send() {
              return {
                async wait() {
                  return { status: 'cancelled' as const };
                },
              };
            },
            close() {},
          };
        },
      },
    }));
    const service = provider.createChatService({});

    await expect(
      service.chatOnce([{ role: 'user', content: 'hello' }], false),
    ).rejects.toThrow('cursor-sdk run was cancelled');
  });

  it('prefers async disposal when the runtime exposes its symbol', async () => {
    const asyncDispose = vi.fn();
    const close = vi.fn();
    const asyncDisposeSymbol = (Symbol as unknown as { asyncDispose?: symbol })
      .asyncDispose;
    const agent = {
      async send() {
        return {
          async wait() {
            return { status: 'finished' as const, result: 'done' };
          },
        };
      },
      close,
    };

    if (asyncDisposeSymbol) {
      Object.defineProperty(agent, asyncDisposeSymbol, {
        value: asyncDispose,
      });
    }

    const provider = new CursorSDKChatServiceProvider(async () => ({
      Agent: { create: async () => agent },
    }));
    const service = provider.createChatService({});

    await service.chatOnce([{ role: 'user', content: 'hello' }], false);

    if (asyncDisposeSymbol) {
      expect(asyncDispose).toHaveBeenCalledOnce();
      expect(close).not.toHaveBeenCalled();
    } else {
      expect(close).toHaveBeenCalledOnce();
    }
  });

  it('shows the install hint when the SDK loader fails', async () => {
    const provider = new CursorSDKChatServiceProvider(async () => {
      throw new Error('module not found');
    });
    const service = provider.createChatService({});

    await expect(
      service.chatOnce([{ role: 'user', content: 'hello' }], false),
    ).rejects.toThrow(
      'cursor-sdk provider requires @cursor/sdk. Install it in your Node.js 22.13+ project and authenticate with Cursor.auth.login() or CURSOR_API_KEY.',
    );
  });

  it('accepts a string apiKey while keeping unsupported option checks', () => {
    const provider = new CursorSDKChatServiceProvider();

    expect(() =>
      provider.createChatService({ apiKey: 'cursor-secret' }),
    ).not.toThrow();
    expect(() => provider.createChatService({ apiKey: 123 } as any)).toThrow(
      'cursor-sdk provider apiKey must be a string',
    );
    expect(() => provider.createChatService({ tools: [] } as any)).toThrow(
      'cursor-sdk provider does not support tools yet',
    );
    expect(() => provider.createChatService({ mcpServers: [] } as any)).toThrow(
      'cursor-sdk provider does not support mcpServers yet',
    );

    const codexProvider = new CodexSDKChatServiceProvider();
    expect(() =>
      codexProvider.createChatService({ apiKey: 'secret' } as any),
    ).toThrow('codex-sdk provider does not accept apiKey');

    expect(provider.getSupportedModels()).toEqual(['default']);
    expect(provider.getDefaultModel()).toBe('default');
    expect(provider.getVisionSupportLevel()).toBe('unsupported');
  });

  it('throws an explicit unsupported error for vision chat', async () => {
    const provider = new CursorSDKChatServiceProvider();
    const service = provider.createChatService({});

    await expect(service.visionChatOnce([], false, () => {})).rejects.toThrow(
      'cursor-sdk does not support vision chat yet',
    );
  });
});
