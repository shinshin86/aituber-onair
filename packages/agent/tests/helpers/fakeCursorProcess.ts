import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type {
  CursorAcpProcess,
  CursorAcpProcessFactory,
  CursorAcpSpawnOptions,
} from '../../src/backends/cursor/process.js';

export class FakeCursorProcess
  extends EventEmitter
  implements CursorAcpProcess
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

  send(message: Record<string, unknown>): void {
    this.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
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

export class FakeCursorProcessFactory implements CursorAcpProcessFactory {
  readonly processes: FakeCursorProcess[] = [];
  readonly executables: string[] = [];
  readonly spawnOptions: CursorAcpSpawnOptions[] = [];
  spawnError?: Error;

  spawn(executable: string, options: CursorAcpSpawnOptions): FakeCursorProcess {
    if (this.spawnError) throw this.spawnError;
    this.executables.push(executable);
    this.spawnOptions.push(options);
    const process = new FakeCursorProcess();
    this.processes.push(process);
    return process;
  }
}

export async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
