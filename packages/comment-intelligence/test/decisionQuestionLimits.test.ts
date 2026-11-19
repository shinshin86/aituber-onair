import { describe, expect, it, vi } from 'vitest';
import { createDecisionsCommentAnalysisProvider } from '../src/index.js';
import { buildCommentDecisions } from '../src/jev/commentDecisions.js';
import { resolveMaxComments } from '../src/jev/questionLimits.js';

describe('Decisions transport batch ceilings', () => {
  it.each([
    ['openai', 400, 133, 57],
    ['liquid', 128, 42, 18],
    ['cloudflare', 64, 21, 9],
    ['google', 1000, 333, 142],
  ] as const)(
    'reserves context and response-plan questions for %s',
    (transport, limit, basicCeiling, planCeiling) => {
      for (const responsePlan of [false, true]) {
        const ceiling = responsePlan ? planCeiling : basicCeiling;
        expect(resolveMaxComments(transport, ceiling, responsePlan)).toBe(
          ceiling
        );
        expect(resolveMaxComments(transport, undefined, responsePlan)).toBe(
          Math.min(20, ceiling)
        );
        expect(() =>
          resolveMaxComments(transport, ceiling + 1, responsePlan)
        ).toThrow(`${limit} questions per request`);
        const input = {
          comments: Array.from({ length: ceiling + 1 }, (_, index) => ({
            id: String(index),
            text: 'Question',
            timestamp: 1000,
            author: { id: 'viewer', name: 'Viewer' },
          })),
          streamState: { topic: 'Topic' },
          recentMessages: [{ role: 'assistant' as const, content: 'Answer' }],
        };
        const batch = buildCommentDecisions(input, ceiling, { responsePlan });
        const tooLarge = buildCommentDecisions(input, ceiling + 1, {
          responsePlan,
        });
        expect(Object.keys(batch.request.questions).length).toBeLessThanOrEqual(
          limit
        );
        expect(Object.keys(tooLarge.request.questions).length).toBeGreaterThan(
          limit
        );
      }
    }
  );

  it.each(['microsoft', 'typesafe', 'openrouter'] as const)(
    'retains the 50-comment cap for %s',
    (transport) => {
      for (const responsePlan of [false, true]) {
        expect(resolveMaxComments(transport, undefined, responsePlan)).toBe(20);
        expect(resolveMaxComments(transport, 50, responsePlan)).toBe(50);
        expect(() => resolveMaxComments(transport, 51, responsePlan)).toThrow(
          'between 1 and 50'
        );
      }
    }
  );

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid maxComments %s',
    (value) => {
      expect(() => resolveMaxComments('cloudflare', value, true)).toThrow(
        'maxComments'
      );
    }
  );

  it.each(['typesafe', 'openrouter'] as const)(
    'validates %s at creation before any request',
    (transport) => {
      const fetchFn = vi.fn();
      for (const responsePlan of [false, true, {}]) {
        expect(() =>
          createDecisionsCommentAnalysisProvider({
            transport,
            apiKey: 'test-key',
            maxComments: 51,
            responsePlan,
            fetch: fetchFn,
          })
        ).toThrow('maxComments');
        expect(() =>
          createDecisionsCommentAnalysisProvider({
            transport,
            apiKey: 'test-key',
            maxComments: 50,
            responsePlan,
            fetch: fetchFn,
          })
        ).not.toThrow();
      }
      expect(fetchFn).not.toHaveBeenCalled();
    }
  );
});
