import type { IncomingMessage, ServerResponse } from 'node:http';

export const CLIENT_SECRET_PATH = '/api/openai/realtime/client-secret';

const OPENAI_CLIENT_SECRET_URL =
  'https://api.openai.com/v1/realtime/client_secrets';
const TRANSCRIPTION_MODEL = 'gpt-live-transcribe';
const CLIENT_SECRET_TTL_SECONDS = 600;
const SAFETY_IDENTIFIER = 'aituber-onair-transcription-browser-example';

type NextFunction = () => void;

export interface ClientSecretMiddlewareOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export type ClientSecretMiddleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: NextFunction
) => void;

interface ClientSecretPayload {
  value?: unknown;
  expires_at?: unknown;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

export function isAllowedLocalRequest(request: IncomingMessage): boolean {
  const host = request.headers.host;
  const origin = request.headers.origin;
  if (!host || !origin) return false;

  try {
    const hostUrl = new URL(`http://${host}`);
    const originUrl = new URL(origin);
    return (
      isLoopbackHostname(hostUrl.hostname) &&
      isLoopbackHostname(originUrl.hostname) &&
      originUrl.host === host &&
      (originUrl.protocol === 'http:' || originUrl.protocol === 'https:')
    );
  } catch {
    return false;
  }
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: ClientSecretMiddlewareOptions
): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    sendJson(response, 405, {
      error: { code: 'method-not-allowed', message: 'Use POST.' },
    });
    return;
  }

  if (!isAllowedLocalRequest(request)) {
    sendJson(response, 403, {
      error: {
        code: 'forbidden-origin',
        message: 'Only same-origin loopback requests are accepted.',
      },
    });
    return;
  }

  if (!options.apiKey.trim()) {
    sendJson(response, 503, {
      error: {
        code: 'server-not-configured',
        message: 'Set OPENAI_API_KEY in examples/browser-basic/.env.local.',
      },
    });
    return;
  }

  try {
    const upstream = await (options.fetchImpl ?? fetch)(
      OPENAI_CLIENT_SECRET_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Safety-Identifier': SAFETY_IDENTIFIER,
        },
        body: JSON.stringify({
          expires_after: {
            anchor: 'created_at',
            seconds: CLIENT_SECRET_TTL_SECONDS,
          },
          session: {
            type: 'transcription',
            audio: {
              input: {
                transcription: { model: TRANSCRIPTION_MODEL },
                turn_detection: { type: 'server_vad' },
              },
            },
          },
        }),
      }
    );

    if (!upstream.ok) {
      const authenticationFailure =
        upstream.status === 401 || upstream.status === 403;
      sendJson(response, authenticationFailure ? 401 : 502, {
        error: {
          code: authenticationFailure
            ? 'openai-authentication-failed'
            : 'openai-upstream-failed',
          message: authenticationFailure
            ? 'OpenAI rejected the server credential.'
            : 'OpenAI could not create a Realtime client secret.',
        },
      });
      return;
    }

    const payload = (await upstream.json()) as ClientSecretPayload;
    if (typeof payload.value !== 'string' || !payload.value.trim()) {
      sendJson(response, 502, {
        error: {
          code: 'invalid-openai-response',
          message: 'OpenAI returned an invalid client-secret response.',
        },
      });
      return;
    }

    sendJson(response, 200, {
      value: payload.value,
      ...(typeof payload.expires_at === 'number'
        ? { expires_at: payload.expires_at }
        : {}),
    });
  } catch {
    sendJson(response, 502, {
      error: {
        code: 'openai-upstream-unavailable',
        message: 'OpenAI could not create a Realtime client secret.',
      },
    });
  }
}

export function createClientSecretMiddleware(
  options: ClientSecretMiddlewareOptions
): ClientSecretMiddleware {
  return (request, response, next) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path !== CLIENT_SECRET_PATH) {
      next();
      return;
    }
    void handleRequest(request, response, options);
  };
}
