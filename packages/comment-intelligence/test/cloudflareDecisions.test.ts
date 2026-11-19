import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDecisionsCommentAnalysisProvider,
  type CloudflareDecisionsBinding,
  type DecisionsCommentAnalysisOptions,
} from '../src/index.js';
import { createCloudflareDecisionTransport } from '../src/jev/cloudflareTransport.js';
import {
  decisionInput,
  decisionRequest,
  decisionsResponse,
  jsonResponse,
} from './decisionFixtures.js';

const answers = {
  answers: {
    c0_question: {
      type: 'choice',
      choice: 'yes',
      confidence: 0.9,
      probabilities: { yes: 1 },
    },
  },
};
const input = { comments: decisionInput.comments };

function rest(overrides: Partial<DecisionsCommentAnalysisOptions> = {}) {
  const fetchFn = vi
    .fn<[RequestInfo | URL, RequestInit?], Promise<Response>>()
    .mockResolvedValue(jsonResponse(answers));
  return {
    fetchFn,
    provider: createDecisionsCommentAnalysisProvider({
      transport: 'cloudflare',
      apiKey: 'test-token',
      accountId: 'test-account',
      fetch: fetchFn,
      ...overrides,
    } as DecisionsCommentAnalysisOptions),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Cloudflare REST envelopes', () => {
  it.each([
    answers,
    { success: true, result: answers, errors: [], messages: [] },
    { result: answers },
  ])('accepts wrapped and unwrapped responses %j', async (body) => {
    const { provider, fetchFn } = rest();
    fetchFn.mockResolvedValue(jsonResponse(body));
    expect((await provider.analyze(input)).semanticAssessments).toEqual([
      { commentId: 'a', question: true },
    ]);
  });

  it.each([undefined, answers])(
    'rejects success false even with result %j',
    async (result) => {
      const { provider, fetchFn } = rest();
      fetchFn.mockResolvedValue(
        jsonResponse({
          success: false,
          result,
          errors: ['private body test-token'],
        })
      );
      await expect(provider.analyze(input)).rejects.toThrow(
        /^Decisions Cloudflare request was unsuccessful$/
      );
    }
  );

  it('rejects malformed unwrapped results through the shared parser', async () => {
    const { provider, fetchFn } = rest();
    fetchFn.mockResolvedValue(jsonResponse({ success: true, result: null }));
    await expect(provider.analyze(input)).rejects.toThrow(
      /^Decisions returned invalid decisions$/
    );
  });

  it.each(['clef', 'clef-flash', 'clef-omni'])(
    'uses short selector %s in the body and full selector in the URL',
    async (model) => {
      const { provider, fetchFn } = rest({ model });
      await provider.analyze(input);
      expect(fetchFn.mock.calls[0][0]).toBe(
        `https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/cloudflare/${model}`
      );
      expect(JSON.parse(fetchFn.mock.calls[0][1]?.body as string).model).toBe(
        model
      );
    }
  );
});

