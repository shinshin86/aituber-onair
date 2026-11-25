#!/usr/bin/env node
// Loads every built package entry point in plain Node.js (no bundler) to
// catch ESM output that only resolves under a bundler, such as extensionless
// relative specifiers or directory imports. Run after `npm run build`.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const packagesDir = path.join(rootDir, 'packages');

const collectTargets = (value, conditions, out) => {
  if (typeof value === 'string') {
    out.push({ condition: conditions.at(-1) ?? 'default', target: value });
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'types') continue;
    collectTargets(nested, [...conditions, key], out);
  }
};

const entriesOf = (pkg) => {
  const entries = [];
  if (pkg.exports) {
    const exportsMap =
      typeof pkg.exports === 'string' ? { '.': pkg.exports } : pkg.exports;
    for (const [subpath, value] of Object.entries(exportsMap)) {
      if (subpath.includes('*') || subpath.endsWith('package.json')) continue;
      const targets = [];
      collectTargets(value, [], targets);
      for (const { condition, target } of targets) {
        if (!target.endsWith('.js') && !target.endsWith('.cjs')) continue;
        entries.push({ subpath, condition, target });
      }
    }
  } else if (pkg.main) {
    entries.push({ subpath: '.', condition: 'main', target: pkg.main });
  }
  return entries;
};

const isUmd = (target) => target.includes('/umd/');

const failures = [];
let checked = 0;

for (const dirName of readdirSync(packagesDir).sort()) {
  const pkgPath = path.join(packagesDir, dirName, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.private || pkg.bin) continue;
  const pkgDir = path.dirname(pkgPath);
  const require = createRequire(pkgPath);

  const seen = new Set();
  for (const { subpath, condition, target } of entriesOf(pkg)) {
    if (isUmd(target)) continue;
    const key = `${condition}:${target}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const file = path.join(pkgDir, target);
    const label = `${pkg.name} ${subpath} [${condition}] ${target}`;
    if (!existsSync(file)) {
      failures.push(`${label}: file not found (run npm run build first)`);
      continue;
    }
    checked += 1;
    try {
      if (condition === 'require') {
        require(file);
      } else {
        await import(pathToFileURL(file).href);
      }
      console.log(`ok   ${label}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${label}: ${message.split('\n')[0]}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} entry point(s) failed to load in Node:`);
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log(`\nAll ${checked} entry points load in Node.`);
