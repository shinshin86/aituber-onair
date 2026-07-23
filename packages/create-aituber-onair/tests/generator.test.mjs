import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  findRepositoryRoot,
  listTrackedFiles,
  readTemplateManifest,
} from '../scripts/generate-templates.mjs';

const packageRoot = path.resolve('.');
const templateRoot = path.join(packageRoot, 'templates');

test('manifest defines the seven generated templates', async () => {
  const manifest = await readTemplateManifest();
  assert.deepEqual(
    manifest.templates.map((template) => template.id),
    ['pngtuber', 'vrm', 'live2d', 'pet', 'purupuru', 'psd', 'inochi2d'],
  );
});

test('tracked-only source listing excludes local Live2D licensed assets', () => {
  const tracked = listTrackedFiles(
    findRepositoryRoot(),
    'packages/core/examples/react-live2d-app',
  );
  assert.equal(
    tracked.some((file) => file.includes('models/hiyori_pro_jp')),
    false,
  );
  assert.equal(
    tracked.some((file) => file.endsWith('live2dcubismcore.min.js')),
    false,
  );
});

test('generated templates use published dependency ranges', async () => {
  for (const template of [
    'pngtuber',
    'vrm',
    'live2d',
    'pet',
    'purupuru',
    'psd',
    'inochi2d',
  ]) {
    const packageJson = JSON.parse(
      await readFile(path.join(templateRoot, template, 'package.json'), 'utf8'),
    );
    assert.equal(packageJson.dependencies['@aituber-onair/core'], '^0.26.8');
    assert.equal(
      packageJson.dependencies['@aituber-onair/comment-intelligence'],
      '^0.0.5',
    );
    assert.equal(packageJson.dependencies['@aituber-onair/manneri'], '^0.4.0');
  }
});

test('npm pack includes generated templates without ignored assets', async () => {
  const npmCache = await mkdtemp(path.join(tmpdir(), 'create-pack-cache-'));
  const output = execFileSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: packageRoot,
      encoding: 'utf8',
      env: { ...process.env, npm_config_cache: npmCache },
    },
  );
  const [packResult] = JSON.parse(output);
  const packedFiles = packResult.files.map((file) => file.path);

  assert.equal(
    packedFiles.includes('templates/psd/public/avatar/sample-static.psd'),
    true,
  );
  assert.equal(
    packedFiles.includes(
      'templates/inochi2d/scripts/download-inochi2d-sample-model.mjs',
    ),
    true,
  );
  assert.equal(
    packedFiles.some((file) => file.endsWith('/.gitignore')),
    false,
  );
  assert.equal(
    packedFiles.some((file) => file.includes('hiyori_pro_jp')),
    false,
  );
  assert.equal(
    packedFiles.some((file) => file.endsWith('Aka.original-rig.inx')),
    false,
  );
  assert.ok(packResult.size <= 25 * 1024 * 1024);
  assert.ok(packResult.unpackedSize <= 45 * 1024 * 1024);
});

test('generated Live2D and Inochi2D asset directories are safe', async () => {
  assert.deepEqual(await readdir(path.join(templateRoot, 'live2d', 'models')), [
    '.gitkeep',
  ]);
  assert.deepEqual(
    await readdir(path.join(templateRoot, 'live2d', 'public', 'scripts')),
    ['.gitkeep'],
  );
  assert.deepEqual(
    (
      await readdir(
        path.join(templateRoot, 'inochi2d', 'public', 'inochi2d', 'models'),
      )
    ).sort(),
    ['.gitkeep', 'Aka.ATTRIBUTION.md'].sort(),
  );
});

test('generated VRM resolves Three.js from the standalone project', async () => {
  const viteConfig = await readFile(
    path.join(templateRoot, 'vrm', 'vite.config.ts'),
    'utf8',
  );
  assert.equal(viteConfig.includes('../../../../node_modules/three'), false);
  assert.equal(viteConfig.includes("'node_modules/three'"), true);
});
