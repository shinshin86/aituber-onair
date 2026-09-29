import type { Readable, Writable } from 'node:stream';

/** Child-process surface required by newline-delimited JSON stdio transports. */
export interface JsonLineRpcProcess {
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

/** Working directory and environment supplied to a JSONL stdio child process. */
export interface JsonLineRpcSpawnOptions {
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
}
