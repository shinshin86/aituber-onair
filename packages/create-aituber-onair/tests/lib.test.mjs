import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CliError,
  createProject,
  parseArgs,
  resolveDefaultCoreVersion,
  toPackageName,
} from '../dist/lib.js';
import { TEMPLATE_IDS } from '../dist/templates.js';

const fixtureTemplateRoot = path.resolve('templates');

test('parseArgs reads project name and template', () => {
  assert.deepEqual(parseArgs(['my-app', '--template', 'live2d', '--install']), {
    targetDir: 'my-app',
    template: 'live2d',
    install: true,
  });
});

test('parseArgs reads no-install flag', () => {
  assert.deepEqual(parseArgs(['my-app', '--no-install']), {
    targetDir: 'my-app',
    install: false,
  });
});

test('parseArgs reads optional asset flags', () => {
  assert.deepEqual(
    parseArgs(['my-app', '--template', 'inochi2d', '--download-assets']),
    {
      targetDir: 'my-app',
      template: 'inochi2d',
      downloadAssets: true,
    },
  );
  assert.deepEqual(parseArgs(['my-app', '--no-download-assets']), {
    targetDir: 'my-app',
    downloadAssets: false,
  });
});

test('template list includes every supported core starter', () => {
  assert.deepEqual(TEMPLATE_IDS, [
    'pngtuber',
    'vrm',
    'live2d',
    'pet',
    'purupuru',
    'psd',
    'inochi2d',
  ]);
});

test('parseArgs rejects unknown templates', () => {
  assert.throws(() => parseArgs(['my-app', '--template', 'unknown']), CliError);
});

test('toPackageName converts directory names to npm-safe names', () => {
  assert.equal(toPackageName('/tmp/My AITuber App'), 'my-aituber-app');
  assert.equal(toPackageName('/tmp/___'), 'my-aituber');
});

test('createProject copies pngtuber template and rewrites package metadata', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));
  const result = await createProject({
    cwd,
    targetDir: 'My PNG App',
    template: 'pngtuber',
    install: false,
    templateRoot: fixtureTemplateRoot,
  });

  assert.equal(result.packageName, 'my-png-app');

  const packageJson = JSON.parse(
    await readFile(path.join(result.projectDir, 'package.json'), 'utf8'),
  );
  const rootFiles = await readdir(result.projectDir);

  assert.equal(packageJson.name, 'my-png-app');
  assert.equal(packageJson.dependencies['@aituber-onair/core'], '^0.26.7');
  assert.equal(packageJson.dependencies['@pixiv/three-vrm'], undefined);
  assert.equal(rootFiles.includes('.gitignore'), true);
  assert.equal(rootFiles.includes('_gitignore'), false);
});

test('createProject adds direct VRM runtime dependencies', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));
  const result = await createProject({
    cwd,
    targetDir: 'vrm-app',
    template: 'vrm',
    install: false,
    templateRoot: fixtureTemplateRoot,
  });

  const packageJson = JSON.parse(
    await readFile(path.join(result.projectDir, 'package.json'), 'utf8'),
  );
  assert.equal(packageJson.dependencies['@pixiv/three-vrm'], '^1.0.9');
  assert.equal(packageJson.dependencies.three, '^0.151.3');
});

test('createProject copies live2d template without licensed assets', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));
  const result = await createProject({
    cwd,
    targetDir: 'live2d-app',
    template: 'live2d',
    install: false,
    templateRoot: fixtureTemplateRoot,
  });

  const packageJson = JSON.parse(
    await readFile(path.join(result.projectDir, 'package.json'), 'utf8'),
  );
  const modelFiles = await readdir(path.join(result.projectDir, 'models'));
  const scriptFiles = await readdir(
    path.join(result.projectDir, 'public', 'scripts'),
  );

  assert.equal(
    packageJson.dependencies['pixi-live2d-display-lipsyncpatch'],
    'github:shinshin86/pixi-live2d-display-lipsyncpatch#release/v0.5.0-ls-7-noMaskFix',
  );
  assert.equal(packageJson.dependencies['pixi.js'], '^7.4.3');
  assert.deepEqual(modelFiles, ['.gitkeep']);
  assert.deepEqual(scriptFiles, ['.gitkeep']);
});

