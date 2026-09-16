// Node-only preprocessing. Apache Arrow reads bounded record batches from a file.
import { createReadStream, createWriteStream } from 'node:fs';
import {
  open,
  mkdir,
  readFile,
  writeFile,
  access,
  rename,
} from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  RecordBatchReader,
  compressionRegistry,
  CompressionType,
} from 'apache-arrow';
import lz4 from 'lz4js';

compressionRegistry.set(CompressionType.LZ4_FRAME, { decode: lz4.decompress });
const { values } = parseArgs({
  options: {
    source: { type: 'string' },
    out: { type: 'string' },
    download: { type: 'boolean', default: false },
    signs: { type: 'string' },
  },
});
if (!values.source || !values.out)
  throw new Error(
    'Usage: --source <raw-directory> --out <new-output-directory> [--download] [--signs signs.json]'
  );
const source = resolve(values.source);
const out = resolve(values.out);
await mkdir(source, { recursive: true });
// Refuse to overwrite or mix versions. Use a new directory for each preparation.
await mkdir(out);
const names = [
  'body-annotations-male-cns-v1.0-minconf-0.5.feather',
  'body-neurotransmitters-male-cns-v1.0.feather',
  'connectome-weights-male-cns-v1.0-minconf-0.5.feather',
];
for (const name of names) {
  try {
    await access(join(source, name));
  } catch {
    if (!values.download)
      throw new Error(
        `Missing source file: ${name}; pass --download or supply it locally`
      );
    console.log(`Downloading ${name}`);
    const response = await fetch(
      `https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/${name}`
    );
    if (!response.ok || !response.body)
      throw new Error(`Download failed: HTTP ${response.status}`);
    const temporary = join(source, `${name}.partial`);
    await pipeline(
      Readable.fromWeb(response.body),
      createWriteStream(temporary)
    );
    await rename(temporary, join(source, name));
  }
}
const signs = values.signs
  ? JSON.parse(await readFile(values.signs, 'utf8'))
  : {
      acetylcholine: 1,
      gaba: -1,
      glutamate: -1,
      histamine: -1,
      dopamine: 0,
      serotonin: 0,
      octopamine: 0,
      unknown: 0,
    };
if (
  !signs ||
  Array.isArray(signs) ||
  !Object.values(signs).every((v) => v === -1 || v === 0 || v === 1)
)
  throw new Error('Signs must map transmitter names to -1, 0, or 1');
async function* batches(name) {
  const file = await open(join(source, name));
  const reader = await RecordBatchReader.from(file);
  try {
    for await (const batch of reader) yield batch;
  } finally {
    await reader.cancel();
    await file.close().catch(() => {});
  }
}
function column(batch, name) {
  const value = batch.getChild(name);
  if (!value) throw new Error(`Missing Feather column: ${name}`);
  return value;
}
function id(value) {
  const n = Number(value);
  if (value === null || !Number.isSafeInteger(n) || n < 0 || n > 0xffffffff)
    throw new Error('Body ID does not fit uint32');
  return n;
}
const index = new Map();
const neurons = [];
console.log('Reading annotations');
for await (const batch of batches(names[0])) {
  const ids = column(batch, 'bodyId');
  const classes = column(batch, 'superclass');
  const types = column(batch, 'type');
  const sides = column(batch, 'somaSide');
  const positions = column(batch, 'somaLocation');
  for (let row = 0; row < batch.numRows; row++) {
    const superclass = String(classes.get(row) ?? '').trim();
    if (!superclass || /glia/i.test(superclass)) continue;
    const bodyId = id(ids.get(row));
    if (index.has(bodyId)) throw new Error('Duplicate retained body ID');
    index.set(bodyId, neurons.length);
    const position = positions.get(row);
    neurons.push({
      bodyId,
      superclass,
      type: types.get(row) ?? '',
      side: sides.get(row) ?? '',
      neurotransmitter: 'unknown',
      position: position ? Array.from(position, Number) : null,
    });
  }
}
const n = neurons.length;
if (n !== 166700)
  throw new Error(
    `MaleCNS v1.0 retained neuron mismatch: ${n}; expected 166700`
  );
for await (const batch of batches(names[1])) {
  const ids = column(batch, 'body');
  const nts = column(batch, 'consensus_nt');
  for (let row = 0; row < batch.numRows; row++) {
    const i = index.get(id(ids.get(row)));
    if (i !== undefined)
      neurons[i].neurotransmitter = String(
        nts.get(row) ?? 'unknown'
      ).toLowerCase();
  }
}
const offsets = new Uint32Array(n + 1);
const incoming = new Float64Array(n);
let edges = 0;
async function scanEdges(visit) {
  for await (const batch of batches(names[2])) {
    const pre = column(batch, 'body_pre');
    const post = column(batch, 'body_post');
    const weight = column(batch, 'weight');
    for (let row = 0; row < batch.numRows; row++) {
      const a = index.get(id(pre.get(row)));
      const b = index.get(id(post.get(row)));
      if (a === undefined || b === undefined) continue;
      const w = Number(weight.get(row));
      if (!Number.isFinite(w) || w < 0)
        throw new Error('Invalid synapse count');
      visit(a, b, w);
    }
  }
}
console.log('Connectivity pass 1: counts and incoming normalization');
await scanEdges((a, b, w) => {
  offsets[a + 1]++;
  edges++;
  incoming[b] += Math.abs(w * (signs[neurons[a].neurotransmitter] ?? 0));
});
if (edges !== 25582938)
  throw new Error(
    `MaleCNS v1.0 retained edge mismatch: ${edges}; expected 25582938`
  );
