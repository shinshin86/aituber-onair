import { performance } from 'node:perf_hooks';
import {
  createContaminator,
  createContextFingerprint,
  createVirtualNoiseBrain,
} from '../dist/esm/index.js';
import { loadMaleCnsNoiseBrain } from '../dist/esm/node.js';

const started = performance.now();
const brain = process.env.MALECNS_DATA_DIR
  ? await loadMaleCnsNoiseBrain({
      dataDir: process.env.MALECNS_DATA_DIR,
      seed: 42,
    })
  : createVirtualNoiseBrain({ seed: 42 });
const loadMs = performance.now() - started;
const turn = {
  systemPrompt: '少し気まぐれなAITuberです。',
  messages: [{ role: 'user', content: '今日も無難なコメントだね' }],
  draft: 'コメントありがとう。今日も楽しく配信していきます。',
  forceTilt: true,
};
const signals = {
  context: createContextFingerprint(turn),
  diagnosis: { score: 0.8, issues: [] },
  intensity: 0.4,
  mode: 'performer',
};
const durations = [];
for (let i = 0; i < 5; i++) {
  const t = performance.now();
  await brain.modulate(signals);
  durations.push(performance.now() - t);
}
// Offline plumbing example. This deterministic stub is NOT an LLM quality comparison.
// Supply your own RewriteModel to compare actual rewritten language.
const model = {
  async generate() {
    return turn.draft;
  },
};
for (const [name, modulator] of [
  ['disabled', undefined],
  ['enabled', brain],
]) {
  const output = await createContaminator({
    model,
    modulator,
    intensity: 0.4,
    fallbackToDraftOnQualityFail: true,
  }).contaminate(turn);
  console.log(
    name,
    JSON.stringify({
      text: output.text,
      plan: output.plan,
      modulation: output.modulation,
      skipped: output.skipped,
    })
  );
}
console.log(
  JSON.stringify({
    neurons: brain.neuronCount,
    edges: brain.edgeCount,
    loadMs,
    simulationMs: durations,
    rssMiB: process.memoryUsage().rss / 1048576,
    arrayBuffersMiB: process.memoryUsage().arrayBuffers / 1048576,
    activeNeurons: brain.getActivitySnapshot().filter((v) => v > 0).length,
  })
);
