#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { initializeCanvas, readPsd } from 'ag-psd';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const defaultPsdPath = path.join(appRoot, 'local-assets', 'sample.psd');
const psdPath = path.resolve(process.argv[2] || defaultPsdPath);
const riggerPath = path.join(
  appRoot,
  'src',
  'vendor',
  'anime25drig',
  'rigger.js',
);

function createImageData(width, height) {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
}

initializeCanvas(
  (width, height) => ({
    width,
    height,
    getContext: () => ({
      createImageData,
    }),
  }),
  createImageData,
);

function loadRigger(source) {
  const sandbox = { self: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {
    filename: riggerPath,
  });
  return sandbox.self.Rigger;
}

function normalizeLayerName(rigger, name) {
  return rigger.baseName(name.replace(/_(l|r)$/i, ''));
}

function summarizeRig(rig, rigger, preprocessed) {
  const partsFound = [
    ...new Set(
      rig.layers.map((layer) => normalizeLayerName(rigger, layer.name)).sort(),
    ),
  ];
  return {
    psd: psdPath,
    canvas: rig.canvas,
    layerCount: rig.layers.length,
    anchorCount: Object.keys(rig.anchors).length,
    strandCount: rig.layers.reduce(
      (total, layer) => total + (layer.strands?.length || 0),
      0,
    ),
    partsFound,
    warnings: rig.warnings,
    synth: rig.synth,
    preprocessed,
  };
}

const [psdBuffer, riggerSource] = await Promise.all([
  readFile(psdPath),
  readFile(riggerPath, 'utf8'),
]);
const rigger = loadRigger(riggerSource);

if (!rigger) {
  throw new Error('Anime2.5DRig rigger runtime could not be loaded.');
}

const psd = readPsd(new Uint8Array(psdBuffer), {
  useImageData: true,
  skipThumbnail: true,
});
const preprocessed = rigger.cleanPsdLayers(psd);
const rig = rigger.buildRig(psd);
const summary = summarizeRig(rig, rigger, preprocessed);

console.log(JSON.stringify(summary, null, 2));
