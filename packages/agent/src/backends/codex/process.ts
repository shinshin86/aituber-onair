import { execFile, spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type {
  JsonLineRpcProcess,
  JsonLineRpcSpawnOptions,
} from '../shared/process.js';

export type CodexAppServerProcess = JsonLineRpcProcess;
export type CodexAppServerSpawnOptions = JsonLineRpcSpawnOptions;

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
