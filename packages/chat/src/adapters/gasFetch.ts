import { ChatServiceHttpClient } from '../utils/chatServiceHttpClient';

// Declare GAS global to avoid leaking types into public .d.ts
declare const UrlFetchApp: any;

/**
 * Installs a fetch implementation backed by Google Apps Script UrlFetchApp.
 * Provides a minimal Response-like object for non-streaming requests.
 */
export function installGASFetch(): void {
  ChatServiceHttpClient.setFetch(async (url, init: RequestInit = {}) => {
    const method = (init.method || 'GET').toString().toUpperCase();

    // Normalize headers to a Record<string, string>
    const rawHeaders = init.headers as
      | Headers
      | Record<string, unknown>
      | Array<[string, string]>
      | undefined;
    const headers: Record<string, string> = {};
    if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) headers[k] = String(v);
    } else if (rawHeaders && typeof rawHeaders === 'object') {
      for (const [k, v] of Object.entries(rawHeaders)) headers[k] = String(v);
    }

    // Convert RequestInit to UrlFetchApp parameters
    const params: Record<string, unknown> = {
      method,
      headers,
      muteHttpExceptions: true,
    };

    // Body handling: accept string or object (serialize as JSON)
    const body = (init as unknown as { body?: unknown }).body;
    if (typeof body === 'string') {
      params.payload = body;
    } else if (body != null) {
      if (!headers['Content-Type'])
        headers['Content-Type'] = 'application/json';
      params.payload = JSON.stringify(body);
    }

    const res = UrlFetchApp.fetch(url, params);
    const status: number = res.getResponseCode();
    const text: string = res.getContentText();

    // Return a minimal Response-like object used by the library.
    const response: Partial<Response> = {
      ok: status >= 200 && status < 300,
      status,
      statusText: String(status),
      text: async () => text,
      json: async () => (text ? JSON.parse(text) : null),
    };

    return response as Response;
  });
}
