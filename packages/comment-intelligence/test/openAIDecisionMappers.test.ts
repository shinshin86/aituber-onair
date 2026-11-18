import { describe, expect, it } from 'vitest';
import {
  mapOpenAIDecisionRequest,
  mapOpenAIDecisionResponse,
} from '../src/jev/openAITransport.js';
import { mapGoogleDecisionRequest } from '../src/jev/googleTransport.js';
import { decisionRequest } from './decisionFixtures.js';

describe('OpenAI Decisions request mapping', () => {
  it('maps all three question types without changing the input', () => {
    const original = structuredClone(decisionRequest);
    expect(mapOpenAIDecisionRequest(decisionRequest, 'gpt-6-luna')).toEqual({
      model: 'gpt-6-luna',
      input: JSON.stringify(decisionRequest.state),
      questions: [
        {
          name: 'question',
          type: 'choice',
          instructions: 'Is this a question?',
          choices: [
            { value: 'yes', description: 'Asks a question' },
            { value: 'no', description: 'Does not ask' },
            { value: 'uncertain', description: 'Unclear' },
          ],
        },
        {
          name: 'responseDepth',
          type: 'score',
          instructions: 'How much thought is needed?',
          levels: [
            { label: '0', description: 'One line' },
            { label: '1', description: 'Quick reply' },
            { label: '2', description: 'Careful reply' },
          ],
        },
        {
          name: 'hostile',
          type: 'predicate',
          instructions:
            'Is it hostile?\nTrue: Insults someone\nFalse: Respectful',
        },
      ],
    });
    expect(decisionRequest).toEqual(original);
  });

  it.each(['plain text', null, ['a', 'b'], { nested: { number: 1 } }])(
    'maps shared input %j',
    (state) => {
      expect(
        mapOpenAIDecisionRequest({ ...decisionRequest, state }, 'model').input
      ).toBe(typeof state === 'string' ? state : JSON.stringify(state));
    }
  );

  it.each([1, 11])('rejects a score rubric with %s levels', (count) => {
    expect(() =>
      mapOpenAIDecisionRequest(
        {
          state: '',
          questions: {
            score: {
              type: 'score',
              instructions: 'Rate this',
              criteria: Array(count).fill('Level'),
            },
          },
        },
        'model'
      )
    ).toThrow(/^Decisions OpenAI score questions require 2 to 10 levels$/);
  });

  it('sanitizes unserializable input errors', () => {
    const state = {
      toJSON() {
        throw new Error('private input');
      },
    };
    expect(() =>
      mapOpenAIDecisionRequest({ ...decisionRequest, state }, 'model')
    ).toThrow(/^Decisions input must be JSON-serializable$/);
  });
});