for (let i = 1; i <= n; i++) offsets[i] += offsets[i - 1];
const targets = new Uint32Array(edges);
const weights = new Float32Array(edges);
const cursor = offsets.slice(0, n);
console.log('Connectivity pass 2: outgoing adjacency');
await scanEdges((a, b, w) => {
  const edge = cursor[a]++;
  targets[edge] = b;
  weights[edge] =
    (w * (signs[neurons[a].neurotransmitter] ?? 0)) / (incoming[b] || 1);
});
const bodyIds = Uint32Array.from(neurons, (neuron) => neuron.bodyId);
let inputCount = 0;
let descendingCount = 0;
const flags = Uint32Array.from(neurons, (neuron) => {
  // Six neutral channels partition actual annotated visual feature populations.
  const channel = /^(LC4|LPLC2|LPLC1|LC10a)(?:$|[_-])/.test(neuron.type)
    ? inputCount++ % 6
    : 255;
  const descending = neuron.superclass === 'descending_neuron';
  if (descending) descendingCount++;
  return (
    (descending ? 1 : 0) |
    (neuron.side === 'L' ? 2 : neuron.side === 'R' ? 4 : 0) |
    (channel << 8)
  );
});
if (inputCount < 6 || !descendingCount)
  throw new Error('Annotated input/readout populations missing');
if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1)
  throw new Error('Little-endian preprocessing runtime required');
const graph = await open(join(out, 'graph.bin'), 'wx');
try {
  for (const array of [
    new Uint32Array([0x3142524e, 1, n, edges]),
    offsets,
    bodyIds,
    flags,
    targets,
    weights,
  ]) {
    const bytes = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength
    );
    let written = 0;
    while (written < bytes.length) {
      const result = await graph.write(bytes, written, bytes.length - written);
      if (!result.bytesWritten) throw new Error('Incomplete graph write');
      written += result.bytesWritten;
    }
  }
} finally {
  await graph.close();
}
// Optional geometry, not loaded by the simulator. NaN marks absent soma positions.
const positions = new Float32Array(n * 3).fill(Number.NaN);
for (let i = 0; i < n; i++) {
  const xyz = neurons[i].position;
  if (xyz?.length === 3 && xyz.every(Number.isFinite))
    positions.set(xyz, i * 3);
}
await writeFile(
  join(out, 'soma-positions.f32'),
  new Uint8Array(positions.buffer)
);
const dictionary = [];
const codes = new Map();
function intern(value) {
  if (!codes.has(value)) {
    codes.set(value, dictionary.length);
    dictionary.push(value);
  }
  return codes.get(value);
}
const metadata = {
  columns: ['type', 'superclass', 'side', 'neurotransmitter'],
  dictionary,
  neurons: neurons.map((v) =>
    [v.type, v.superclass, v.side, v.neurotransmitter].map(intern)
  ),
  positions: {
    file: 'soma-positions.f32',
    layout: 'xyz-float32-le',
    coordinates: 'MaleCNS EM voxels (8 nm)',
    missing: 'NaN',
    source: 'somaLocation',
  },
  inputPopulations: ['LC4', 'LPLC2', 'LPLC1', 'LC10a'],
  inputCount,
  descendingCount,
};
await writeFile(join(out, 'metadata.json'), JSON.stringify(metadata));
async function hash(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
const manifest = {
  formatVersion: 1,
  dataset: 'MaleCNS',
  version: 'v1.0',
  neuronCount: n,
  edgeCount: edges,
  graphSha256: await hash(join(out, 'graph.bin')),
  generatedAt: new Date().toISOString(),
  sourceFiles: await Promise.all(
    names.map(async (name) => ({
      name,
      sha256: await hash(join(source, name)),
    }))
  ),
  preprocessing: {
    retainedRule: 'annotated-superclass-non-glia',
    selfConnections: true,
    edgeThreshold: 0,
    normalization: 'incoming-absolute',
    transmitterSigns: signs,
  },
};
await writeFile(
  join(out, 'ATTRIBUTION.txt'),
  'MaleCNS v1.0, FlyEM (HHMI Janelia), University of Cambridge, MRC LMB, Google Research. CC BY 4.0. https://male-cns.janelia.org/\nDerived data: retained neurons, signed/normalized weights and compact adjacency. The simulation and conversation mapping are approximations.\n'
);
// Write the manifest last: its presence indicates completed preparation.
await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(
  JSON.stringify({
    neurons: n,
    edges,
    inputCount,
    descendingCount,
    graphBytes: 16 + 4 * (3 * n + 1 + 2 * edges),
    peakRssMiB: process.resourceUsage().maxRSS / 1024,
  })
);
