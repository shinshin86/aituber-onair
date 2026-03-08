import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(process.cwd());
const distDir = resolve(root, "dist");

await mkdir(distDir, { recursive: true });

await build({
  entryPoints: [resolve(root, "src/index.ts")],
  outfile: resolve(distDir, "index.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: true,
  logLevel: "info",
});

await writeFile(
  resolve(distDir, "index.js"),
  "import { createRequire } from 'node:module';\n\nconst require = createRequire(import.meta.url);\nrequire('./index.cjs');\n",
  "utf8",
);
