import {
  createDecisionsHttpTransport,
  requireDecisionsText,
  serializeDecisionInput,
} from './httpTransport.js';
import type { DecisionsRequest, DecisionsRequestHandler } from './types.js';

export const GOOGLE_DECISIONS_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/decisions';

export function mapGoogleDecisionRequest(
  request: DecisionsRequest,
  model: string
) {
  return {
    model,
    input: serializeDecisionInput(request.state),
    questions: Object.fromEntries(
      Object.entries(request.questions).map(([name, question]) => [
        name,
        question.type === 'noul'
          ? {
              ...question,
              criteria: {
                true_description: question.criteria.true,
                false_description: question.criteria.false,
              },
            }
          : question,
      ])
    ),
  };
}

export function createGoogleDecisionTransport(options: {
  apiKey?: string;
  model?: string;
  fetch?: typeof globalThis.fetch;
}): DecisionsRequestHandler {
  const apiKey = requireDecisionsText(
    options.apiKey,
    'Decisions Google requires an API key'
  );
  const model = requireDecisionsText(
    options.model ?? 'gemini-decision-1',
    'Decisions Google model must not be empty'
  );
  const post = createDecisionsHttpTransport({
    endpoint: GOOGLE_DECISIONS_ENDPOINT,
    headers: { 'x-goog-api-key': apiKey },
    label: 'Google',
    fetch: options.fetch,
  });
  return (request, signal) =>
    post(mapGoogleDecisionRequest(request, model), signal);
}
