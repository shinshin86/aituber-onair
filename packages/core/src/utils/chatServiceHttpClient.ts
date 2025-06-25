/**
 * HTTP client options
 */
export interface HttpClientOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP error response
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

/**
 * Unified HTTP client for chat services
 */
export class ChatServiceHttpClient {
  /**
   * Make a POST request with common error handling
   * @param url Request URL
   * @param body Request body
   * @param headers Request headers
   * @param options Additional options
   * @returns Response object
   */
  static async post(
    url: string,
    body: any,
    headers: Record<string, string> = {},
    options: HttpClientOptions = {},
  ): Promise<Response> {
    const { timeout = 30000, retries = 0, retryDelay = 1000 } = options;
    
    // Default headers
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const finalHeaders = { ...defaultHeaders, ...headers };
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: finalHeaders,
          body: typeof body === 'string' ? body : JSON.stringify(body),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorBody = await response.text();
          throw new HttpError(response.status, response.statusText, errorBody);
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Don't retry if aborted
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error('Request failed');
  }
  
  /**
   * Handle error response and throw appropriate error
   * @param res Response object
   * @returns Never (always throws)
   */
  static async handleErrorResponse(res: Response): Promise<never> {
    const errorBody = await res.text();
    throw new HttpError(res.status, res.statusText, errorBody);
  }
  
  /**
   * Make a GET request (for fetching images, etc.)
   * @param url Request URL
   * @param headers Request headers
   * @param options Additional options
   * @returns Response object
   */
  static async get(
    url: string,
    headers: Record<string, string> = {},
    options: HttpClientOptions = {},
  ): Promise<Response> {
    const { timeout = 30000, retries = 0, retryDelay = 1000 } = options;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorBody = await response.text();
          throw new HttpError(response.status, response.statusText, errorBody);
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Don't retry if aborted
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        
        // Wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error('Request failed');
  }
}