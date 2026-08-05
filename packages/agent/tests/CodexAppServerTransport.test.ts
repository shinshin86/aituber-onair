import {
  AgentBackendProcessError,
  AgentBackendProtocolError,
  AgentTimeoutError,
} from '../src/errors.js';
import {
  CodexAppServerServerRequestError,
  CodexAppServerTransport,
} from '../src/backends/codex/transport.js';
import { FakeCodexProcess, flushPromises } from './helpers/fakeCodexProcess.js';

describe('CodexAppServerTransport', () => {
  it('uses monotonic IDs and correlates interleaved responses', async () => {
    const process = new FakeCodexProcess();
    const transport = new CodexAppServerTransport(process);

    const first = transport.request<{ value: string }>('first', {});
    const second = transport.request<{ value: string }>('second', {});
    expect(process.messages()).toEqual([
      { id: 1, method: 'first', params: {} },
      { id: 2, method: 'second', params: {} },
    ]);

    process.send({ id: 2, result: { value: 'two' } });
    process.send({ id: 1, result: { value: 'one' } });

    await expect(first).resolves.toEqual({ value: 'one' });
    await expect(second).resolves.toEqual({ value: 'two' });
    await process.finish(() => transport.close());
  });

  it('delivers interleaved notifications', async () => {
    const process = new FakeCodexProcess();
    const notifications: unknown[] = [];
    const transport = new CodexAppServerTransport(process, {
      onNotification: (notification) => notifications.push(notification),
    });
    const request = transport.request('thread/start', {});

    process.send({
      method: 'thread/started',
      params: { thread: { id: 't1' } },
    });
    process.send({ id: 1, result: { thread: { id: 't1' } } });

    await request;
    expect(notifications).toEqual([
      { method: 'thread/started', params: { thread: { id: 't1' } } },
    ]);
    await process.finish(() => transport.close());
  });

  it('responds to server-initiated requests', async () => {
    const process = new FakeCodexProcess();
    const transport = new CodexAppServerTransport(process, {
      onServerRequest: async (request) => ({ accepted: request.method }),
    });

    process.send({ id: 'approval-1', method: 'approval', params: {} });
    await flushPromises();

    expect(process.messages()).toEqual([
      { id: 'approval-1', result: { accepted: 'approval' } },
    ]);
    await process.finish(() => transport.close());
  });

  it('returns a bounded error for unsupported server requests', async () => {
    const process = new FakeCodexProcess();
    const transport = new CodexAppServerTransport(process, {
      onServerRequest: () => {
        throw new CodexAppServerServerRequestError(-32601, 'Not supported');
      },
    });

    process.send({ id: 7, method: 'unsupported', params: {} });
    await flushPromises();

    expect(process.messages()).toEqual([
      { id: 7, error: { code: -32601, message: 'Not supported' } },
    ]);
    await process.finish(() => transport.close());
  });

  it.each([
    ['malformed JSON', '{not-json}\n'],
    ['empty line', '\n'],
  ])('rejects pending requests after %s', async (_label, line) => {
    const process = new FakeCodexProcess();
    const transport = new CodexAppServerTransport(process);
    const request = transport.request('test', {});

    process.stdout.write(line);

    await expect(request).rejects.toBeInstanceOf(AgentBackendProtocolError);
    expect(process.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('rejects oversized lines before parsing them', async () => {
    const process = new FakeCodexProcess();
    const transport = new CodexAppServerTransport(process, { maxLineBytes: 8 });
    const request = transport.request('test', {});

    process.stdout.write('123456789');

    await expect(request).rejects.toBeInstanceOf(AgentBackendProtocolError);
  });

  it('fails on unknown and duplicate response IDs', async () => {
    const unknownProcess = new FakeCodexProcess();
    const unknownTransport = new CodexAppServerTransport(unknownProcess);
    const pending = unknownTransport.request('test', {});
    unknownProcess.send({ id: 2, result: {} });
    await expect(pending).rejects.toBeInstanceOf(AgentBackendProtocolError);

    const duplicateProcess = new FakeCodexProcess();
    const duplicateTransport = new CodexAppServerTransport(duplicateProcess);
    const completed = duplicateTransport.request('test', {});
    duplicateProcess.send({ id: 1, result: {} });
    await completed;
    duplicateProcess.send({ id: 1, result: {} });
    expect(duplicateProcess.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('rejects pending requests when stdout closes or the process exits', async () => {
    const stdoutProcess = new FakeCodexProcess();
    const stdoutTransport = new CodexAppServerTransport(stdoutProcess);
    const stdoutRequest = stdoutTransport.request('test', {});
    stdoutProcess.stdout.end();
    await expect(stdoutRequest).rejects.toBeInstanceOf(
      AgentBackendProcessError
    );

    const exitProcess = new FakeCodexProcess();
    const exitTransport = new CodexAppServerTransport(exitProcess);
    const exitRequest = exitTransport.request('test', {});
    exitProcess.emitExit(12, null);
    await expect(exitRequest).rejects.toBeInstanceOf(AgentBackendProcessError);
  });

  it('rejects pending requests when the child process emits an error', async () => {
    const process = new FakeCodexProcess();
    const transport = new CodexAppServerTransport(process);
    const request = transport.request('test', {});

    process.emit('error', new Error('spawn failed'));

    await expect(request).rejects.toBeInstanceOf(AgentBackendProcessError);
  });

  it('rejects pending requests when the stdin pipe fails', async () => {
    const process = new FakeCodexProcess();
    const transport = new CodexAppServerTransport(process);
    const request = transport.request('test', {});

    process.stdin.emit('error', new Error('broken pipe'));

    await expect(request).rejects.toBeInstanceOf(AgentBackendProcessError);
  });

  it('keeps stderr as diagnostic output', async () => {
    const process = new FakeCodexProcess();
    const diagnostics: string[] = [];
    const transport = new CodexAppServerTransport(process, {
      onDiagnostic: (message) => diagnostics.push(message),
    });

    const stderrEnded = new Promise<void>((resolve) => {
      process.stderr.once('end', resolve);
    });
    process.stderr.write('first\nsecond');
    process.stderr.end();
    await stderrEnded;

    expect(diagnostics).toEqual(['first', 'second']);
    await process.finish(() => transport.close());
  });

  it('isolates diagnostic callback failures from the protocol', async () => {
    const process = new FakeCodexProcess();
    const transport = new CodexAppServerTransport(process, {
      onDiagnostic: () => {
        throw new Error('observer failed');
      },
    });
    const request = transport.request('test', {});

    process.stderr.write('diagnostic\n');
    process.send({ id: 1, result: { ok: true } });

    await expect(request).resolves.toEqual({ ok: true });
    await process.finish(() => transport.close());
  });

  it('times out one request without closing the transport', async () => {
    vi.useFakeTimers();
    try {
      const process = new FakeCodexProcess();
      const transport = new CodexAppServerTransport(process, {
        requestTimeoutMs: 20,
      });
      const timedOut = transport.request('slow', {});
      const rejected =
        expect(timedOut).rejects.toBeInstanceOf(AgentTimeoutError);
      await vi.advanceTimersByTimeAsync(20);
      await rejected;

      const next = transport.request('fast', {});
      process.send({ id: 2, result: { ok: true } });
      await expect(next).resolves.toEqual({ ok: true });
      process.emitExit(0, null);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ends stdin gracefully and forces termination after bounded time', async () => {
    vi.useFakeTimers();
    try {
      const process = new FakeCodexProcess();
      const transport = new CodexAppServerTransport(process, {
        shutdownTimeoutMs: 10,
      });
      const closing = transport.close();

      expect(process.stdin.writableEnded).toBe(true);
      await vi.advanceTimersByTimeAsync(10);
      expect(process.kill).toHaveBeenCalledWith('SIGTERM');
      await vi.advanceTimersByTimeAsync(10);
      expect(process.kill).toHaveBeenCalledWith('SIGKILL');
      process.emitExit(null, 'SIGKILL');
      await closing;
    } finally {
      vi.useRealTimers();
    }
  });
});
