import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  createCommentIntelligence,
  createDecisionsCommentAnalysisProvider,
  createJevCommentAnalysisProvider,
  type DecisionsChoiceAnswer,
  type DecisionsCommentAnalysisOptions,
  type DecisionsCommentAnalysisProvider,
  type DecisionsCommentAnalysisResult,
  type DecisionsCommentDecision,
  type DecisionsNoulAnswer,
  type DecisionsResponsePlanOptions,
  type DecisionsScoreAnswer,
  type DecisionsTransport,
  type JevChoiceAnswer,
  type JevCommentAnalysisOptions,
  type JevCommentAnalysisProvider,
  type JevCommentAnalysisResult,
  type JevCommentDecision,
  type JevNoulAnswer,
  type JevResponsePlanOptions,
  type JevScoreAnswer,
} from '../src/index.js';
import {
  buildCommentDecisions,
  parseCommentDecisions,
} from '../src/jev/commentDecisions.js';
import { createJevCommentAnalysisProvider as legacyModuleFactory } from '../src/llm/createJevCommentAnalysisProvider.js';

const dimensions = [
  'question',
  'topicRelated',
  'alreadyAnswered',
  'responseDepth',
  'hostile',
  'pointsOutError',
  'needsModerator',
] as const;

const input = {
  comments: ['a', 'b'].map((id) => ({
    id,
    text: 'How does it work?',
    timestamp: 1000,
    author: { id: `viewer-${id}`, name: 'Viewer' },
  })),
  streamState: { topic: 'Speech synthesis' },
  recentMessages: [{ role: 'assistant' as const, content: 'It runs locally.' }],
};

function choice() {
  return {
    type: 'choice',
    choice: 'yes',
    confidence: 0.9,
    probabilities: { yes: 1 },
  };
}

function answerFor(key: string): unknown {
  if (key.endsWith('responseDepth'))
    return {
      type: 'score',
      score: 2,
      confidence: 0.9,
      probabilities: { '2': 1 },
    };
  if (dimensions.slice(4).some((dimension) => key.endsWith(dimension)))
    return { type: 'noul', noul: 0.9 };
  return choice();
}

function provider(
  answer: (key: string) => unknown = answerFor,
  options: Partial<JevCommentAnalysisOptions> = {}
) {
  const fetchFn = vi
    .fn<[RequestInfo | URL, RequestInit?], Promise<Response>>()
    .mockImplementation(async (_url, init) => {
      const request = JSON.parse(init?.body as string);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          answers: Object.fromEntries(
            Object.keys(request.questions).map((key) => [key, answer(key)])
          ),
        }),
      } as Response;
    });
  return createDecisionsCommentAnalysisProvider({
    transport: 'typesafe',
    apiKey: 'test-key',
    fetch: fetchFn,
    ...options,
  });
}

describe('generic Decisions API compatibility', () => {
  it('keeps both factories and the legacy module as the same function', () => {
    expect(createJevCommentAnalysisProvider).toBe(
      createDecisionsCommentAnalysisProvider
    );
    expect(legacyModuleFactory).toBe(createDecisionsCommentAnalysisProvider);
    expectTypeOf<JevCommentAnalysisOptions>().toMatchTypeOf<DecisionsCommentAnalysisOptions>();
    expectTypeOf<JevCommentAnalysisProvider>().toEqualTypeOf<DecisionsCommentAnalysisProvider>();
    expectTypeOf<JevCommentAnalysisResult>().toEqualTypeOf<DecisionsCommentAnalysisResult>();
    expectTypeOf<JevResponsePlanOptions>().toEqualTypeOf<DecisionsResponsePlanOptions>();
    expectTypeOf<JevCommentDecision>().toEqualTypeOf<DecisionsCommentDecision>();
    expectTypeOf<JevChoiceAnswer>().toEqualTypeOf<DecisionsChoiceAnswer>();
    expectTypeOf<JevScoreAnswer>().toEqualTypeOf<DecisionsScoreAnswer>();
    expectTypeOf<JevNoulAnswer>().toEqualTypeOf<DecisionsNoulAnswer>();
    expectTypeOf<DecisionsTransport>().toEqualTypeOf<
      DecisionsCommentAnalysisOptions['transport']
    >();
  });

  it.each(['typesafe', 'openrouter'] as const)(
    'analyzes via the generic factory with %s',
    async (transport) => {
      const result = await provider(answerFor, { transport }).analyze(input);
      expect(result.semanticAssessments).toEqual([
        {
          commentId: 'a',
          question: true,
          topicRelated: true,
          alreadyAnswered: true,
        },
        {
          commentId: 'b',
          question: true,
          topicRelated: true,
          alreadyAnswered: true,
        },
      ]);
      expect(result.decisions[0].question?.probabilities).toEqual({
        yes: 1,
        no: 0,
        uncertain: 0,
      });
    }
  );

  it('uses neutral diagnostics in the shared parser by default', () => {
    const batch = buildCommentDecisions(input, 1);
    expect(() => parseCommentDecisions({}, batch.keys, 0.7)).toThrow(
      'Decisions returned invalid decisions'
    );
    expect(() =>
      parseCommentDecisions({ answers: {} }, batch.keys, 0.7)
    ).toThrow('Decisions returned an invalid choice answer');
  });
});