test('createProject copies pet template with bundled Miko assets', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));
  const result = await createProject({
    cwd,
    targetDir: 'pet-app',
    template: 'pet',
    install: false,
    templateRoot: fixtureTemplateRoot,
  });

  const packageJson = JSON.parse(
    await readFile(path.join(result.projectDir, 'package.json'), 'utf8'),
  );
  const petManifest = JSON.parse(
    await readFile(
      path.join(result.projectDir, 'public', 'pet', 'pet.json'),
      'utf8',
    ),
  );
  const petFiles = await readdir(path.join(result.projectDir, 'public', 'pet'));

  assert.equal(packageJson.dependencies['@aituber-onair/core'], '^0.26.7');
  assert.equal(
    packageJson.dependencies['@aituber-onair/comment-intelligence'],
    '^0.0.5',
  );
  assert.equal(packageJson.dependencies['@aituber-onair/manneri'], '^0.4.0');
  assert.equal(petManifest.displayName, 'Miko');
  assert.equal(petFiles.includes('spritesheet.webp'), true);
});

test('createProject copies PuruPuru and PSD template assets', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));

  const purupuru = await createProject({
    cwd,
    targetDir: 'purupuru-app',
    template: 'purupuru',
    install: false,
    templateRoot: fixtureTemplateRoot,
  });
  await access(
    path.join(purupuru.projectDir, 'public', 'avatar', 'miko.purupuru'),
  );

  const psd = await createProject({
    cwd,
    targetDir: 'psd-app',
    template: 'psd',
    install: false,
    templateRoot: fixtureTemplateRoot,
  });
  await access(path.join(psd.projectDir, 'public', 'avatar', 'sample.psd'));
  await access(
    path.join(psd.projectDir, 'public', 'avatar', 'sample-static.psd'),
  );
});

test('createProject keeps the Inochi2D sample model optional', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));
  const commands = [];
  const result = await createProject({
    cwd,
    targetDir: 'inochi2d-app',
    template: 'inochi2d',
    install: true,
    downloadAssets: true,
    templateRoot: fixtureTemplateRoot,
    runCommand: async (command, args, commandCwd) => {
      commands.push({ command, args, cwd: commandCwd });
    },
  });

  assert.deepEqual(commands, [
    {
      command: process.execPath,
      args: ['scripts/download-inochi2d-sample-model.mjs'],
      cwd: result.projectDir,
    },
    {
      command: 'npm',
      args: ['install'],
      cwd: result.projectDir,
    },
  ]);
  assert.deepEqual(result.assetDownload, {
    attempted: true,
    succeeded: true,
  });
  await assert.rejects(
    access(
      path.join(
        result.projectDir,
        'public',
        'inochi2d',
        'models',
        'Aka.original-rig.inx',
      ),
    ),
  );
});

test('createProject reports an optional asset download failure', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));
  const result = await createProject({
    cwd,
    targetDir: 'inochi2d-app',
    template: 'inochi2d',
    install: false,
    downloadAssets: true,
    templateRoot: fixtureTemplateRoot,
    runCommand: async () => {
      throw new Error('offline');
    },
  });

  assert.deepEqual(result.assetDownload, {
    attempted: true,
    succeeded: false,
    error: 'offline',
  });
});

test('createProject runs npm install when requested', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));
  const commands = [];

  await createProject({
    cwd,
    targetDir: 'install-app',
    template: 'pngtuber',
    install: true,
    templateRoot: fixtureTemplateRoot,
    runCommand: async (command, args, commandCwd) => {
      commands.push({ command, args, cwd: commandCwd });
    },
  });

  assert.deepEqual(commands, [
    {
      command: 'npm',
      args: ['install'],
      cwd: path.join(cwd, 'install-app'),
    },
  ]);
});

test('createProject allows overriding the core dependency version', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'create-aituber-onair-'));
  const result = await createProject({
    cwd,
    targetDir: 'custom-core-app',
    template: 'pngtuber',
    install: false,
    templateRoot: fixtureTemplateRoot,
    coreVersion: '9.9.9',
  });

  const packageJson = JSON.parse(
    await readFile(path.join(result.projectDir, 'package.json'), 'utf8'),
  );
  assert.equal(packageJson.dependencies['@aituber-onair/core'], '^9.9.9');
});

test('resolveDefaultCoreVersion reads the workspace core package version', async () => {
  assert.equal(await resolveDefaultCoreVersion(), '0.26.7');
});
