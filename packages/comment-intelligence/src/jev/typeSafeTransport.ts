import type { JevDecisionRequest } from './types.js';

export const TYPESAFE_SYSTEMONE_ENDPOINT =
  'https://api.typesafe.ai/v1/systemone';

/** Transport-specific authentication, endpoint, and response handling. */
export function createTypeSafeDecisionTransport(options: {
  apiKey: string;
  model: string;
  fetch?: typeof globalThis.fetch;
}) {
  return async (request: JevDecisionRequest, signal: AbortSignal) => {
    const fetchFn = options.fetch ?? globalThis.fetch;
    if (!fetchFn) throw new Error('Jev requires a fetch implementation');
    let response: Response;
    try {
      response = await fetchFn(TYPESAFE_SYSTEMONE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: options.model, ...request }),
        signal,
      });
    } catch {
      // Do not propagate transport errors that might contain credentials/body.
      throw new Error('Jev TypeSafe AI request failed or was aborted');
    }
    if (!response.ok) {
      throw new Error(
        `Jev TypeSafe AI request failed (HTTP ${response.status})`
      );
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new Error('Jev TypeSafe AI returned invalid JSON');
    }
  };
}
