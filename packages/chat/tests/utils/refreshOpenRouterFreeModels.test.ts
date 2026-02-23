import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshOpenRouterFreeModels } from '../../src/utils';

const mockJsonResponse = (payload: unknown): Response =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(''),
  }) as unknown as Response;

const mockTextResponse = (
  status: number,
  statusText: string,
  text: string,
): Response =>
  ({
    ok: false,
    status,
    statusText,
    json: vi.fn().mockRejectedValue(new Error('Not JSON')),
    text: vi.fn().mockResolvedValue(text),
  }) as unknown as Response;

describe('refreshOpenRouterFreeModels', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('returns only working free models and captures failures', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: [
            { id: 'openai/gpt-oss-20b:free' },
            { id: 'openai/gpt-4o' },
            { id: 'z-ai/glm-4.5-air:free' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          choices: [{ message: { role: 'assistant', content: 'OK' } }],
        }),
      )
      .mockResolvedValueOnce(
        mockTextResponse(429, 'Too Many Requests', 'rate limited'),
      );

    const result = await refreshOpenRouterFreeModels({
      apiKey: 'sk-or-test',
      concurrency: 1,
    });

    expect(result.working).toEqual(['openai/gpt-oss-20b:free']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe('z-ai/glm-4.5-air:free');
    expect(result.failed[0].reason).toContain('HTTP 429');
    expect(typeof result.fetchedAt).toBe('number');
  });

  it('marks probe as failed when JSON parsing fails', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        mockJsonResponse({
          models: [{ id: 'openai/gpt-oss-20b:free' }],
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockRejectedValue(new Error('Unexpected token')),
        text: vi.fn().mockResolvedValue('not-json'),
      } as unknown as Response);

    const result = await refreshOpenRouterFreeModels({
      apiKey: 'sk-or-test',
      concurrency: 1,
    });

    expect(result.working).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toContain('JSON parse failed');
  });

  it('returns timeout reason when probe request aborts', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: [{ id: 'openai/gpt-oss-20b:free' }],
        }),
      )
      .mockRejectedValueOnce(abortError);

    const result = await refreshOpenRouterFreeModels({
      apiKey: 'sk-or-test',
      timeoutMs: 5,
      concurrency: 1,
    });

    expect(result.working).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toContain('Timeout after 5ms');
  });
});
