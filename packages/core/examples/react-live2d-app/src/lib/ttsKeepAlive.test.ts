import { describe, expect, it, vi } from 'vitest';
import {
  getTtsSettingsEndpoint,
  normalizeTtsKeepAliveMinutes,
  syncTtsKeepAlive,
} from './ttsKeepAlive';

describe('TTS keep-alive settings', () => {
  it('enforces a minimum of five whole minutes', () => {
    expect(normalizeTtsKeepAliveMinutes(undefined)).toBe(5);
    expect(normalizeTtsKeepAliveMinutes(2)).toBe(5);
    expect(normalizeTtsKeepAliveMinutes(7.9)).toBe(7);
  });

  it('derives /v1/settings from the speech endpoint', () => {
    expect(
      getTtsSettingsEndpoint('http://localhost:8000/v1/audio/speech'),
    ).toBe('http://localhost:8000/v1/settings');
  });

  it('posts seconds to the TTS settings endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    await syncTtsKeepAlive(
      'http://localhost:8000/v1/audio/speech',
      8,
      '',
      fetcher,
    );

    expect(fetcher).toHaveBeenCalledWith('http://localhost:8000/v1/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keep_alive_seconds: 480 }),
    });
  });
});