describe('OpenAI Decisions response mapping', () => {
  it('keys answers by name, not array order, and maps numeric level indices', () => {
    const response = {
      answers: [
        { name: 'hostile', type: 'predicate', probability: 0.8 },
        {
          name: 'responseDepth',
          type: 'score',
          score: 1.8,
          confidence: 0.7,
          probabilities: [
            { value: 2, label: '2', probability: 0.8 },
            { value: 1, label: '1', probability: 0.2 },
          ],
        },
        {
          name: 'question',
          type: 'choice',
          choice: 'yes',
          confidence: 0.9,
          probabilities: [{ value: 'yes', probability: 1 }],
        },
        { name: 'refused', type: 'refusal' },
      ],
    };
    const original = structuredClone(response);
    expect(mapOpenAIDecisionResponse(response, decisionRequest)).toEqual({
      answers: {
        hostile: { type: 'noul', noul: 0.8 },
        responseDepth: {
          type: 'score',
          score: 1.8,
          confidence: 0.7,
          probabilities: { '1': 0.2, '2': 0.8 },
        },
        question: {
          type: 'choice',
          choice: 'yes',
          confidence: 0.9,
          probabilities: { yes: 1 },
        },
        refused: { type: 'refusal' },
      },
    });
    expect(response).toEqual(original);
  });

  it('does not invent missing confidence or probabilities', () => {
    const result = mapOpenAIDecisionResponse(
      {
        answers: [{ name: 'q', type: 'choice', choice: 'yes' }],
      },
      decisionRequest
    );
    expect(result.answers.q).toEqual({
      type: 'choice',
      choice: 'yes',
      confidence: undefined,
      probabilities: undefined,
    });
  });

  it.each([
    [{ value: 1 }, '1'],
    [{ value: '1' }, '1'],
    [{ value: '01' }, '1'],
    [{ value: 0.5, label: '2' }, '2'],
    [{ value: 'high', label: '2' }, '2'],
    [{ label: '1' }, '1'],
    [{ value: 99, label: '1' }, '1'],
    [{ value: 0, label: '2' }, '0'],
    [{ value: '2', label: '0' }, '2'],
  ] satisfies Array<[Record<string, unknown>, string]>)(
    'resolves score level %j to %s',
    (entry, key) => {
      const result = mapOpenAIDecisionResponse(
        {
          answers: [
            {
              name: 'responseDepth',
              type: 'score',
              score: Number(key),
              probabilities: [{ ...entry, probability: 1 }],
            },
          ],
        },
        decisionRequest
      );
      expect(result.answers.responseDepth).toMatchObject({
        probabilities: { [key]: 1 },
      });
    }
  );

  it.each([
    [{ value: 1 }, { value: '1' }],
    [{ value: '01' }, { label: '1' }],
    [{ value: 'high', label: '2' }, { value: 2 }],
  ])('rejects duplicate levels after normalizing %j', (first, second) => {
    expect(() =>
      mapOpenAIDecisionResponse(
        {
          answers: [
            {
              name: 'responseDepth',
              type: 'score',
              score: 1,
              probabilities: [first, second].map((entry) => ({
                ...entry,
                probability: 0.5,
              })),
            },
          ],
        },
        decisionRequest
      )
    ).toThrow(/^Decisions OpenAI returned invalid answers$/);
  });

  it.each([
    { label: '3' },
    { value: 3, label: '3' },
    { label: 'quick' },
    { label: 1 },
    { value: '1.5' },
    { value: '1.0' },
    { value: true },
  ])('rejects score entries with no valid level %j', (entry) => {
    expect(() =>
      mapOpenAIDecisionResponse(
        {
          answers: [
            {
              name: 'responseDepth',
              type: 'score',
              score: 1,
              probabilities: [{ ...entry, probability: 1 }],
            },
          ],
        },
        decisionRequest
      )
    ).toThrow(/^Decisions OpenAI returned invalid answers$/);
  });

  it('validates against the level count of the matching question', () => {
    const request = {
      state: '',
      questions: {
        short: {
          type: 'score' as const,
          instructions: 'Rate',
          criteria: ['Low', 'High'],
        },
        long: {
          type: 'score' as const,
          instructions: 'Rate',
          criteria: Array(10).fill('Level'),
        },
      },
    };
    expect(
      mapOpenAIDecisionResponse(
        {
          answers: [
            {
              name: 'long',
              type: 'score',
              score: 9,
              probabilities: [{ value: '9', probability: 1 }],
            },
          ],
        },
        request
      ).answers.long
    ).toMatchObject({ probabilities: { '9': 1 } });
    expect(() =>
      mapOpenAIDecisionResponse(
        {
          answers: [
            {
              name: 'short',
              type: 'score',
              score: 1,
              probabilities: [{ value: 2, probability: 1 }],
            },
          ],
        },
        request
      )
    ).toThrow(/^Decisions OpenAI returned invalid answers$/);
  });

  it('preserves prototype-like keys as data', () => {
    const result = mapOpenAIDecisionResponse(
      {
        answers: [{ name: '__proto__', type: 'refusal' }],
      },
      decisionRequest
    );
    expect(Object.keys(result.answers)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(result.answers)).toBe(Object.prototype);
    expect(result.answers.__proto__).toEqual({ type: 'refusal' });
  });

  it.each([
    null,
    {},
    { answers: {} },
    { answers: [null] },
    { answers: [{ type: 'refusal' }] },
    { answers: [{ name: '', type: 'refusal' }] },
    { answers: [{ name: 'q', type: 'unknown' }] },
    {
      answers: [
        { name: 'q', type: 'refusal' },
        { name: 'q', type: 'refusal' },
      ],
    },
    { answers: [{ name: 'q', type: 'choice', probabilities: {} }] },
    { answers: [{ name: 'q', type: 'choice', probabilities: [null] }] },
    {
      answers: [
        {
          name: 'q',
          type: 'choice',
          probabilities: [{ value: 1, probability: 1 }],
        },
      ],
    },
    {
      answers: [
        {
          name: 'q',
          type: 'choice',
          probabilities: [
            { value: 'yes', probability: 0.5 },
            { value: 'yes', probability: 0.5 },
          ],
        },
      ],
    },
    ...[-1, 3, 10, 0.5, Number.NaN, 'not-a-level'].map((value) => ({
      answers: [
        {
          name: 'responseDepth',
          type: 'score',
          probabilities: [{ value, probability: 1 }],
        },
      ],
    })),
  ])('rejects malformed or ambiguous response structures %j', (response) => {
    expect(() => mapOpenAIDecisionResponse(response, decisionRequest)).toThrow(
      /^Decisions OpenAI returned invalid answers$/
    );
  });
});

describe('Google Decisions request mapping', () => {
  it('renames only noul criteria and serializes the shared state', () => {
    const original = structuredClone(decisionRequest);
    const mapped = mapGoogleDecisionRequest(
      decisionRequest,
      'gemini-decision-1'
    );
    expect(mapped.input).toBe(JSON.stringify(decisionRequest.state));
    expect(mapped.model).toBe('gemini-decision-1');
    expect(mapped.questions).toEqual({
      ...decisionRequest.questions,
      hostile: {
        type: 'noul',
        instructions: 'Is it hostile?',
        criteria: {
          true_description: 'Insults someone',
          false_description: 'Respectful',
        },
      },
    });
    expect(decisionRequest).toEqual(original);
    expect(
      mapGoogleDecisionRequest({ ...decisionRequest, state: 'text' }, 'model')
        .input
    ).toBe('text');
  });
});
