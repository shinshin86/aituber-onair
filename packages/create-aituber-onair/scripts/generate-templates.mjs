import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const manifestPath = path.join(packageRoot, 'template-manifest.json');
const outputRoot = path.join(packageRoot, 'templates');
const globalExcludedBasenames = new Set(['.DS_Store', 'package-lock.json']);

export async function readTemplateManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

export function findRepositoryRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(
      'Template generation requires a Git checkout so only tracked files can be copied.',
    );
  }
}

function readGitOutput(repositoryRoot, args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function listTrackedFiles(repositoryRoot, sourcePath) {
  const output = readGitOutput(repositoryRoot, [
    'ls-files',
    '-z',
    '--',
    sourcePath,
  ]);

  return output.toString('utf8').split('\0').filter(Boolean);
}

async function copyTrackedFile(source, destination) {
  const sourceStat = await lstat(source);
  await mkdir(path.dirname(destination), { recursive: true });

  if (sourceStat.isSymbolicLink()) {
    await symlink(await readlink(source), destination);
    return;
  }

  if (!sourceStat.isFile()) {
    throw new Error(`Unsupported tracked entry: ${source}`);
  }

  await copyFile(source, destination);
}

async function collectWorkspacePackages(repositoryRoot) {
  const packagesRoot = path.join(repositoryRoot, 'packages');
  const entries = await readdir(packagesRoot, { withFileTypes: true });
  const packages = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    try {
      const packageJson = JSON.parse(
        await readFile(
          path.join(packagesRoot, entry.name, 'package.json'),
          'utf8',
        ),
      );
      if (packageJson.name && packageJson.version) {
        packages.set(packageJson.name, packageJson.version);
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  return packages;
}

function isWorkspaceReference(value) {
  return (
    value.startsWith('.') ||
    value.startsWith('file:') ||
    value.startsWith('workspace:')
  );
}

function rewriteDependencySection(section, workspacePackages) {
  if (!section) return;

  for (const [name, value] of Object.entries(section)) {
    if (!isWorkspaceReference(value)) continue;

    const version = workspacePackages.get(name);
    if (!version) {
      throw new Error(
        `No publishable workspace version found for local dependency ${name}.`,
      );
    }
    section[name] = `^${version}`;
  }
}

export async function rewritePackageJson(
  templateRoot,
  template,
  workspacePackages,
) {
  const packageJsonPath = path.join(templateRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  packageJson.version = '0.0.0';
  packageJson.private = true;

  for (const sectionName of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    rewriteDependencySection(packageJson[sectionName], workspacePackages);
  }

  packageJson.dependencies = {
    ...packageJson.dependencies,
    ...template.dependencyOverrides,
  };

  const serialized = JSON.stringify(packageJson);
  if (
    serialized.includes('"file:') ||
    serialized.includes('"workspace:') ||
    /"\.\.?\//.test(serialized)
  ) {
    throw new Error(
      `${template.id} package.json still contains a local dependency reference.`,
    );
  }

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function normalizeReadmes(templateRoot, sourcePath) {
  const sourceDirectory = path.basename(sourcePath);

  for (const name of ['README.md', 'README.ja.md']) {
    const readmePath = path.join(templateRoot, name);
    let contents;
    try {
      contents = await readFile(readmePath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }

    contents = contents
      .replaceAll(
        `cd packages/core/examples/${sourceDirectory}`,
        'cd <project-directory>',
      )
      .replaceAll(`packages/core/examples/${sourceDirectory}/`, '');
    await writeFile(readmePath, contents);
  }
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function createInochi2dDownloader({ assets, modelEntry }) {
  return `import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = ${JSON.stringify(assets, null, 2)};
const modelEntry = ${JSON.stringify(modelEntry, null, 2)};

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function downloadAsset(asset) {
  const destination = path.join(projectRoot, asset.path);
  try {
    const existing = await readFile(destination);
    if (digest(existing) === asset.sha256) {
      console.log(\`Already downloaded: \${asset.path}\`);
      return;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  console.log(\`Downloading: \${asset.path}\`);
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(\`Download failed (\${response.status}): \${asset.url}\`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const actualHash = digest(buffer);
  if (actualHash !== asset.sha256) {
    throw new Error(
      \`SHA-256 mismatch for \${asset.path}: expected \${asset.sha256}, received \${actualHash}\`,
    );
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const temporaryPath = \`\${destination}.tmp\`;
  try {
    await writeFile(temporaryPath, buffer);
    await rename(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

for (const asset of assets) {
  await downloadAsset(asset);
}

const manifestPath = path.join(projectRoot, 'public', 'inochi2d', 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.defaultModelId = modelEntry.id;
manifest.models = [
  ...(manifest.models ?? []).filter((model) => model.id !== modelEntry.id),
  modelEntry,
];
await writeFile(manifestPath, \`\${JSON.stringify(manifest, null, 2)}\\n\`);

console.log('Aka sample model is ready.');
`;
}

async function transformInochi2d({
  repositoryRoot,
  sourceRoot,
  templateRoot,
  sourceCommit,
}) {
  const sourceManifestPath = path.join(
    sourceRoot,
    'public',
    'inochi2d',
    'manifest.json',
  );
  const sourceManifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'));
  const [modelEntry] = sourceManifest.models ?? [];
  if (!modelEntry) {
    throw new Error('The Inochi2D source manifest has no sample model.');
  }

  const assetPaths = [modelEntry.model, modelEntry.motion]
    .filter(Boolean)
    .map((assetPath) =>
      path.posix.join('public/inochi2d', assetPath.replace(/^\.\//, '')),
    );
  const assets = [];

  for (const assetPath of assetPaths) {
    const sourcePath = path.join(sourceRoot, assetPath);
    const buffer = await readFile(sourcePath);
    assets.push({
      path: assetPath,
      sha256: sha256(buffer),
      url: `https://raw.githubusercontent.com/shinshin86/aituber-onair/${sourceCommit}/${path.posix.join(path.relative(repositoryRoot, sourceRoot).split(path.sep).join('/'), assetPath)}`,
    });
  }

  const generatedManifest = {
    ...sourceManifest,
    defaultModelId: null,
    models: [],
  };
  await writeFile(
    path.join(templateRoot, 'public', 'inochi2d', 'manifest.json'),
    `${JSON.stringify(generatedManifest, null, 2)}\n`,
  );

  const scriptsRoot = path.join(templateRoot, 'scripts');
  await mkdir(scriptsRoot, { recursive: true });
  await writeFile(
    path.join(scriptsRoot, 'download-inochi2d-sample-model.mjs'),
    createInochi2dDownloader({ assets, modelEntry }),
  );

  const packageJsonPath = path.join(templateRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  packageJson.scripts = {
    ...packageJson.scripts,
    'setup:sample-model': 'node scripts/download-inochi2d-sample-model.mjs',
  };
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  await updateInochi2dReadme(templateRoot, false);
  await updateInochi2dReadme(templateRoot, true);
}

async function updateInochi2dReadme(templateRoot, japanese) {
  const name = japanese ? 'README.ja.md' : 'README.md';
  const readmePath = path.join(templateRoot, name);
  let contents = await readFile(readmePath, 'utf8');

  const original = japanese
    ? 'このサンプルには初回表示用に Aka Inochi2D モデルを同梱しています。同梱モデルは\n以下に配置しています。'
    : 'This example bundles the Aka Inochi2D model for first-run display. The bundled\nmodel files are placed under:';
  const replacement = japanese
    ? 'このスターターは npm パッケージを小さく保つため、Aka Inochi2D モデルを\n同梱していません。作成時の確認でダウンロードするか、後から次を実行してください。\n\n```bash\nnpm run setup:sample-model\n```\n\nダウンロードしたモデルは以下に配置されます。'
    : 'This starter does not bundle the Aka Inochi2D model in order to keep the npm\npackage small. Download it during project creation, or run this later:\n\n```bash\nnpm run setup:sample-model\n```\n\nThe downloaded model files are placed under:';

  if (!contents.includes(original)) {
    throw new Error(`Could not update the optional-model note in ${name}.`);
  }
  contents = contents.replace(original, replacement);
  contents = japanese
    ? contents
        .replace(
          '## 同梱モデルのクレジット',
          '## 任意サンプルモデルのクレジット',
        )
        .replace('同梱している Aka モデルは', '任意取得する Aka モデルは')
    : contents
        .replace(
          '## Bundled model attribution',
          '## Optional sample model attribution',
        )
        .replace('The bundled Aka model is', 'The optional Aka model is');
  await writeFile(readmePath, contents);
}

async function applyTransform(options) {
  if (!options.template.transform) return;

  if (options.template.transform === 'vrmStandalone') {
    const viteConfigPath = path.join(options.templateRoot, 'vite.config.ts');
    const contents = await readFile(viteConfigPath, 'utf8');
    const workspacePath = '../../../../node_modules/three';
    if (!contents.includes(workspacePath)) {
      throw new Error('Could not find the VRM workspace Three.js alias.');
    }
    await writeFile(
      viteConfigPath,
      contents.replace(workspacePath, 'node_modules/three'),
    );
    return;
  }

  if (options.template.transform === 'inochi2dOptionalSample') {
    await transformInochi2d(options);
    return;
  }

  throw new Error(`Unknown template transform: ${options.template.transform}`);
}

export async function generateTemplates() {
  const repositoryRoot = findRepositoryRoot();
  const manifest = await readTemplateManifest();
  const workspacePackages = await collectWorkspacePackages(repositoryRoot);
  const sourceCommit = readGitOutput(repositoryRoot, ['rev-parse', 'HEAD'])
    .toString('utf8')
    .trim();

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  for (const template of manifest.templates) {
    const sourceRoot = path.join(repositoryRoot, template.sourcePath);
    const templateRoot = path.join(outputRoot, template.id);
    const excluded = new Set(template.excludeTracked ?? []);
    const trackedFiles = listTrackedFiles(repositoryRoot, template.sourcePath);

    if (trackedFiles.length === 0) {
      throw new Error(`No tracked files found for ${template.sourcePath}.`);
    }

    for (const repositoryRelativePath of trackedFiles) {
      const relativePath = path.relative(
        template.sourcePath,
        repositoryRelativePath,
      );
      if (
        globalExcludedBasenames.has(path.basename(relativePath)) ||
        excluded.has(relativePath.split(path.sep).join('/'))
      ) {
        continue;
      }

      const destinationRelativePath =
        relativePath === '.gitignore' ? '_gitignore' : relativePath;
      await copyTrackedFile(
        path.join(repositoryRoot, repositoryRelativePath),
        path.join(templateRoot, destinationRelativePath),
      );
    }

    await rewritePackageJson(templateRoot, template, workspacePackages);
    await normalizeReadmes(templateRoot, template.sourcePath);
    await applyTransform({
      repositoryRoot,
      sourceRoot,
      templateRoot,
      sourceCommit,
      template,
    });
  }

  return { outputRoot, templateCount: manifest.templates.length };
}

export async function cleanTemplates() {
  await rm(outputRoot, { recursive: true, force: true });
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  if (process.argv.includes('--clean')) {
    await cleanTemplates();
    console.log('Removed generated templates.');
  } else {
    const result = await generateTemplates();
    console.log(
      `Generated ${result.templateCount} templates in ${result.outputRoot}.`,
    );
  }
}
