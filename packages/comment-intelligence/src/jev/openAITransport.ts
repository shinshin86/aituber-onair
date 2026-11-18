import {
  createDecisionsHttpTransport,
  requireDecisionsText,
  serializeDecisionInput,
} from './httpTransport.js';
import type { DecisionsRequest, DecisionsRequestHandler } from './types.js';

export const OPENAI_DECISIONS_ENDPOINT = 'https://api.openai.com/v1/decisions';

type OpenAIQuestion = { name: string; instructions: string } & (
  | { type: 'predicate' }
  | { type: 'choice'; choices: Array<{ value: string; description: string }> }
  | { type: 'score'; levels: Array<{ label: string; description: string }> }
);

/** Pure internal mapper from the shared question contract to OpenAI. */
export function mapOpenAIDecisionRequest(
  request: DecisionsRequest,
  model: string
): {
  model: string;
  input: string;
  questions: OpenAIQuestion[];
} {
  return {
    model,
    input: serializeDecisionInput(request.state),
    questions: Object.entries(request.questions).map(
      ([name, question]): OpenAIQuestion => {
        const common = { name, instructions: question.instructions };
        switch (question.type) {
          case 'noul':
            return {
              ...common,
              type: 'predicate',
              instructions: `${question.instructions}\nTrue: ${question.criteria.true}\nFalse: ${question.criteria.false}`,
            };
          case 'choice':
            return {
              ...common,
              type: 'choice',
              choices: Object.entries(question.criteria).map(
                ([value, description]) => ({ value, description })
              ),
            };
          case 'score':
            if (question.criteria.length < 2 || question.criteria.length > 10)
              throw new Error(
                'Decisions OpenAI score questions require 2 to 10 levels'
              );
            return {
              ...common,
              type: 'score',
              levels: question.criteria.map((description, index) => ({
                label: String(index),
                description,
              })),
            };
        }
      }
    ),
  };
}

/** Pure internal mapper; semantic values are validated by the shared parser. */
export function mapOpenAIDecisionResponse(
  response: unknown,
  request: DecisionsRequest
): {
  answers: Record<string, unknown>;
} {
  const answers = record(response)?.answers;
  if (!Array.isArray(answers)) throw invalidResponse();
  const mapped = new Map<string, unknown>();
  for (const value of answers) {
    const answer = record(value);
    if (
      !answer ||
      typeof answer.name !== 'string' ||
      !answer.name ||
      mapped.has(answer.name)
    )
      throw invalidResponse();
    switch (answer.type) {
      case 'refusal':
        mapped.set(answer.name, { type: 'refusal' });
        break;
      case 'predicate':
        mapped.set(answer.name, { type: 'noul', noul: answer.probability });
        break;
      case 'choice':
      case 'score': {
        const question = request.questions[answer.name];
        mapped.set(answer.name, {
          type: answer.type,
          ...(answer.type === 'choice'
            ? { choice: answer.choice }
            : { score: answer.score }),
          confidence: answer.confidence,
          probabilities: mapProbabilities(
            answer.probabilities,
            answer.type,
            question?.type === 'score' ? question.criteria.length : undefined
          ),
        });
        break;
      }
      default:
        throw invalidResponse();
    }
  }
  return { answers: Object.fromEntries(mapped) };
}

function mapProbabilities(
  value: unknown,
  type: 'choice' | 'score',
  levels?: number
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw invalidResponse();
  if (type === 'score' && (levels === undefined || levels < 2 || levels > 10))
    throw invalidResponse();
  const probabilities = new Map<string, unknown>();
  for (const entry of value) {
    const item = record(entry);
    if (!item) throw invalidResponse();
    let key: string;
    if (type === 'choice') {
      if (typeof item.value !== 'string' || !item.value)
        throw invalidResponse();
      key = item.value;
    } else {
      key = scoreLevelKey(item, levels as number);
    }
    if (probabilities.has(key)) throw invalidResponse();
    probabilities.set(key, item.probability);
  }
  return Object.fromEntries(probabilities);
}

function scoreLevelKey(item: Record<string, unknown>, levels: number): string {
  // Prefer an in-range integer value, then digit-string value, then our label.
  const candidates = [
    item.value,
    typeof item.label === 'string' ? item.label : undefined,
  ];
  for (const value of candidates) {
    const index =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : Number.NaN;
    if (Number.isInteger(index) && index >= 0 && index < levels)
      return String(index);
  }
  throw invalidResponse();
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function invalidResponse() {
  return new Error('Decisions OpenAI returned invalid answers');
}

export function createOpenAIDecisionTransport(options: {
  apiKey?: string;
  model?: string;
  fetch?: typeof globalThis.fetch;
}): DecisionsRequestHandler {
  const apiKey = requireDecisionsText(
    options.apiKey,
    'Decisions OpenAI requires an API key'
  );
  const model = requireDecisionsText(
    options.model ?? 'gpt-6-luna',
    'Decisions OpenAI model must not be empty'
  );
  const post = createDecisionsHttpTransport({
    endpoint: OPENAI_DECISIONS_ENDPOINT,
    headers: { Authorization: `Bearer ${apiKey}` },
    label: 'OpenAI',
    fetch: options.fetch,
  });
  return async (request, signal) =>
    mapOpenAIDecisionResponse(
      await post(mapOpenAIDecisionRequest(request, model), signal),
      request
    );
}