describe('Cloudflare binding', () => {
  it.each(['clef', 'clef-flash', 'clef-omni'])(
    'calls binding.run for %s without a fetch implementation or API key',
    async (model) => {
      vi.stubGlobal('fetch', undefined);
      const binding = {
        calls: [] as Array<{ model: string; body: unknown }>,
        async run(model: string, body: unknown) {
          this.calls.push({ model, body });
          return { success: true, result: answers };
        },
      };
      const provider = createDecisionsCommentAnalysisProvider({
        transport: 'cloudflare',
        model,
        binding,
      });
      expect((await provider.analyze(input)).semanticAssessments).toEqual([
        { commentId: 'a', question: true },
      ]);
      expect(binding.calls).toHaveLength(1);
      expect(binding.calls[0]).toMatchObject({
        model: `@cf/cloudflare/${model}`,
        body: { model, state: { comments: [{ text: 'How does it work?' }] } },
      });
    }
  );

  it('uses the default model and the same plan parser', async () => {
    const binding = {
      run: vi
        .fn<[string, unknown], Promise<unknown>>()
        .mockImplementation(async (_model, body) => {
          const { questions } = body as {
            questions: Record<string, { type: string }>;
          };
          return decisionsResponse(questions);
        }),
    };
    const provider = createDecisionsCommentAnalysisProvider({
      transport: 'cloudflare',
      binding,
      responsePlan: true,
    });
    const result = await provider.analyze(decisionInput);
    expect(binding.run.mock.calls[0][0]).toBe('@cf/cloudflare/clef');
    expect(result.responsePlans?.[0]).toMatchObject({
      depth: 'quick',
      notifyModerator: true,
    });
  });

  it('does not run a binding for a pre-aborted input', async () => {
    const binding = { run: vi.fn() };
    const controller = new AbortController();
    controller.abort();
    const provider = createDecisionsCommentAnalysisProvider({
      transport: 'cloudflare',
      binding,
    });
    await expect(
      provider.analyze({ ...input, signal: controller.signal })
    ).rejects.toThrow(/^Decisions request aborted$/);
    expect(binding.run).not.toHaveBeenCalled();
  });

  it.each(['timeout', 'caller'] as const)(
    'ends a pending binding wait on %s and handles late rejection',
    async (reason) => {
      vi.useFakeTimers();
      let rejectOperation: (reason: Error) => void = () => {};
      const operation = new Promise<unknown>((_resolve, reject) => {
        rejectOperation = reject;
      });
      const binding = { run: vi.fn().mockReturnValue(operation) };
      const controller = new AbortController();
      const provider = createDecisionsCommentAnalysisProvider({
        transport: 'cloudflare',
        binding,
        timeoutMs: 25,
      });
      const result = expect(
        provider.analyze({ ...input, signal: controller.signal })
      ).rejects.toThrow(/^Decisions Cloudflare request failed or was aborted$/);
      await Promise.resolve();
      expect(binding.run).toHaveBeenCalledOnce();
      if (reason === 'timeout') await vi.advanceTimersByTimeAsync(25);
      else controller.abort();
      await result;
      expect(vi.getTimerCount()).toBe(0);
      rejectOperation(new Error('private late rejection'));
      await vi.runAllTimersAsync();
    }
  );

  it.each(['resolve', 'reject', 'throw', 'abort-and-throw'] as const)(
    'cleans up binding abort listeners after %s',
    async (outcome) => {
      const controller = new AbortController();
      const remove = vi.spyOn(controller.signal, 'removeEventListener');
      const binding = {
        run() {
          if (outcome === 'abort-and-throw') controller.abort();
          if (outcome === 'throw' || outcome === 'abort-and-throw')
            throw new Error('private sync error');
          if (outcome === 'reject')
            return Promise.reject(new Error('private async error'));
          return Promise.resolve(answers);
        },
      };
      const request = createCloudflareDecisionTransport({ binding });
      const task = request(decisionRequest, controller.signal);
      if (outcome === 'resolve') expect(await task).toEqual(answers);
      else
        await expect(task).rejects.toThrow(
          /^Decisions Cloudflare request failed or was aborted$/
        );
      expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    }
  );

  it('sanitizes an unsuccessful binding envelope', async () => {
    const binding = {
      run: async () => ({
        success: false,
        result: answers,
        errors: ['private content'],
      }),
    };
    const provider = createDecisionsCommentAnalysisProvider({
      transport: 'cloudflare',
      binding,
    });
    await expect(provider.analyze(input)).rejects.toThrow(
      /^Decisions Cloudflare request was unsuccessful$/
    );
  });

  it('clears its timeout after a successful binding response', async () => {
    vi.useFakeTimers();
    const binding = { run: async () => answers };
    const provider = createDecisionsCommentAnalysisProvider({
      transport: 'cloudflare',
      binding,
    });
    await provider.analyze(input);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Cloudflare option validation', () => {
  it.each([
    { apiKey: undefined },
    { accountId: undefined },
    { accountId: ' ' },
    { accountId: '../another-account' },
    { accountId: 'a?query' },
    { model: 'cloudflare/clairic' },
    { model: '@cf/cloudflare/clef' },
    { binding: { run: async () => answers } },
  ])('rejects invalid REST configuration %j', (overrides) => {
    expect(() => rest(overrides)).toThrow(/^Decisions Cloudflare /);
  });

  it.each([
    { apiKey: 'key' },
    { accountId: 'account' },
    { binding: null as unknown as CloudflareDecisionsBinding },
    { binding: {} as CloudflareDecisionsBinding },
  ])('rejects invalid or mixed binding configuration %j', (overrides) => {
    expect(() =>
      createDecisionsCommentAnalysisProvider({
        transport: 'cloudflare',
        binding: { run: async () => answers },
        ...overrides,
      } as DecisionsCommentAnalysisOptions)
    ).toThrow(/^Decisions Cloudflare /);
  });
});
