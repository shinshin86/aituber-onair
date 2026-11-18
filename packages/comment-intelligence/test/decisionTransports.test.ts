import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDecisionsCommentAnalysisProvider,
  type DecisionsCommentAnalysisOptions,
} from '../src/index.js';
import {
  decisionInput,
  decisionsResponse,
  jsonResponse,
  openAIResponse,
} from './decisionFixtures.js';

const transports = [
  'microsoft',
  'liquid',
  'google',
  'openai',
  'cloudflare',
] as const;
type Transport = (typeof transports)[number];

const settings: Record<
  Transport,
  {
    options: Partial<DecisionsCommentAnalysisOptions>;
    endpoint: string;
    model: string;
    label: string;
    header: string;
  }
> = {
  microsoft: {
    options: {
      endpoint: 'https://example.services.ai.azure.com///',
      model: 'decision-deployment',
    },
    endpoint:
      'https://example.services.ai.azure.com/providers/microsoft/v1/systemone',
    model: 'decision-deployment',
    label: 'Microsoft',
    header: 'api-key',
  },
  liquid: {
    options: {},
    endpoint: 'https://api.liquid.ai/decisions/v1/systemone',
    model: 'd1.1',
    label: 'Liquid',
    header: 'Authorization',
  },
  google: {
    options: {},
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/decisions',
    model: 'gemini-decision-1',
    label: 'Google',
    header: 'x-goog-api-key',
  },
  openai: {
    options: {},
    endpoint: 'https://api.openai.com/v1/decisions',
    model: 'gpt-6-luna',
    label: 'OpenAI',
    header: 'Authorization',
  },
  cloudflare: {
    options: { accountId: 'test-account' },
    endpoint:
      'https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/cloudflare/clef',
    model: 'clef',
    label: 'Cloudflare',
    header: 'Authorization',
  },
};

