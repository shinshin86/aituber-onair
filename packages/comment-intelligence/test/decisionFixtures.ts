import type { DecisionsRequest } from '../src/jev/types.js';

export const decisionInput = {
  comments: [
    {
      id: 'a',
      text: 'How does it work?',
      timestamp: 1000,
      author: { id: 'private-viewer-id', name: 'Private Viewer' },
    },
  ],
  streamState: { topic: 'Speech synthesis' },
  recentMessages: [{ role: 'assistant' as const, content: 'It runs locally.' }],
};

export const decisionRequest: DecisionsRequest = {
  state: { comments: [{ text: 'How does it work?' }] },
  questions: {
    question: {
      type: 'choice',
      instructions: 'Is this a question?',
      criteria: {
        yes: 'Asks a question',
        no: 'Does not ask',
        uncertain: 'Unclear',
      },
    },
    responseDepth: {
      type: 'score',
      instructions: 'How much thought is needed?',
      criteria: ['One line', 'Quick reply', 'Careful reply'],
    },
    hostile: {
      type: 'noul',
      instructions: 'Is it hostile?',
      criteria: { true: 'Insults someone', false: 'Respectful' },
    },
  },
};

export function decisionAnswer(type: string) {
  if (type === 'noul') return { type, noul: 0.9 };
  if (type === 'score')
    return { type, score: 1, confidence: 0.9, probabilities: { '1': 1 } };
  return {
    type: 'choice',
    choice: 'yes',
    confidence: 0.9,
    probabilities: { yes: 1 },
  };
}

export function decisionsResponse(questions: Record<string, { type: string }>) {
  return {
    answers: Object.fromEntries(
      Object.entries(questions).map(([key, question]) => [
        key,
        decisionAnswer(question.type),
      ])
    ),
  };
}

export function openAIResponse(
  questions: Array<{ name: string; type: string }>
) {
  return {
    answers: questions.map(({ name, type }) => {
      if (type === 'predicate') return { name, type, probability: 0.9 };
      if (type === 'score')
        return {
          name,
          type,
          score: 1,
          confidence: 0.9,
          probabilities: [{ value: 1, label: '1', probability: 1 }],
        };
      return {
        name,
        type,
        choice: 'yes',
        confidence: 0.9,
        probabilities: [{ value: 'yes', probability: 1 }],
      };
    }),
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}
