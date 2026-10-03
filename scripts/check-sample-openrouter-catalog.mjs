import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const coreSamples = [
  'react-basic',
  'react-inochi2d-app',
  'react-live2d-app',
  'react-mesh-avatar-app',
  'react-pet-app',
  'react-pngtuber-app',
  'react-psd-app',
  'react-purupuru-app',
  'react-single-image-avatar-app',
  'react-vrm-app',
].map((name) => `packages/core/examples/${name}`);
const chatSample = 'packages/chat/examples/react-basic';

function checkCopies(relativePath, samples) {
  const source = `${samples[0]}/${relativePath}`;
  const expected = readFileSync(new URL(source, root), 'utf8');
  for (const sample of samples.slice(1)) {
    const target = `${sample}/${relativePath}`;
    assert.equal(
      readFileSync(new URL(target, root), 'utf8'),
      expected,
      `${target} has drifted from ${source}`,
    );
  }
}

// Samples are independently usable, so shared behavior is copied locally.
const catalogDirectory = 'src/openrouterCatalog';
const catalogFiles = readdirSync(
  new URL(`${chatSample}/${catalogDirectory}`, root),
).sort();
for (const sample of coreSamples) {
  assert.deepEqual(
    readdirSync(new URL(`${sample}/${catalogDirectory}`, root)).sort(),
    catalogFiles,
    `${sample}/${catalogDirectory} has missing or extra files`,
  );
}
for (const file of catalogFiles) {
  checkCopies(`src/openrouterCatalog/${file}`, [chatSample, ...coreSamples]);
}

checkCopies('src/lib/openRouterRuntime.ts', coreSamples);

console.log(
  'Checked OpenRouter catalog and runtime copies in all 11 React samples.',
);
