import {
  AgentBackendProcessError,
  AgentBackendProtocolError,
  AgentTimeoutError,
} from '../src/errors.js';
import {
  CursorAcpServerRequestError,
  CursorAcpTransport,
} from '../src/backends/cursor/transport.js';
import {
  FakeCursorProcess,
  flushPromises,
} from './helpers/fakeCursorProcess.js';

describe('CursorAcpTransport', () => {
  it('uses JSON-RPC 2.0, monotonic IDs, and interleaved correlation', async () => {
    const process = new FakeCursorProcess();
    const transport = new CursorAcpTransport(process);

    const first = transport.request<{ value: string }>('first', {});
    const second = transport.request<{ value: string }>('second', {});
    expect(process.messages()).toEqual([
      { jsonrpc: '2.0', id: 1, method: 'first', params: {} },
      { jsonrpc: '2.0', id: 2, method: 'second', params: {} },
    ]);

    process.send({ id: 2, result: { value: 'two' } });
    process.send({ id: 1, result: { value: 'one' } });
    await expect(first).resolves.toEqual({ value: 'one' });
    await expect(second).resolves.toEqual({ value: 'two' });
    await process.finish(() => transport.close());
  });

  it('delivers notifications and responds to agent requests', async () => {
    const process = new FakeCursorProcess();
    const notifications: unknown[] = [];
    const transport = new CursorAcpTransport(process, {
      onNotification: (notification) => notifications.push(notification),
      onServerRequest: async (request) => ({ accepted: request.method }),
    });

    process.send({ method: 'session/update', params: { value: 1 } });
    process.send({ id: 'agent-1', method: 'approval', params: {} });
    await flushPromises();

    expect(notifications).toEqual([
      {
        jsonrpc: '2.0',
        method: 'session/update',
        params: { value: 1 },
      },
    ]);
    expect(process.messages()).toContainEqual({
      jsonrpc: '2.0',
      id: 'agent-1',
      result: { accepted: 'approval' },
    });
    await process.finish(() => transport.close());
  });

  it('returns a method error for unsupported agent requests', async () => {
    const process = new FakeCursorProcess();
    const transport = new CursorAcpTransport(process, {
      onServerRequest: () => {
        throw new CursorAcpServerRequestError(-32601, 'Not supported');
      },
    });

    process.send({ id: 7, method: 'unsupported', params: {} });
    await flushPromises();
    expect(process.messages()).toContainEqual({
      jsonrpc: '2.0',
      id: 7,
      error: { code: -32601, message: 'Not supported' },
    });
    await process.finish(() => transport.close());
  });

  it.each([
    ['malformed JSON', '{not-json}\n'],
    ['missing JSON-RPC version', '{"id":1,"result":{}}\n'],
    ['empty line', '\n'],
  ])(
    'rejects pending requests and reports a diagnostic for %s',
    async (_label, line) => {
      const process = new FakeCursorProcess();
      const diagnostics: string[] = [];
      const transport = new CursorAcpTransport(process, {
        onDiagnostic: (message) => diagnostics.push(message),
      });
      const request = transport.request('test', {});

      process.stdout.write(line);

      await expect(request).rejects.toBeInstanceOf(AgentBackendProtocolError);
      expect(process.kill).toHaveBeenCalledWith('SIGTERM');
      if (_label === 'malformed JSON' || _label === 'empty line') {
        expect(diagnostics).not.toHaveLength(0);
      }
    }
  );

  it('rejects oversized lines before parsing them', async () => {
    const process = new FakeCursorProcess();
    const diagnostics: string[] = [];
    const transport = new CursorAcpTransport(process, {
      maxLineBytes: 8,
      onDiagnostic: (message) => diagnostics.push(message),
    });
    const request = transport.request('test', {});

    process.stdout.write('123456789');

    await expect(request).rejects.toBeInstanceOf(AgentBackendProtocolError);
    expect(diagnostics[0]).toContain('exceeded 8 bytes');
  });

  it('times out without treating a late response as fatal', async () => {
    vi.useFakeTimers();
    try {
      const process = new FakeCursorProcess();
      const transport = new CursorAcpTransport(process, {
        requestTimeoutMs: 20,
      });
      const timedOut = transport.request('slow', {});
      const rejected =
        expect(timedOut).rejects.toBeInstanceOf(AgentTimeoutError);
      await vi.advanceTimersByTimeAsync(20);
      await rejected;

      process.send({ id: 1, result: { late: true } });
      const next = transport.request('fast', {});
      process.send({ id: 2, result: { ok: true } });
      await expect(next).resolves.toEqual({ ok: true });
      process.emitExit(0, null);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects pending work on process exit', async () => {
    const process = new FakeCursorProcess();
    const transport = new CursorAcpTransport(process);
    const request = transport.request('test', {});

    process.emitExit(12, null);

    await expect(request).rejects.toBeInstanceOf(AgentBackendProcessError);
  });

  it('closes idempotently and escalates termination after bounded waits', async () => {
    vi.useFakeTimers();
    try {
      const process = new FakeCursorProcess();
      const transport = new CursorAcpTransport(process, {
        shutdownTimeoutMs: 10,
      });
      const first = transport.close();
      const second = transport.close();

      expect(process.stdin.writableEnded).toBe(true);
      await vi.advanceTimersByTimeAsync(10);
      expect(process.kill).toHaveBeenCalledWith('SIGTERM');
      await vi.advanceTimersByTimeAsync(10);
      process.emitExit(null, 'SIGKILL');
      await Promise.all([first, second]);
    } finally {
      vi.useRealTimers();
    }
  });
});
