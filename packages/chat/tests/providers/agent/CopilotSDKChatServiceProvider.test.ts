import { describe, expect, it, vi } from 'vitest';
import { CopilotSDKChatServiceProvider } from '../../../src/services/providers/agent/CopilotSDKChatServiceProvider';

describe('CopilotSDKChatServiceProvider', () => {
  it('creates a text-only Copilot SDK chat service without apiKey', async () => {
    let createSessionOptions: Record<string, unknown> | undefined;
    let stopped = false;

    const provider = new CopilotSDKChatServiceProvider(async () => ({
      CopilotClient: class {
        async createSession(options?: Record<string, unknown>) {
          createSessionOptions = options;
          return {
            async sendAndWait(message: { prompt: string }) {
              expect(message.prompt).toContain('System: Be brief.');
              expect(message.prompt).toContain('User: hello');
              return { data: { content: 'hi there' } };
            },
          };
        }

        stop() {
          stopped = true;
        }
      },
    }));

    const service = provider.createChatService({
      model: 'gpt-4.1',
      responseLength: 'short',
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

    expect(service.provider).toBe('copilot-sdk');
    expect(service.getModel()).toBe('gpt-4.1');
    expect(createSessionOptions?.model).toBe('gpt-4.1');
    expect(createSessionOptions?.streaming).toBe(false);
    expect(typeof createSessionOptions?.onPermissionRequest).toBe('function');
    expect(
      await (
        createSessionOptions?.onPermissionRequest as (
          request: unknown,
          invocation: unknown,
        ) => Promise<{ kind: string }> | { kind: string }
      )({ kind: 'shell' }, { sessionId: 'session-1' }),
    ).toEqual({
      kind: 'denied-no-approval-rule-and-could-not-request-from-user',
    });
    expect(partials).toEqual(['hi there']);
    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'hi there' }],
      stop_reason: 'end',
    });
    expect(stopped).toBe(true);
  });

  it('passes a custom permission handler to Copilot SDK sessions', async () => {
    const onPermissionRequest = vi.fn(() => ({ kind: 'approve-once' }));
    let createSessionOptions: Record<string, unknown> | undefined;
    const provider = new CopilotSDKChatServiceProvider(async () => ({
      CopilotClient: class {
        async createSession(options?: Record<string, unknown>) {
          createSessionOptions = options;
          return {
            async sendAndWait() {
              return { data: { content: 'ok' } };
            },
          };
        }
      },
    }));

    const service = provider.createChatService({ onPermissionRequest });
    await service.chatOnce([{ role: 'user', content: 'hello' }], false);

    expect(createSessionOptions?.onPermissionRequest).toBe(onPermissionRequest);
  });

  it('forwards streaming deltas from Copilot SDK sessions', async () => {
    let deltaHandler: ((event: any) => void) | undefined;
    const unsubscribe = vi.fn();
    const provider = new CopilotSDKChatServiceProvider(async () => ({
      CopilotClient: class {
        async createSession() {
          return {
            on(eventName: string, handler: (event: any) => void) {
              expect(eventName).toBe('assistant.message_delta');
              deltaHandler = handler;
              return unsubscribe;
            },
            async sendAndWait() {
              deltaHandler?.({ data: { deltaContent: 'hello' } });
              deltaHandler?.({ data: { deltaContent: ' world' } });
              return { data: { content: 'hello world' } };
            },
          };
        }
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
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('rejects API and tool options', () => {
    const provider = new CopilotSDKChatServiceProvider();

    expect(() =>
      provider.createChatService({ apiKey: 'secret' } as any),
    ).toThrow('copilot-sdk provider does not accept apiKey');

    expect(() => provider.createChatService({ tools: [] } as any)).toThrow(
      'copilot-sdk provider does not support tools yet',
    );

    expect(provider.getVisionSupportLevel()).toBe('unsupported');
  });

  it('wraps likely authentication errors while preserving SDK details', async () => {
    const provider = new CopilotSDKChatServiceProvider(async () => ({
      CopilotClient: class {
        async createSession() {
          throw new Error('401 unauthorized: login required');
        }
      },
    }));
    const service = provider.createChatService({});

    await expect(
      service.chatOnce([{ role: 'user', content: 'hello' }], false, () => {}),
    ).rejects.toThrow(
      /copilot-sdk provider failed\. This looks like an authentication or subscription permission failure\.[\s\S]*401 unauthorized: login required/,
    );
  });

  it('throws explicit unsupported errors for vision chat', async () => {
    const provider = new CopilotSDKChatServiceProvider(async () => ({
      CopilotClient: class {},
    }));
    const service = provider.createChatService({});

    await expect(service.visionChatOnce([], false, () => {})).rejects.toThrow(
      'copilot-sdk does not support vision chat yet',
    );
  });
});
