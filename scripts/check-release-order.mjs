#!/usr/bin/env node
// Fails when one change set bumps the version of a workspace package and of a
// workspace package it depends on (for example chat and core).
//
// The release workflow publishes every bumped package in parallel, and each
// package rebuilds itself in `prepublishOnly`. A dependent package (core)
// then type-checks against a dependency (chat) whose `dist` is being deleted
// and rebuilt at the same moment, so the dependent publish fails. Release the
// dependency first, then bump the dependent package in a later PR.
//
// Usage: node scripts/check-release-order.mjs [base-ref]
// The base ref defaults to $RELEASE_ORDER_BASE or origin/main.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const baseRef =
  process.argv[2] || process.env.RELEASE_ORDER_BASE || 'origin/main';

const git = (args) =>
  execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' });

const mergeBase = git(['merge-base', baseRef, 'HEAD']).trim();

const readBaseJson = (relativePath) => {
  try {
    return JSON.parse(git(['show', `${mergeBase}:${relativePath}`]));
  } catch {
    return null;
  }
};

const packages = [];
for (const dirName of readdirSync(path.join(rootDir, 'packages')).sort()) {
  const relativePath = `packages/${dirName}/package.json`;
  const absolutePath = path.join(rootDir, relativePath);
  if (!existsSync(absolutePath)) continue;
  const head = JSON.parse(readFileSync(absolutePath, 'utf8'));
  if (head.private) continue;
  const base = readBaseJson(relativePath);
  packages.push({
    name: head.name,
    from: base?.version ?? null,
    to: head.version,
    bumped: base?.version !== head.version,
    deps: Object.keys({
      ...head.dependencies,
      ...head.peerDependencies,
      ...head.optionalDependencies,
    }),
  });
}

const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
const describe = (pkg) => `${pkg.name} ${pkg.from ?? '(new)'} -> ${pkg.to}`;

const conflicts = [];
for (const pkg of packages) {
  if (!pkg.bumped) continue;
  for (const depName of pkg.deps) {
    const dep = byName.get(depName);
    if (dep?.bumped) conflicts.push({ pkg, dep });
  }
}

const bumped = packages.filter((pkg) => pkg.bumped);
console.log(`Base: ${baseRef} (${mergeBase.slice(0, 8)})`);
console.log(
  bumped.length > 0
    ? `Version bumps:\n${bumped.map((pkg) => `  ${describe(pkg)}`).join('\n')}`
    : 'Version bumps: none',
);

if (conflicts.length > 0) {
  console.error('\nRelease order violation:');
  for (const { pkg, dep } of conflicts) {
    console.error(
      `  ${describe(pkg)} depends on ${describe(dep)}, bumped in the same change`,
    );
  }
  console.error(
    '\nRelease the dependency in its own PR first. After it is on npm, bump' +
      ' the dependent package in a separate PR. This applies to patch' +
      ' releases too: parallel publishing races the rebuilds.',
  );
  process.exit(1);
}
console.log('\nRelease order OK.');
