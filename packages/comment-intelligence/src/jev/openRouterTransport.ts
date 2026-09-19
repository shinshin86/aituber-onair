import type { JevDecisionRequest } from './types.js';

export const OPENROUTER_DECISIONS_ENDPOINT =
  'https://openrouter.ai/api/alpha/decisions';

/** Transport-specific authentication, endpoint, and response handling. */
export function createOpenRouterDecisionTransport(options: {
  apiKey: string;
  model: string;
  fetch?: typeof globalThis.fetch;
}) {
  return async (request: JevDecisionRequest, signal: AbortSignal) => {
    const fetchFn = options.fetch ?? globalThis.fetch;
    if (!fetchFn) throw new Error('Jev requires a fetch implementation');
    let response: Response;
    try {
      response = await fetchFn(OPENROUTER_DECISIONS_ENDPOINT, {
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
      throw new Error('Jev OpenRouter request failed or was aborted');
    }
    if (!response.ok) {
      throw new Error(
        `Jev OpenRouter request failed (HTTP ${response.status})`
      );
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new Error('Jev OpenRouter returned invalid JSON');
    }
  };
}
