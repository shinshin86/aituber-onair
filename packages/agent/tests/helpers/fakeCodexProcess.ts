import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type {
  CodexAppServerProcess,
  CodexAppServerProcessFactory,
  CodexAppServerSpawnOptions,
} from '../../src/backends/codex/process.js';

export class FakeCodexProcess
  extends EventEmitter
  implements CodexAppServerProcess
{
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  readonly kill = vi.fn((_signal?: NodeJS.Signals) => true);
  private stdinOutput = '';

  constructor() {
    super();
    this.stdin.on('data', (chunk) => {
      this.stdinOutput += String(chunk);
    });
  }

  send(message: unknown): void {
    this.stdout.write(`${JSON.stringify(message)}\n`);
  }

  messages(): unknown[] {
    return this.stdinOutput
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  emitExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.exitCode = code;
    this.signalCode = signal;
    this.emit('exit', code, signal);
  }

  async finish(close: () => Promise<void>): Promise<void> {
    const closing = close();
    this.emitExit(0, null);
    await closing;
  }
}

export class FakeCodexProcessFactory implements CodexAppServerProcessFactory {
  readonly processes: FakeCodexProcess[] = [];
  readonly spawnOptions: CodexAppServerSpawnOptions[] = [];
  version = 'codex-cli 0.145.0';
  versionError?: Error;
  spawnError?: Error;

  async readVersion(): Promise<string> {
    if (this.versionError) throw this.versionError;
    return this.version;
  }

  spawn(
    _executable: string,
    options: CodexAppServerSpawnOptions
  ): FakeCodexProcess {
    if (this.spawnError) throw this.spawnError;
    const process = new FakeCodexProcess();
    this.processes.push(process);
    this.spawnOptions.push(options);
    return process;
  }
}

export async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
