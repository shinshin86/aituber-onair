import { defineConfig } from 'tsup';

const bundledWorkerPackages = [
  '@huggingface/transformers',
  '@huggingface/jinja',
  '@huggingface/tokenizers',
  'onnxruntime-common',
  'onnxruntime-web',
];

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    shims: true,
    outDir: 'dist',
  },
  {
    entry: {
      'local-whisper.worker': 'src/providers/local-whisper.worker.ts',
    },
    format: ['esm'],
    platform: 'browser',
    noExternal: bundledWorkerPackages,
    splitting: false,
    minify: true,
    dts: false,
    outDir: 'dist',
  },
]);
