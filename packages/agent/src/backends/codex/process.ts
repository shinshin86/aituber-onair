import { execFile, spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';

export interface CodexAppServerProcess {
  readonly stdin: Writable;
  readonly stdout: Readable;
  readonly stderr: Readable;
  readonly exitCode: number | null;
  readonly signalCode: NodeJS.Signals | null;
  once(
    event: 'exit',
    listener: (code: number | null, signal: NodeJS.Signals | null) => void
  ): this;
  once(event: 'error', listener: (error: Error) => void): this;
  kill(signal?: NodeJS.Signals): boolean;
}

export interface CodexAppServerSpawnOptions {
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
}

export interface CodexAppServerProcessFactory {
  readVersion(
    executable: string,
    environment: NodeJS.ProcessEnv
  ): Promise<string>;
  spawn(
    executable: string,
    options: CodexAppServerSpawnOptions
  ): CodexAppServerProcess;
}

export const nodeCodexAppServerProcessFactory: CodexAppServerProcessFactory = {
  readVersion(executable, environment) {
    return new Promise((resolve, reject) => {
      execFile(
        executable,
        ['--version'],
        { env: environment },
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout.trim());
        }
      );
    });
  },
  spawn(executable, options) {
    return spawn(executable, ['app-server', '--stdio'], {
      cwd: options.cwd,
      env: options.environment,
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams;
  },
};
