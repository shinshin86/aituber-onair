import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import {
  createClientSecretMiddleware,
  isAllowedLocalRequest,
} from './clientSecretMiddleware';

interface MiddlewareResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  nextCalled: boolean;
}

function request(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    method: 'POST',
    url: '/api/openai/realtime/client-secret',
    headers: {
      host: '127.0.0.1:5174',
      origin: 'http://127.0.0.1:5174',
    },
    ...overrides,
  } as IncomingMessage;
}

function invoke(
  options: Parameters<typeof createClientSecretMiddleware>[0],
  incoming = request()
): Promise<MiddlewareResult> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {};
    let nextCalled = false;
    let statusCode = 200;
    const response = {
      get statusCode() {
        return statusCode;
      },
      set statusCode(value: number) {
        statusCode = value;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      end(body = '') {
        resolve({
          statusCode,
          headers,
          body: String(body),
          nextCalled,
        });
      },
    } as unknown as ServerResponse;

    createClientSecretMiddleware(options)(incoming, response, () => {
      nextCalled = true;
      resolve({ statusCode: 200, headers, body: '', nextCalled });
    });
  });
}

describe('client-secret middleware', () => {
  it('allows only matching loopback hosts and origins', () => {
    expect(isAllowedLocalRequest(request())).toBe(true);
    expect(
      isAllowedLocalRequest(
        request({
          headers: {
            host: '127.0.0.1:5174',
            origin: 'https://example.com',
          },
        })
      )
    ).toBe(false);
  });

  it('rejects requests when the local server key is missing', async () => {
    const result = await invoke({ apiKey: '' });

    expect(result.statusCode).toBe(503);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).toContain('server-not-configured');
  });

  it('does not handle unrelated paths', async () => {
    const result = await invoke(
      { apiKey: 'server-key' },
      request({ url: '/other' })
    );

    expect(result.nextCalled).toBe(true);
  });

  it('returns only the short-lived secret from OpenAI', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ value: 'ek_test_secret', expires_at: 123456 })
        )
      );
    const result = await invoke({ apiKey: 'server-standard-key', fetchImpl });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      value: 'ek_test_secret',
      expires_at: 123456,
    });
    expect(result.body).not.toContain('server-standard-key');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
