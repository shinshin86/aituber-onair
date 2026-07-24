#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXAMPLE_DIR = fileURLToPath(new URL('..', import.meta.url));
const IS_WINDOWS = process.platform === 'win32';
const FORCE_EXIT_DELAY_MS = 3_000;
const SIGNAL_EXIT_CODES = {
  SIGINT: 130,
  SIGTERM: 143,
};
const viteArgs = process.argv.slice(2);
const npmRunArgs = [
  'run',
  'dev:web',
  ...(viteArgs.length > 0 ? ['--', ...viteArgs] : []),
];

const npmCommand = process.env.npm_execpath
  ? {
      command: process.execPath,
      args: [process.env.npm_execpath, ...npmRunArgs],
    }
  : {
      command: IS_WINDOWS ? 'npm.cmd' : 'npm',
      args: npmRunArgs,
    };

const definitions = [
  {
    name: 'server',
    command: process.execPath,
    args: ['server/index.js'],
  },
  {
    name: 'web',
    ...npmCommand,
  },
];

const children = new Map();
let shuttingDown = false;
let requestedExitCode = 0;
let forceExitTimer;

const prefixOutput = (stream, label, destination) => {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const line of lines) destination.write(`[${label}] ${line}\n`);
  });
  stream.on('end', () => {
    if (pending) destination.write(`[${label}] ${pending}\n`);
  });
};

const signalChild = (child, signal) => {
  if (child.exitCode !== null || child.signalCode !== null) return;

  try {
    if (!IS_WINDOWS && child.pid) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
};

const finishIfStopped = () => {
  if (children.size > 0) return;
  if (forceExitTimer) clearTimeout(forceExitTimer);
  process.exitCode = requestedExitCode;
};

const shutdown = (exitCode, signal = 'SIGTERM') => {
  if (!shuttingDown) {
    shuttingDown = true;
    requestedExitCode = exitCode;

    for (const child of children.values()) signalChild(child, signal);

    forceExitTimer = setTimeout(() => {
      for (const child of children.values()) signalChild(child, 'SIGKILL');
    }, FORCE_EXIT_DELAY_MS);
    forceExitTimer.unref();
  } else if (exitCode !== 0 && requestedExitCode === 0) {
    requestedExitCode = exitCode;
  }

  finishIfStopped();
};

for (const definition of definitions) {
  const child = spawn(definition.command, definition.args, {
    cwd: EXAMPLE_DIR,
    env: process.env,
    detached: !IS_WINDOWS,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.set(definition.name, child);
  prefixOutput(child.stdout, definition.name, process.stdout);
  prefixOutput(child.stderr, definition.name, process.stderr);

  child.on('error', (error) => {
    console.error(`[${definition.name}] Failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on('close', (code, signal) => {
    children.delete(definition.name);

    if (!shuttingDown) {
      const exitCode = code ?? (signal ? 1 : 0);
      const result = signal ? `signal ${signal}` : `code ${exitCode}`;
      console.error(`[dev] ${definition.name} exited with ${result}.`);
      shutdown(exitCode);
    }

    finishIfStopped();
  });
}

process.on('SIGINT', () => shutdown(SIGNAL_EXIT_CODES.SIGINT, 'SIGINT'));
process.on('SIGTERM', () => shutdown(SIGNAL_EXIT_CODES.SIGTERM, 'SIGTERM'));
