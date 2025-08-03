import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ChatServiceHttpClient,
  HttpError,
} from '../src/utils/chatServiceHttpClient';

describe('ChatServiceHttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    vi.mocked(global.fetch).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('post', () => {
    it('should make successful POST request', async () => {
      const mockResponse = new Response('OK', {
        status: 200,
        statusText: 'OK',
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const response = await ChatServiceHttpClient.post(
        'https://api.example.com/test',
        { data: 'test' },
      );

      expect(response).toBe(mockResponse);
    });

    it('should throw HttpError on non-OK response', async () => {
      const errorBody = 'Error message';
      const mockResponse = new Response(errorBody, {
        status: 400,
        statusText: 'Bad Request',
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      await expect(
        ChatServiceHttpClient.post('https://api.example.com/test', {}),
      ).rejects.toThrow(HttpError);
    });
  });

  describe('get', () => {
    it('should make successful GET request', async () => {
      const mockResponse = new Response('data', {
        status: 200,
        statusText: 'OK',
      });
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

      const response = await ChatServiceHttpClient.get(
        'https://api.example.com/test',
      );

      expect(response).toBe(mockResponse);
    });
  });

  describe('HttpError', () => {
    it('should create error with correct properties', () => {
      const error = new HttpError(
        500,
        'Internal Server Error',
        'Server crashed',
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('HttpError');
      expect(error.status).toBe(500);
      expect(error.statusText).toBe('Internal Server Error');
      expect(error.body).toBe('Server crashed');
      expect(error.message).toBe('HTTP 500: Internal Server Error');
    });
  });
});
