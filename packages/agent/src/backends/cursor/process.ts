import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type {
  JsonLineRpcProcess,
  JsonLineRpcSpawnOptions,
} from '../shared/process.js';

export type CursorAcpProcess = JsonLineRpcProcess;
export type CursorAcpSpawnOptions = JsonLineRpcSpawnOptions;

export interface CursorAcpProcessFactory {
  spawn(executable: string, options: CursorAcpSpawnOptions): CursorAcpProcess;
}

export const nodeCursorAcpProcessFactory: CursorAcpProcessFactory = {
  spawn(executable, options) {
    return spawn(executable, ['acp'], {
      cwd: options.cwd,
      env: options.environment,
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams;
  },
};
