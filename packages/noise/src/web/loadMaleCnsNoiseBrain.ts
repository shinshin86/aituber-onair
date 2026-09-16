import {
  createGraphNoiseBrain,
  type NoiseBrain,
  type NoiseBrainOptions,
} from '../brain/createNoiseBrain.js';
import { decodeBrainGraph, validateMaleCnsManifest } from '../brain/graph.js';

/** Call inside a Worker. The developer must explicitly host the prepared files. */
export async function loadMaleCnsNoiseBrain(
  options: NoiseBrainOptions & { manifestUrl: string; signal?: AbortSignal }
): Promise<NoiseBrain> {
  const url = new URL(options.manifestUrl, globalThis.location?.href);
  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) throw new Error(`MaleCNS manifest HTTP ${response.status}`);
  const manifest: unknown = await response.json();
  validateMaleCnsManifest(manifest);
  const graphResponse = await fetch(new URL('graph.bin', url), {
    signal: options.signal,
  });
  if (!graphResponse.ok)
    throw new Error(`MaleCNS graph HTTP ${graphResponse.status}`);
  const buffer = await graphResponse.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const hex = Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
  if (hex !== manifest.graphSha256)
    throw new Error('MaleCNS graph checksum mismatch');
  const graph = decodeBrainGraph(buffer);
  if (
    graph.bodyIds.length !== manifest.neuronCount ||
    graph.targets.length !== manifest.edgeCount
  )
    throw new Error('MaleCNS graph count mismatch');
  return createGraphNoiseBrain(graph, { ...options, provider: 'malecns' });
}
