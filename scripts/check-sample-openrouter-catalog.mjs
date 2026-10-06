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

// The shared picker ships without styles, so every sample must style each
// element it renders. Unstyled controls fall back to browser defaults and
// break the surrounding settings layout, which DOM tests cannot detect.
const pickerSource = readFileSync(
  new URL(`${chatSample}/${catalogDirectory}/OpenRouterModelPicker.tsx`, root),
  'utf8',
);
const pickerElements = [
  ...pickerSource.matchAll(/className=(?:"([^"]+)"|\{`([^`$]+))/g),
].map((match) => (match[1] ?? match[2]).trim().split(/\s+/));
assert.ok(pickerElements.length > 0, 'No picker class names found');

function listStyleSources(sample) {
  const directories = ['src', 'src/styles'];
  const sources = [];
  for (const directory of directories) {
    let entries = [];
    try {
      entries = readdirSync(new URL(`${sample}/${directory}`, root));
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.endsWith('.css'))
        sources.push(`${sample}/${directory}/${entry}`);
    }
  }
  // The chat sample keeps its selector styles inline in the component.
  if (sample === chatSample) {
    sources.push(`${sample}/src/components/ProviderSelector.tsx`);
  }
  return sources;
}

for (const sample of [chatSample, ...coreSamples]) {
  const styles = listStyleSources(sample)
    .map((source) => readFileSync(new URL(source, root), 'utf8'))
    .join('\n');
  for (const classNames of pickerElements) {
    assert.ok(
      classNames.some((name) =>
        new RegExp(`\\.${name}(?![\\w-])`).test(styles),
      ),
      `${sample} does not style OpenRouter picker element .${classNames.join('.')}`,
    );
  }
}

console.log(
  'Checked OpenRouter catalog and runtime copies and picker styles in all 11 React samples.',
);
