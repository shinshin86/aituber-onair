import {
  createDecisionsHttpTransport,
  requireDecisionsText,
} from './httpTransport.js';
import type { DecisionsRequestHandler } from './types.js';

export const LIQUID_DECISIONS_ENDPOINT =
  'https://api.liquid.ai/decisions/v1/systemone';

export function createLiquidDecisionTransport(options: {
  apiKey?: string;
  model?: string;
  fetch?: typeof globalThis.fetch;
}): DecisionsRequestHandler {
  const apiKey = requireDecisionsText(
    options.apiKey,
    'Decisions Liquid requires an API key'
  );
  const model = requireDecisionsText(
    options.model ?? 'd1.1',
    'Decisions Liquid model must not be empty'
  );
  const post = createDecisionsHttpTransport({
    endpoint: LIQUID_DECISIONS_ENDPOINT,
    headers: { Authorization: `Bearer ${apiKey}` },
    label: 'Liquid',
    fetch: options.fetch,
  });
  return (request, signal) => post({ model, ...request }, signal);
}
