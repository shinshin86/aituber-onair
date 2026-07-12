import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [template, tarballArgument] = process.argv.slice(2);
if (!template || !tarballArgument) {
  console.error(
    'Usage: node scripts/smoke-generated-template.mjs <template> <tarball>',
  );
  process.exit(1);
}

const tarball = path.resolve(tarballArgument);
const smokeRoot = await mkdtemp(
  path.join(tmpdir(), `create-aituber-${template}-smoke-`),
);
const runnerRoot = path.join(smokeRoot, 'runner');
const projectRoot = path.join(smokeRoot, 'generated-app');
const packageCache =
  process.env.SMOKE_NPM_CACHE ?? path.join(smokeRoot, 'npm-cache');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        npm_config_cache: packageCache,
        ...options.env,
      },
      stdio: options.stdio ?? 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed (${code}).`));
    });
  });
}

async function verifyDevServer() {
  const port = 4173;
  const child = spawn(
    'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: projectRoot,
      env: { ...process.env, npm_config_cache: packageCache },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    },
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });

  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`);
        if (response.ok) return;
      } catch {
        // The dev server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Dev server did not become ready.\n${output}`);
  } finally {
    child.kill('SIGTERM');
  }
}

try {
  await mkdir(runnerRoot, { recursive: true });
  await writeFile(
    path.join(runnerRoot, 'package.json'),
    `${JSON.stringify({ private: true }, null, 2)}\n`,
  );
  await run('npm', ['install', '--no-audit', '--no-fund', tarball], {
    cwd: runnerRoot,
  });

  const executable = path.join(
    runnerRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32'
      ? 'create-aituber-onair.cmd'
      : 'create-aituber-onair',
  );
  await run(
    executable,
    [
      projectRoot,
      '--template',
      template,
      '--no-install',
      '--no-download-assets',
      '--yes',
    ],
    { cwd: smokeRoot },
  );
  await run('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: projectRoot,
  });
  await run('npm', ['run', 'build'], { cwd: projectRoot });
  await verifyDevServer();
  console.log(`Smoke test passed: ${template}`);
} finally {
  if (process.env.SMOKE_KEEP !== '1') {
    await rm(smokeRoot, { recursive: true, force: true });
  } else {
    console.log(`Smoke files kept at ${smokeRoot}`);
  }
}
