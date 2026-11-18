/** Shared HTTP handling for the new Decisions transports. */
export function createDecisionsHttpTransport(options: {
  endpoint: string;
  headers: Record<string, string>;
  label: string;
  fetch?: typeof globalThis.fetch;
}) {
  return async (body: unknown, signal: AbortSignal): Promise<unknown> => {
    const fetchFn = options.fetch ?? globalThis.fetch;
    if (!fetchFn) throw new Error('Decisions requires a fetch implementation');
    let response: Response;
    try {
      response = await fetchFn(options.endpoint, {
        method: 'POST',
        headers: { ...options.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
        // Do not forward provider credentials to a redirected endpoint.
        redirect: 'manual',
      });
    } catch {
      throw new Error(
        `Decisions ${options.label} request failed or was aborted`
      );
    }
    if (!response.ok || response.status < 200 || response.status >= 300)
      throw new Error(
        `Decisions ${options.label} request failed (HTTP ${response.status})`
      );
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new Error(`Decisions ${options.label} returned invalid JSON`);
    }
  };
}

export function requireDecisionsText(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value.trim();
}

export function serializeDecisionInput(state: unknown): string {
  try {
    const input = typeof state === 'string' ? state : JSON.stringify(state);
    if (typeof input === 'string') return input;
  } catch {
    // Serialization errors may include fragments of the input.
  }
  throw new Error('Decisions input must be JSON-serializable');
}
