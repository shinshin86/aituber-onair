import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceEngineError } from '../src/engines/VoiceEngineError';
import { fetchWithTimeout } from '../src/engines/internal/utils';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('engine internal utils', () => {
  it('should add an AbortSignal when fetching with timeout', async () => {
    const response = new Response('ok');
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithTimeout('https://example.com')).resolves.toBe(
      response,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('should preserve a caller-provided signal', async () => {
    const response = new Response('ok');
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    await fetchWithTimeout('https://example.com', {
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledWith('https://example.com', {
      signal: controller.signal,
    });
  });

  it('should wrap fetch failures as VoiceEngineError network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(fetchWithTimeout('https://example.com')).rejects.toMatchObject(
      {
        name: 'VoiceEngineError',
        kind: 'network',
      },
    );
    await expect(
      fetchWithTimeout('https://example.com'),
    ).rejects.toBeInstanceOf(VoiceEngineError);
  });
});