describe.each(['typesafe', 'openrouter'] as const)(
  'legacy error messages for %s',
  (transport) => {
    it('preserves the exact API-key and unsupported-transport messages', () => {
      const name = transport === 'typesafe' ? 'TypeSafe AI' : 'OpenRouter';
      expect(() => provider(answerFor, { transport, apiKey: '' })).toThrow(
        new RegExp(`^Jev requires a ${name} API key$`)
      );
      expect(() =>
        provider(answerFor, {
          transport: 'unsupported' as JevCommentAnalysisOptions['transport'],
        })
      ).toThrow(/^Unsupported Jev transport$/);
    });

    it.each([
      [{ minConfidence: 2 }, 'Jev minConfidence must be between 0 and 1'],
      [
        { maxComments: 0 },
        'Jev maxComments must be an integer between 1 and 50',
      ],
      [
        { maxComments: 51 },
        'Jev maxComments must be an integer between 1 and 50',
      ],
      [
        { maxComments: 1.5 },
        'Jev maxComments must be an integer between 1 and 50',
      ],
      [{ timeoutMs: 0 }, 'Jev timeoutMs must be positive'],
      [
        { responsePlan: { moderatorThreshold: 2 } },
        'Jev moderatorThreshold must be between 0 and 1',
      ],
      [
        { responsePlan: { signalThreshold: -1 } },
        'Jev signalThreshold must be between 0 and 1',
      ],
      [{ model: ' ' }, 'Jev model must not be empty'],
    ] satisfies Array<[Partial<DecisionsCommentAnalysisOptions>, string]>)(
      'preserves the exact validation message for %j',
      (options, message) => {
        expect(() => provider(answerFor, { transport, ...options })).toThrow(
          new RegExp(`^${message}$`)
        );
      }
    );

    it('preserves duplicate-ID diagnostics from the request builder', async () => {
      await expect(
        provider(answerFor, { transport }).analyze({
          comments: [input.comments[0], input.comments[0]],
        })
      ).rejects.toThrow(/^Jev requires unique comment IDs$/);
    });

    it.each(['before', 'during'] as const)(
      'preserves abort diagnostics when canceled %s the request',
      async (timing) => {
        const controller = new AbortController();
        const fetchFn = vi
          .fn<[RequestInfo | URL, RequestInit?], Promise<Response>>()
          .mockImplementation(async () => {
            controller.abort();
            return {
              ok: true,
              json: async () => ({ answers: {} }),
            } as Response;
          });
        if (timing === 'before') controller.abort();
        await expect(
          provider(answerFor, { transport, fetch: fetchFn }).analyze({
            ...input,
            signal: controller.signal,
          })
        ).rejects.toThrow(/^Jev request aborted$/);
        expect(fetchFn).toHaveBeenCalledTimes(timing === 'before' ? 0 : 1);
      }
    );

    it('preserves diagnostics for an invalid decisions envelope', async () => {
      const fetchFn = vi
        .fn<[RequestInfo | URL, RequestInit?], Promise<Response>>()
        .mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
      await expect(
        provider(answerFor, { transport, fetch: fetchFn }).analyze(input)
      ).rejects.toThrow(/^Jev returned invalid decisions$/);
    });

    it.each([
      [
        'question',
        { type: 'choice', choice: 'other' },
        'Jev returned an invalid choice answer',
      ],
      [
        'question',
        { ...choice(), confidence: 2 },
        'Jev returned invalid confidence',
      ],
      [
        'question',
        { ...choice(), probabilities: { yes: 2 } },
        'Jev returned invalid probabilities',
      ],
      [
        'question',
        { ...choice(), probabilities: { yes: 0.4, no: 0.6 } },
        'Jev returned inconsistent probabilities',
      ],
      [
        'responseDepth',
        { type: 'score', score: 3 },
        'Jev returned an invalid score answer',
      ],
      [
        'responseDepth',
        { type: 'score', score: 1, confidence: 2 },
        'Jev returned invalid confidence',
      ],
      [
        'responseDepth',
        { type: 'score', score: 1, probabilities: { '1': 2 } },
        'Jev returned invalid probabilities',
      ],
      [
        'responseDepth',
        { type: 'score', score: 1, probabilities: { '1': 0.2 } },
        'Jev returned inconsistent probabilities',
      ],
      [
        'hostile',
        { type: 'noul', noul: -1 },
        'Jev returned an invalid noul answer',
      ],
    ] satisfies Array<[string, unknown, string]>)(
      'preserves parser diagnostics for %s: %j',
      async (dimension, invalid, message) => {
        await expect(
          provider(
            (key) => (key.endsWith(dimension) ? invalid : answerFor(key)),
            { transport, responsePlan: true }
          ).analyze(input)
        ).rejects.toThrow(new RegExp(`^${message}$`));
      }
    );
  }
);

