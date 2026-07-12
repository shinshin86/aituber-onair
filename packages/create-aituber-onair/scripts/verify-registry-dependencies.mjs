import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const strict = process.argv.includes('--strict');
const allowedUnpublished = new Set(
  (process.env.ALLOW_UNPUBLISHED_WORKSPACE_PACKAGES ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
);
const manifest = JSON.parse(
  await readFile(path.join(packageRoot, 'template-manifest.json'), 'utf8'),
);
const dependencies = new Map();

for (const template of manifest.templates) {
  const packageJson = JSON.parse(
    await readFile(
      path.join(packageRoot, 'templates', template.id, 'package.json'),
      'utf8',
    ),
  );
  for (const [name, range] of Object.entries(packageJson.dependencies ?? {})) {
    if (name.startsWith('@aituber-onair/')) dependencies.set(name, range);
  }
}

let failed = false;
for (const [name, range] of dependencies) {
  const version = range.replace(/^[~^]/, '');
  let response;
  try {
    response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    );
  } catch (error) {
    const message = `Could not reach npm while checking ${name}@${version}: ${error instanceof Error ? error.message : String(error)}`;
    if (strict) {
      console.error(`ERROR: ${message}`);
      failed = true;
    } else {
      console.warn(`WARNING: ${message}`);
    }
    continue;
  }
  if (response.ok) continue;

  const message = `${name}@${version} is not published to npm.`;
  if (strict && !allowedUnpublished.has(name)) {
    console.error(`ERROR: ${message}`);
    failed = true;
  } else {
    console.warn(`WARNING: ${message}`);
  }
}

if (failed) process.exitCode = 1;
