import {
  createDecisionsHttpTransport,
  requireDecisionsText,
} from './httpTransport.js';
import type { DecisionsRequestHandler } from './types.js';

export function createMicrosoftDecisionTransport(options: {
  endpoint?: string;
  model?: string;
  apiKey?: string;
  bearerToken?: string;
  fetch?: typeof globalThis.fetch;
}): DecisionsRequestHandler {
  const endpoint = requireDecisionsText(
    options.endpoint,
    'Decisions Microsoft requires an HTTPS endpoint'
  );
  try {
    const url = new URL(endpoint);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
  } catch {
    throw new Error(
      'Decisions Microsoft requires an HTTPS endpoint without credentials, query, or fragment'
    );
  }
  const model = requireDecisionsText(
    options.model,
    'Decisions Microsoft requires a model deployment name'
  );
  if ((options.apiKey !== undefined) === (options.bearerToken !== undefined))
    throw new Error(
      'Decisions Microsoft requires exactly one of apiKey or bearerToken'
    );
  const headers: Record<string, string> =
    options.apiKey !== undefined
      ? {
          'api-key': requireDecisionsText(
            options.apiKey,
            'Decisions Microsoft requires a non-empty API key'
          ),
        }
      : {
          Authorization: `Bearer ${requireDecisionsText(options.bearerToken, 'Decisions Microsoft requires a non-empty bearer token')}`,
        };
  const post = createDecisionsHttpTransport({
    endpoint: `${endpoint.replace(/\/+$/, '')}/providers/microsoft/v1/systemone`,
    headers,
    label: 'Microsoft',
    fetch: options.fetch,
  });
  return (request, signal) => post({ model, ...request }, signal);
}
