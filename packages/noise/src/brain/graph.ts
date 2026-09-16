/** Outgoing CSR. Weights are signed and normalized by incoming absolute sum. */
export interface BrainGraph {
  offsets: Uint32Array;
  targets: Uint32Array;
  weights: Float32Array;
  bodyIds: Uint32Array;
  /** Bits: 0 descending, 1 left, 2 right, 8..15 input channel (255 = none). */
  flags: Uint32Array;
}

export function validateBrainGraph(graph: BrainGraph): void {
  const n = graph.bodyIds.length;
  const e = graph.targets.length;
  if (
    !n ||
    graph.offsets.length !== n + 1 ||
    graph.flags.length !== n ||
    graph.weights.length !== e ||
    graph.offsets[0] !== 0 ||
    graph.offsets[n] !== e
  ) {
    throw new Error('Invalid brain graph dimensions');
  }
  for (let i = 0; i < n; i++) {
    if (graph.offsets[i] > graph.offsets[i + 1] || graph.offsets[i + 1] > e) {
      throw new Error('Invalid brain graph offsets');
    }
    const channel = (graph.flags[i] >>> 8) & 255;
    if (channel !== 255 && channel > 5)
      throw new Error('Invalid input channel');
  }
  for (let i = 0; i < e; i++) {
    if (
      graph.targets[i] >= n ||
      !Number.isFinite(graph.weights[i]) ||
      Math.abs(graph.weights[i]) > 1
    ) {
      throw new Error('Invalid brain graph edge');
    }
  }
}

/** Portable little-endian format: header, offsets, body IDs, flags, targets, weights. */
export function decodeBrainGraph(buffer: ArrayBuffer): BrainGraph {
  if (buffer.byteLength < 16) throw new Error('Truncated brain graph');
  const header = new DataView(buffer);
  if (
    header.getUint32(0, true) !== 0x3142524e ||
    header.getUint32(4, true) !== 1
  ) {
    throw new Error('Unsupported brain graph format');
  }
  const n = header.getUint32(8, true);
  const e = header.getUint32(12, true);
  if (buffer.byteLength !== 16 + 4 * (3 * n + 1 + 2 * e))
    throw new Error('Brain graph length mismatch');
  if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1)
    throw new Error('Little-endian runtime required');
  let offset = 16;
  const take = (length: number): Uint32Array => {
    const array = new Uint32Array(buffer, offset, length);
    offset += length * 4;
    return array;
  };
  const offsets = take(n + 1);
  const bodyIds = take(n);
  const flags = take(n);
  const targets = take(e);
  const weights = new Float32Array(buffer, offset, e);
  const graph = { offsets, bodyIds, flags, targets, weights };
  validateBrainGraph(graph);
  return graph;
}

export function encodeBrainGraph(graph: BrainGraph): ArrayBuffer {
  validateBrainGraph(graph);
  const n = graph.bodyIds.length;
  const e = graph.targets.length;
  const buffer = new ArrayBuffer(16 + 4 * (3 * n + 1 + 2 * e));
  const view = new DataView(buffer);
  let offset = 0;
  for (const array of [
    [0x3142524e, 1, n, e],
    graph.offsets,
    graph.bodyIds,
    graph.flags,
    graph.targets,
  ]) {
    for (const value of array) {
      view.setUint32(offset, value, true);
      offset += 4;
    }
  }
  for (const value of graph.weights) {
    view.setFloat32(offset, value, true);
    offset += 4;
  }
  return buffer;
}

export interface MaleCnsManifest {
  formatVersion: 1;
  dataset: 'MaleCNS';
  version: 'v1.0';
  neuronCount: number;
  edgeCount: number;
  graphSha256: string;
  sourceFiles: Array<{ name: string; sha256: string }>;
  generatedAt: string;
  preprocessing: {
    retainedRule: 'annotated-superclass-non-glia';
    selfConnections: true;
    edgeThreshold: 0;
    normalization: 'incoming-absolute';
    transmitterSigns: Record<string, number>;
  };
}

export function validateMaleCnsManifest(
  value: unknown
): asserts value is MaleCnsManifest {
  const m = value as MaleCnsManifest | null;
  const names = [
    'body-annotations-male-cns-v1.0-minconf-0.5.feather',
    'body-neurotransmitters-male-cns-v1.0.feather',
    'connectome-weights-male-cns-v1.0-minconf-0.5.feather',
  ];
  if (
    !m ||
    m.formatVersion !== 1 ||
    m.dataset !== 'MaleCNS' ||
    m.version !== 'v1.0' ||
    m.neuronCount !== 166700 ||
    m.edgeCount !== 25582938 ||
    typeof m.graphSha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(m.graphSha256) ||
    !Array.isArray(m.sourceFiles) ||
    m.sourceFiles.length !== 3 ||
    !names.every((name) => m.sourceFiles.some((file) => file?.name === name)) ||
    !m.sourceFiles.every(
      (f) => typeof f.name === 'string' && /^[a-f0-9]{64}$/.test(f.sha256)
    ) ||
    !Number.isFinite(Date.parse(m.generatedAt)) ||
    m.preprocessing?.retainedRule !== 'annotated-superclass-non-glia' ||
    m.preprocessing?.selfConnections !== true ||
    m.preprocessing?.edgeThreshold !== 0 ||
    m.preprocessing?.normalization !== 'incoming-absolute' ||
    !m.preprocessing.transmitterSigns ||
    !Object.values(m.preprocessing.transmitterSigns).every(
      (v) => v === -1 || v === 0 || v === 1
    )
  ) {
    throw new Error(
      'Invalid MaleCNS v1.0 manifest or retained network size (expected 166700 neurons, 25582938 edges)'
    );
  }
}
