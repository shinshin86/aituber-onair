import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installGASFetch } from '../../src/adapters/gasFetch';
import { ChatServiceHttpClient } from '../../src/utils/chatServiceHttpClient';

// Mock UrlFetchApp global
const mockUrlFetchApp = {
  fetch: vi.fn(),
};

// Mock response object that UrlFetchApp.fetch returns
const createMockGASResponse = (status: number, content: string) => ({
  getResponseCode: () => status,
  getContentText: () => content,
});

// Declare global for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var UrlFetchApp: typeof mockUrlFetchApp;
}

describe('gasFetch adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Install mock UrlFetchApp globally
    global.UrlFetchApp = mockUrlFetchApp;
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Reset to default fetch implementation
    ChatServiceHttpClient.setFetch((u, i) => fetch(u, i));
  });

  describe('installGASFetch', () => {
    it('should install GAS fetch implementation', () => {
      expect(() => installGASFetch()).not.toThrow();
    });

    it('should make successful GET request through UrlFetchApp', async () => {
      installGASFetch();

      const mockResponse = createMockGASResponse(200, '{"success": true}');
      mockUrlFetchApp.fetch.mockReturnValue(mockResponse);

      const response = await ChatServiceHttpClient.get(
        'https://api.example.com/test',
      );

      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: {},
          muteHttpExceptions: true,
        }),
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('200');
      expect(await response.text()).toBe('{"success": true}');
      expect(await response.json()).toEqual({ success: true });
    });

    it('should make successful POST request with JSON payload', async () => {
      installGASFetch();

      const mockResponse = createMockGASResponse(201, '{"created": true}');
      mockUrlFetchApp.fetch.mockReturnValue(mockResponse);

      const testData = { message: 'Hello World' };
      const response = await ChatServiceHttpClient.post(
        'https://api.example.com/create',
        testData,
      );

      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://api.example.com/create',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          payload: JSON.stringify(testData),
          muteHttpExceptions: true,
        }),
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ created: true });
    });

    it('should handle error responses correctly', async () => {
      installGASFetch();

      const mockResponse = createMockGASResponse(
        400,
        '{"error": "Bad Request"}',
      );
      mockUrlFetchApp.fetch.mockReturnValue(mockResponse);

      // ChatServiceHttpClient.get throws HttpError for non-OK responses
      await expect(
        ChatServiceHttpClient.get('https://api.example.com/error'),
      ).rejects.toThrow('HTTP 400: 400');

      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://api.example.com/error',
        expect.objectContaining({
          method: 'GET',
          muteHttpExceptions: true,
        }),
      );
    });

    it('should handle empty response body', async () => {
      installGASFetch();

      const mockResponse = createMockGASResponse(204, '');
      mockUrlFetchApp.fetch.mockReturnValue(mockResponse);

      const response = await ChatServiceHttpClient.get(
        'https://api.example.com/empty',
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(await response.json()).toBe(null);
    });
  });
});
