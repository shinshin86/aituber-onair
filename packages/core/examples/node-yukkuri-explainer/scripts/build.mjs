import { build } from 'esbuild';

await build({
  entryPoints: { gen: 'src/gen/cli.ts' },
  outdir: 'dist',
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  logLevel: 'info',
  packages: 'external',
});