function setup(
  transport: Transport,
  overrides: Partial<DecisionsCommentAnalysisOptions> = {}
) {
  const fetchFn = vi
    .fn<[RequestInfo | URL, RequestInit?], Promise<Response>>()
    .mockImplementation(async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      return jsonResponse(
        transport === 'openai'
          ? openAIResponse(body.questions)
          : decisionsResponse(body.questions)
      );
    });
  const options = {
    transport,
    apiKey: ' test-key ',
    fetch: fetchFn,
    ...settings[transport].options,
    ...overrides,
  };
  // Runtime validation cases intentionally include invalid connection shapes.
  return {
    provider: createDecisionsCommentAnalysisProvider(
      options as DecisionsCommentAnalysisOptions
    ),
    fetchFn,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each(transports)('%s Decisions HTTP transport', (transport) => {
  it('sends the configured endpoint, authentication and typed questions, and parses the result', async () => {
    const { provider, fetchFn } = setup(transport, { responsePlan: true });
    const result = await provider.analyze(decisionInput);
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(settings[transport].endpoint);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({
      [settings[transport].header]:
        settings[transport].header === 'Authorization'
          ? 'Bearer test-key'
          : 'test-key',
      'Content-Type': 'application/json',
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.redirect).toBe('manual');
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe(settings[transport].model);
    expect(init?.body).not.toContain('test-key');
    expect(init?.body).not.toContain('private-viewer-id');
    expect(init?.body).not.toContain('Private Viewer');
    expect(Object.keys(body.questions)).toHaveLength(7);
    if (transport === 'openai' || transport === 'google') {
      expect(body).not.toHaveProperty('state');
      expect(JSON.parse(body.input).comments).toEqual([
        { text: 'How does it work?' },
      ]);
    } else {
      expect(body.state.comments).toEqual([{ text: 'How does it work?' }]);
      expect(body.questions.c0_hostile.criteria).toHaveProperty('true');
      expect(body.questions.c0_hostile.criteria).toHaveProperty('false');
    }
    expect(result.semanticAssessments).toEqual([
      {
        commentId: 'a',
        question: true,
        topicRelated: true,
        alreadyAnswered: true,
      },
    ]);
    expect(result.responsePlans).toEqual([
      {
        commentId: 'a',
        depth: 'quick',
        reasoningEffort: 'high',
        needsAttention: true,
        pointsOutError: true,
        notifyModerator: true,
      },
    ]);
  });

  it('honors a model override', async () => {
    const model = transport === 'cloudflare' ? 'clef-flash' : 'custom-model';
    const { provider, fetchFn } = setup(transport, { model });
    await provider.analyze(decisionInput);
    expect(JSON.parse(fetchFn.mock.calls[0][1]?.body as string).model).toBe(
      model
    );
  });

  it.each([undefined, '', ' '])(
    'rejects a missing or blank API key (%j) at creation',
    (apiKey) => {
      expect(() => setup(transport, { apiKey })).toThrow(/^Decisions /);
    }
  );

  it('rejects an empty model at creation', () => {
    expect(() => setup(transport, { model: ' ' })).toThrow(/^Decisions /);
  });

  it('uses neutral common-validation and duplicate-ID diagnostics', async () => {
    expect(() => setup(transport, { minConfidence: 2 })).toThrow(
      /^Decisions minConfidence must be between 0 and 1$/
    );
    expect(() => setup(transport, { timeoutMs: 0 })).toThrow(
      /^Decisions timeoutMs must be positive$/
    );
    expect(() =>
      setup(transport, { responsePlan: { signalThreshold: -1 } })
    ).toThrow(/^Decisions signalThreshold must be between 0 and 1$/);
    await expect(
      setup(transport).provider.analyze({
        comments: [decisionInput.comments[0], decisionInput.comments[0]],
      })
    ).rejects.toThrow(/^Decisions requires unique comment IDs$/);
  });

  it('does not send empty or pre-aborted batches', async () => {
    const { provider, fetchFn } = setup(transport);
    expect(await provider.analyze({ comments: [] })).toEqual({
      semanticAssessments: [],
      decisions: [],
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      provider.analyze({ ...decisionInput, signal: controller.signal })
    ).rejects.toThrow(/^Decisions request aborted$/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([401, 429, 500])(
    'reports only the status for HTTP %s',
    async (status) => {
      const { provider, fetchFn } = setup(transport);
      const response = jsonResponse({ error: 'private body test-key' }, status);
      const jsonSpy = vi.spyOn(response, 'json');
      fetchFn.mockResolvedValue(response);
      await expect(provider.analyze(decisionInput)).rejects.toThrow(
        `Decisions ${settings[transport].label} request failed (HTTP ${status})`
      );
      expect(jsonSpy).not.toHaveBeenCalled();
    }
  );

  it.each([302, 0])(
    'rejects redirect status %s without re-sending credentials',
    async (status) => {
      const { provider, fetchFn } = setup(transport);
      const response = Object.assign(
        jsonResponse({ private: 'test-key' }, status),
        {
          type: status === 0 ? 'opaqueredirect' : 'default',
          headers: new Headers({
            Location: 'https://redirect.example/collect',
          }),
        }
      );
      const jsonSpy = vi.spyOn(response, 'json');
      fetchFn.mockResolvedValue(response);
      await expect(provider.analyze(decisionInput)).rejects.toThrow(
        `Decisions ${settings[transport].label} request failed (HTTP ${status})`
      );
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(fetchFn.mock.calls[0][0]).toBe(settings[transport].endpoint);
      expect(fetchFn.mock.calls[0][1]?.redirect).toBe('manual');
      expect(jsonSpy).not.toHaveBeenCalled();
    }
  );

  it('sanitizes network and JSON errors', async () => {
    const { provider, fetchFn } = setup(transport);
    fetchFn.mockRejectedValueOnce(new Error('private body Bearer test-key'));
    await expect(provider.analyze(decisionInput)).rejects.toThrow(
      new RegExp(
        `^Decisions ${settings[transport].label} request failed or was aborted$`
      )
    );
    fetchFn.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('private body');
      },
    } as unknown as Response);
    await expect(provider.analyze(decisionInput)).rejects.toThrow(
      new RegExp(
        `^Decisions ${settings[transport].label} returned invalid JSON$`
      )
    );
  });

  it('keeps malformed-response diagnostics neutral', async () => {
    const { provider, fetchFn } = setup(transport);
    fetchFn.mockResolvedValue(jsonResponse({ answers: {} }));
    await expect(provider.analyze(decisionInput)).rejects.toThrow(
      /^Decisions /
    );
  });

  it.each(['timeout', 'caller'] as const)(
    'forwards cancellation from %s',
    async (reason) => {
      vi.useFakeTimers();
      const { provider, fetchFn } = setup(transport, { timeoutMs: 25 });
      const controller = new AbortController();
      let signal: AbortSignal | undefined;
      fetchFn.mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            signal = init?.signal as AbortSignal;
            signal.addEventListener(
              'abort',
              () => reject(new Error('private test-key')),
              { once: true }
            );
          })
      );
      const task = expect(
        provider.analyze({ ...decisionInput, signal: controller.signal })
      ).rejects.toThrow(
        new RegExp(
          `^Decisions ${settings[transport].label} request failed or was aborted$`
        )
      );
      if (reason === 'timeout') await vi.advanceTimersByTimeAsync(25);
      else controller.abort();
      await task;
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it('uses global fetch when no override is provided', async () => {
    const fetchFn = vi
      .fn<[RequestInfo | URL, RequestInit?], Promise<Response>>()
      .mockResolvedValue(
        jsonResponse(
          transport === 'openai'
            ? { answers: [{ name: 'c0_question', type: 'refusal' }] }
            : { answers: { c0_question: { type: 'refusal' } } }
        )
      );
    vi.stubGlobal('fetch', fetchFn);
    await setup(transport, { fetch: undefined }).provider.analyze({
      comments: decisionInput.comments,
    });
    expect(fetchFn).toHaveBeenCalledOnce();
    vi.stubGlobal('fetch', undefined);
    await expect(
      setup(transport, { fetch: undefined }).provider.analyze(decisionInput)
    ).rejects.toThrow(/^Decisions requires a fetch implementation$/);
  });
});

describe('Microsoft connection options', () => {
  it('supports Entra ID without an API key', async () => {
    const { provider, fetchFn } = setup('microsoft', {
      apiKey: undefined,
      bearerToken: ' token ',
    });
    await provider.analyze(decisionInput);
    expect(fetchFn.mock.calls[0][1]?.headers).toEqual({
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    });
  });

  it.each([
    { endpoint: undefined },
    { endpoint: '' },
    { endpoint: 'not-a-url' },
    { endpoint: 'http://example.com' },
    { endpoint: 'https://user:secret@example.com' },
    { endpoint: 'https://example.com?api-key=secret' },
    { endpoint: 'https://example.com#fragment' },
    { model: undefined },
    { bearerToken: 'token' },
    { apiKey: undefined, bearerToken: ' ' },
  ])('rejects invalid configuration %j', (overrides) => {
    expect(() => setup('microsoft', overrides)).toThrow(
      /^Decisions Microsoft /
    );
  });
});

describe('new transport question limits', () => {
  it.each([
    ['microsoft', 50, 50, 20],
    ['liquid', 42, 18, 18],
    ['google', 333, 142, 20],
    ['openai', 133, 57, 20],
    ['cloudflare', 21, 9, 9],
  ] as const)(
    'enforces %s limits through the public factory',
    async (transport, basic, plan, defaultPlan) => {
      for (const responsePlan of [false, true, {}]) {
        const ceiling = responsePlan ? plan : basic;
        expect(() =>
          setup(transport, { maxComments: ceiling + 1, responsePlan })
        ).toThrow(/^Decisions .*maxComments/);
        const { provider, fetchFn } = setup(transport, {
          maxComments: ceiling,
          responsePlan,
        });
        const comments = Array.from({ length: ceiling + 1 }, (_, index) => ({
          ...decisionInput.comments[0],
          id: String(index),
        }));
        const result = await provider.analyze({ ...decisionInput, comments });
        expect(result.decisions).toHaveLength(ceiling);
        const body = JSON.parse(fetchFn.mock.calls[0][1]?.body as string);
        expect(Object.keys(body.questions)).toHaveLength(
          ceiling * (responsePlan ? 7 : 3)
        );
      }
      const { provider } = setup(transport, { responsePlan: true });
      const comments = Array.from({ length: 25 }, (_, index) => ({
        ...decisionInput.comments[0],
        id: String(index),
      }));
      expect(
        (await provider.analyze({ ...decisionInput, comments })).decisions
      ).toHaveLength(defaultPlan);
    }
  );
});

describe('OpenAI response integration', () => {
  it('preserves other answers when one question is refused', async () => {
    const { provider, fetchFn } = setup('openai', { responsePlan: true });
    fetchFn.mockImplementation(async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      return jsonResponse({
        answers: openAIResponse(body.questions).answers.map((answer) =>
          answer.name === 'c0_question'
            ? { name: answer.name, type: 'refusal' }
            : answer
        ),
      });
    });
    const result = await provider.analyze(decisionInput);
    expect(result.semanticAssessments).toEqual([
      { commentId: 'a', topicRelated: true, alreadyAnswered: true },
    ]);
    expect(result.responsePlans?.[0].notifyModerator).toBe(true);
  });

  it.each([
    {
      type: 'choice',
      choice: 'yes',
      probabilities: [{ value: 'unknown', probability: 1 }],
    },
    {
      type: 'choice',
      choice: 'yes',
      probabilities: [{ value: 'yes', probability: 2 }],
    },
    {
      type: 'choice',
      choice: 'no',
      probabilities: [{ value: 'yes', probability: 1 }],
    },
    { type: 'score', score: 3 },
  ])('retains shared-parser validation after mapping %j', async (answer) => {
    const { provider, fetchFn } = setup('openai');
    fetchFn.mockResolvedValue(
      jsonResponse({ answers: [{ name: 'c0_question', ...answer }] })
    );
    await expect(
      provider.analyze({ comments: decisionInput.comments })
    ).rejects.toThrow(/^Decisions returned /);
  });
});
