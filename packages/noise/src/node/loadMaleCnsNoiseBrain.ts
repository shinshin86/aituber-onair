import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  createGraphNoiseBrain,
  type NoiseBrain,
  type NoiseBrainOptions,
} from '../brain/createNoiseBrain.js';
import { decodeBrainGraph, validateMaleCnsManifest } from '../brain/graph.js';

/** Explicit local load only. Never downloads data or runs preprocessing. */
export async function loadMaleCnsNoiseBrain(
  options: NoiseBrainOptions & { dataDir: string }
): Promise<NoiseBrain> {
  const manifest: unknown = JSON.parse(
    await fs.readFile(resolve(options.dataDir, 'manifest.json'), 'utf8')
  );
  validateMaleCnsManifest(manifest);
  const bytes = await fs.readFile(resolve(options.dataDir, 'graph.bin'));
  if (createHash('sha256').update(bytes).digest('hex') !== manifest.graphSha256)
    throw new Error('MaleCNS graph checksum mismatch');
  // readFile usually owns a dedicated buffer for large files; avoid copying it.
  const buffer =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? (bytes.buffer as ArrayBuffer)
      : (bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer);
  const graph = decodeBrainGraph(buffer);
  if (
    graph.bodyIds.length !== manifest.neuronCount ||
    graph.targets.length !== manifest.edgeCount
  )
    throw new Error('MaleCNS graph count mismatch');
  return createGraphNoiseBrain(graph, { ...options, provider: 'malecns' });
}