describe('per-question refusals', () => {
  it.each(dimensions)(
    'omits only the refused %s dimension',
    async (dimension) => {
      const baseline = await provider(answerFor, {
        responsePlan: true,
      }).analyze(input);
      const result = await provider(
        (key) =>
          key === `c0_${dimension}` ? { type: 'refusal' } : answerFor(key),
        { responsePlan: true }
      ).analyze(input);
      const expectedDecision = { ...baseline.decisions[0] };
      delete expectedDecision[dimension];
      expect(result.decisions).toEqual([
        expectedDecision,
        baseline.decisions[1],
      ]);
      const expectedAssessment = { ...baseline.semanticAssessments?.[0] };
      if (
        dimension === 'question' ||
        dimension === 'topicRelated' ||
        dimension === 'alreadyAnswered'
      )
        delete expectedAssessment[dimension];
      expect(result.semanticAssessments).toEqual([
        expectedAssessment,
        baseline.semanticAssessments?.[1],
      ]);
      expect(result.responsePlans?.[1]).toEqual(baseline.responsePlans?.[1]);
      const plan = result.responsePlans?.[0];
      expect(plan?.needsAttention).toBe(dimension !== 'hostile');
      expect(plan?.pointsOutError).toBe(dimension !== 'pointsOutError');
      expect(plan?.notifyModerator).toBe(dimension !== 'needsModerator');
      expect(plan?.depth).toBe(
        dimension === 'responseDepth' ? undefined : 'thoughtful'
      );
    }
  );

  it.each([true, { moderatorThreshold: 0, signalThreshold: 0 }])(
    'produces no plan signals for an entirely refused batch (%j)',
    async (responsePlan) => {
      const result = await provider(() => ({ type: 'refusal' }), {
        responsePlan,
      }).analyze(input);
      expect(result.decisions).toEqual([
        { commentId: 'a' },
        { commentId: 'b' },
      ]);
      expect(result.semanticAssessments).toEqual(result.decisions);
      expect(result.responsePlans).toEqual(
        ['a', 'b'].map((commentId) => ({
          commentId,
          needsAttention: false,
          pointsOutError: false,
          notifyModerator: false,
        }))
      );
    }
  );

  it('keeps valid semantic results active through ranking instead of falling back', async () => {
    const result = await createCommentIntelligence({
      analysis: {
        mode: 'llm-assisted',
        llmProvider: provider((key) =>
          key.startsWith('c0_') ? { type: 'refusal' } : answerFor(key)
        ),
        llmPolicy: { fallbackToRules: false },
      },
    }).analyze(input);
    expect(result.debug?.usedLLM).toBe(true);
    expect(result.debug?.semanticAssessments).toEqual([
      { commentId: 'a' },
      {
        commentId: 'b',
        question: true,
        topicRelated: true,
        alreadyAnswered: true,
      },
    ]);
  });
});

