import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const templatesRoot = path.join(packageRoot, 'templates');
const manifest = JSON.parse(
  await readFile(path.join(packageRoot, 'template-manifest.json'), 'utf8'),
);
const maximumUnpackedBytes = 45 * 1024 * 1024;

async function walkFiles(directory, relativeRoot = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeRoot, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolutePath, relativePath)));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

function hasLocalDependencyReference(value) {
  return (
    value.startsWith('.') ||
    value.startsWith('file:') ||
    value.startsWith('workspace:')
  );
}

let totalBytes = 0;

for (const template of manifest.templates) {
  const templateRoot = path.join(templatesRoot, template.id);
  const files = await walkFiles(templateRoot);

  for (const file of files) {
    const normalized = file.split(path.sep).join('/');
    const basename = path.basename(file);
    if (basename === '.gitignore') {
      throw new Error(`${template.id} contains a nested .gitignore: ${file}`);
    }
    if (basename === 'package-lock.json') {
      throw new Error(`${template.id} contains package-lock.json.`);
    }
    if (
      normalized.includes('/node_modules/') ||
      normalized.includes('/dist/')
    ) {
      throw new Error(
        `${template.id} contains generated dependency output: ${file}`,
      );
    }
    if (basename === '.env' || basename.startsWith('.env.')) {
      throw new Error(`${template.id} contains an environment file: ${file}`);
    }
    totalBytes += (await lstat(path.join(templateRoot, file))).size;
  }

  for (const requiredFile of template.requiredFiles) {
    if (!files.includes(requiredFile)) {
      throw new Error(
        `${template.id} is missing required file ${requiredFile}.`,
      );
    }
  }

  const packageJson = JSON.parse(
    await readFile(path.join(templateRoot, 'package.json'), 'utf8'),
  );
  for (const sectionName of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const [name, value] of Object.entries(
      packageJson[sectionName] ?? {},
    )) {
      if (hasLocalDependencyReference(value)) {
        throw new Error(
          `${template.id} keeps local dependency ${name}: ${value}`,
        );
      }
    }
  }
}

const live2dRoot = path.join(templatesRoot, 'live2d');
const live2dModels = await readdir(path.join(live2dRoot, 'models'));
const live2dScripts = await readdir(path.join(live2dRoot, 'public', 'scripts'));
if (
  live2dModels.some((name) => name !== '.gitkeep') ||
  live2dScripts.some((name) => name !== '.gitkeep')
) {
  throw new Error('Live2D template contains non-redistributable local assets.');
}

for (const forbiddenModel of [
  'Aka.original-rig.inx',
  'Aka.original.motion.json',
]) {
  try {
    await lstat(
      path.join(
        templatesRoot,
        'inochi2d',
        'public',
        'inochi2d',
        'models',
        forbiddenModel,
      ),
    );
    throw new Error(`Inochi2D template bundles ${forbiddenModel}.`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

if (totalBytes > maximumUnpackedBytes) {
  throw new Error(
    `Generated templates are ${(totalBytes / 1024 / 1024).toFixed(2)} MiB; the limit is 45 MiB.`,
  );
}

console.log(
  `Verified ${manifest.templates.length} templates (${(totalBytes / 1024 / 1024).toFixed(2)} MiB unpacked).`,
);
