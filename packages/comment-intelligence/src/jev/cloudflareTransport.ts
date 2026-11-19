import {
  createDecisionsHttpTransport,
  requireDecisionsText,
} from './httpTransport.js';
import type {
  CloudflareDecisionsBinding,
  DecisionsRequestHandler,
} from './types.js';

export function createCloudflareDecisionTransport(options: {
  apiKey?: string;
  accountId?: string;
  binding?: CloudflareDecisionsBinding;
  model?: string;
  fetch?: typeof globalThis.fetch;
}): DecisionsRequestHandler {
  const model = requireDecisionsText(
    options.model ?? 'clef',
    'Decisions Cloudflare model must not be empty'
  );
  if (!['clef', 'clef-flash', 'clef-omni'].includes(model))
    throw new Error(
      'Decisions Cloudflare model must be clef, clef-flash, or clef-omni'
    );
  const fullModel = `@cf/cloudflare/${model}`;
  const binding = options.binding;
  if (binding !== undefined) {
    if (options.apiKey !== undefined || options.accountId !== undefined)
      throw new Error(
        'Decisions Cloudflare requires either binding or apiKey with accountId, not both'
      );
    if (!binding || typeof binding.run !== 'function')
      throw new Error(
        'Decisions Cloudflare binding must provide a run function'
      );
    return async (request, signal) => {
      let onAbort: () => void = () => {};
      const aborted = new Promise<never>((_resolve, reject) => {
        onAbort = () =>
          reject(new Error('Decisions Cloudflare request aborted'));
        signal.addEventListener('abort', onAbort, { once: true });
      });
      let response: unknown;
      try {
        if (signal.aborted) throw new Error();
        // The binding operation continues; cancellation only ends our wait.
        response = await Promise.race([
          Promise.resolve().then(() => {
            if (signal.aborted) throw new Error();
            return binding.run(fullModel, { model, ...request });
          }),
          aborted,
        ]);
      } catch {
        throw new Error('Decisions Cloudflare request failed or was aborted');
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
      return unwrapCloudflareResponse(response);
    };
  }
  const apiKey = requireDecisionsText(
    options.apiKey,
    'Decisions Cloudflare requires an API key and accountId'
  );
  const accountId = requireDecisionsText(
    options.accountId,
    'Decisions Cloudflare requires an API key and accountId'
  );
  if (!/^[A-Za-z0-9_-]+$/.test(accountId))
    throw new Error(
      'Decisions Cloudflare accountId must be a single account identifier'
    );
  const post = createDecisionsHttpTransport({
    endpoint: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${fullModel}`,
    headers: { Authorization: `Bearer ${apiKey}` },
    label: 'Cloudflare',
    fetch: options.fetch,
  });
  return async (request, signal) =>
    unwrapCloudflareResponse(await post({ model, ...request }, signal));
}

function unwrapCloudflareResponse(response: unknown): unknown {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const envelope = response as Record<string, unknown>;
    if (envelope.success === false)
      throw new Error('Decisions Cloudflare request was unsuccessful');
    if (Object.prototype.hasOwnProperty.call(envelope, 'result'))
      return envelope.result;
  }
  return response;
}