describe('sparse probability distributions', () => {
  it('uses the highest-probability score level even when level zero is absent', async () => {
    const result = await provider(
      (key) =>
        key.endsWith('responseDepth')
          ? {
              type: 'score',
              score: 1.6,
              confidence: 0.9,
              probabilities: { '1': 0.4, '2': 0.6 },
            }
          : answerFor(key),
      { responsePlan: true }
    ).analyze(input);
    expect(result.decisions[0].responseDepth).toEqual({
      score: 1.6,
      level: 2,
      confidence: 0.9,
      probabilities: { '0': 0, '1': 0.4, '2': 0.6 },
    });
    expect(result.responsePlans?.[0].depth).toBe('thoughtful');
  });

  it('accepts ties and rounded sums, and retains the score fallback without probabilities', async () => {
    const result = await provider(
      (key) =>
        key.endsWith('responseDepth')
          ? {
              type: 'score',
              score: 0.8,
              confidence: 0.9,
            }
          : key.endsWith('question')
            ? { ...choice(), probabilities: { yes: 0.499, no: 0.499 } }
            : answerFor(key),
      { responsePlan: true }
    ).analyze({ comments: input.comments });
    expect(result.decisions[0].question?.probabilities).toEqual({
      yes: 0.499,
      no: 0.499,
      uncertain: 0,
    });
    expect(result.decisions[0].responseDepth?.level).toBe(1);
  });

  it.each([
    {},
    null,
    [],
    { yes: 0.2 },
    { yes: 1.1 },
    { yes: -0.1, no: 1 },
    { yes: Number.NaN },
    { yes: Number.POSITIVE_INFINITY },
    { yes: '1' },
    { yes: 1, no: undefined },
    { yes: 1, extra: 0 },
    { no: 1 },
    { yes: 0.4, no: 0.6 },
  ])(
    'rejects broken or inconsistent choice probabilities %j',
    async (probabilities) => {
      await expect(
        provider(() => ({ ...choice(), probabilities })).analyze(input)
      ).rejects.toThrow('probabilities');
    }
  );

  it.each([
    {},
    null,
    [],
    { '2': 0.2 },
    { '2': 1.1 },
    { '2': -0.1, '1': 1 },
    { '2': Number.NaN },
    { '2': Number.POSITIVE_INFINITY },
    { '2': '1' },
    { '2': 1, '0': undefined },
    { '2': 1, '3': 0 },
    { '2': 1, extra: 0 },
  ])('rejects broken score probabilities %j', async (probabilities) => {
    await expect(
      provider(
        (key) =>
          key.endsWith('responseDepth')
            ? {
                type: 'score',
                score: 2,
                probabilities,
              }
            : answerFor(key),
        { responsePlan: true }
      ).analyze(input)
    ).rejects.toThrow('probabilities');
  });

  it.each([
    ['question', { type: 'noul', noul: 0.9 }],
    ['question', { ...choice(), confidence: -0.1 }],
    ['responseDepth', { type: 'score', score: -1 }],
    ['responseDepth', { type: 'score', score: Number.NaN }],
    ['responseDepth', { type: 'score', score: 1, confidence: 2 }],
    ['hostile', { type: 'noul', noul: 1.1 }],
    ['hostile', { type: 'noul', noul: Number.NaN }],
    ['question', { type: 'refused' }],
    ['question', undefined],
  ])('retains strict validation for %s: %j', async (dimension, invalid) => {
    await expect(
      provider(
        (key) => (key.endsWith(dimension as string) ? invalid : answerFor(key)),
        { responsePlan: true }
      ).analyze(input)
    ).rejects.toThrow('invalid');
  });
});
