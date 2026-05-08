import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CliError,
  createProject,
  parseArgs,
  toPackageName,
} from '../dist/lib.js';

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
  assert.equal(packageJson.dependencies['@aituber-onair/core'], '^0.25.8');
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
