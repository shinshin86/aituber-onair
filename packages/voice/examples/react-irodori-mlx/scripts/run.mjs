import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPort, signalGroup } from './processes.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const env = {
  ...process.env,
  UV_CACHE_DIR: resolve(root, '.cache/uv'),
  UV_PYTHON_INSTALL_DIR: resolve(root, '.python'),
  UV_PROJECT_ENVIRONMENT: resolve(root, '.venv'),
  UV_PYTHON_PREFERENCE: 'only-managed',
  HF_HOME: resolve(root, '.cache/huggingface'),
  XDG_CACHE_HOME: resolve(root, '.cache'),
  npm_config_cache: resolve(root, '.cache/npm'),
  PYTHONUNBUFFERED: '1',
  PYTHONNOUSERSITE: '1',
  HF_HUB_OFFLINE: mode === 'setup' ? '0' : '1',
  TRANSFORMERS_OFFLINE: mode === 'setup' ? '0' : '1',
  HF_HUB_DISABLE_TELEMETRY: '1',
};
env.PYTHONPATH = undefined;
env.PYTHONHOME = undefined;
env.VIRTUAL_ENV = undefined;
const children = new Set();
let stopping = false;
let healthTimer;
const logs = [];

function launch(command, args, log) {
  const child = spawn(command, args, {
    cwd: root,
    env,
    detached: true,
    stdio: log ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  children.add(child);
  if (log) {
    const output = createWriteStream(resolve(root, '.local', log), {
      flags: 'w',
    });
    logs.push(output);
    child.stdout.pipe(output, { end: false });
    child.stderr.pipe(output, { end: false });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
  }
  child.once('error', () => children.delete(child));
  child.once('exit', () => {
    children.delete(child);
    signalGroup(child, 'SIGTERM');
  });
  return child;
}

async function stop(code) {
  if (stopping) return;
  stopping = true;
  clearInterval(healthTimer);
  const running = [...children];
  const exited = Promise.all(
    running.map(
      (child) =>
        new Promise((resolveExit) => {
          child.once('exit', resolveExit);
          child.once('error', resolveExit);
        }),
    ),
  );
  for (const child of running) signalGroup(child, 'SIGTERM');
  const killTimer = setTimeout(() => {
    for (const child of running) signalGroup(child, 'SIGKILL');
  }, 5000);
  await exited;
  clearTimeout(killTimer);
  for (const log of logs) log.end();
  process.exitCode = code;
}
for (const name of ['SIGINT', 'SIGTERM'])
  process.once(name, () => void stop(0));

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = launch(command, args);
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 && !stopping
        ? resolveRun()
        : reject(new Error(`${command} exited (${code}).`)),
    );
  });
}

try {
  mkdirSync(resolve(root, '.local'), { recursive: true });
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new Error(
      'This sample requires native Apple Silicon macOS. Avoid Rosetta.',
    );
  }
  if (mode === 'setup') {
    await run('uv', ['sync', '--locked', '--python', '3.12']);
    await run('npm', ['ci']);
    await run('npm', ['--prefix', '../..', 'run', 'build']);
    await run('uv', [
      'run',
      '--no-sync',
      '--python',
      '3.12',
      '-m',
      'server.setup',
    ]);
  } else if (mode === 'test') {
    await run('uv', [
      'run',
      '--no-sync',
      '--python',
      '3.12',
      '-m',
      'pytest',
      '-q',
    ]);
  } else if (mode === 'dev') {
    await Promise.all([checkPort(8000), checkPort(5173)]);
    await run('npm', ['--prefix', '../..', 'run', 'build']);
    const api = launch(
      'uv',
      [
        'run',
        '--no-sync',
        '--offline',
        '--python',
        '3.12',
        '-m',
        'uvicorn',
        'server.app:app',
        '--host',
        '127.0.0.1',
        '--port',
        '8000',
        '--workers',
        '1',
        '--limit-concurrency',
        '16',
        '--timeout-graceful-shutdown',
        '3',
      ],
      'api.log',
    );
    const frontend = launch(
      process.execPath,
      ['node_modules/vite/bin/vite.js'],
      'frontend.log',
    );
    for (const child of [api, frontend]) {
      child.once('error', (error) => {
        console.error(error.message);
        void stop(1);
      });
      child.once('exit', (code) => {
        if (!stopping) {
          console.error(`Service exited (${code}). Stopping both services.`);
          void stop(1);
        }
      });
    }
    const started = Date.now();
    healthTimer = setInterval(async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/health', {
          signal: AbortSignal.timeout(1500),
        });
        const health = await response.json();
        if (health.status === 'error') {
          console.error(health.error);
          await stop(1);
        }
        if (health.status === 'ready') {
          clearInterval(healthTimer);
          console.log('Model ready. Open http://127.0.0.1:5173');
        }
      } catch {
        /* Model import may still be starting. */
      }
      if (Date.now() - started > 180000 && !stopping) {
        console.error('API startup exceeded 180 seconds. See .local/api.log.');
        await stop(1);
      }
    }, 1500);
  } else {
    throw new Error('Use npm run setup, npm run dev, or npm test.');
  }
} catch (error) {
  console.error(error.message);
  await stop(1);
}
