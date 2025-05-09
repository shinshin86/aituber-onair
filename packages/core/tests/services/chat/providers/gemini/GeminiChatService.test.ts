import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiChatService } from '../../../../../src/services/chat/providers/gemini/GeminiChatService.ts';
import { Message, MessageWithVision } from '../../../../../src/types';
import {
  ENDPOINT_GEMINI_API,
  MODEL_GEMINI_2_0_FLASH_LITE,
  GEMINI_VISION_SUPPORTED_MODELS,
} from '../../../../../src/constants';

describe('GeminiChatService', () => {
  const TEST_API_KEY = 'test-api-key';
  let service: GeminiChatService;

  // utility function for mocking fetch
  function mockFetch(responseData: any, ok = true, statusText = 'OK') {
    const encoder = new TextEncoder();
    const responseString = JSON.stringify(responseData);
    const responseStream = new ReadableStream<Uint8Array>({
      start(controller) {
        // all data is enqueued at once
        controller.enqueue(encoder.encode(responseString));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 400,
      statusText,
      json: async () => responseData,
      body: responseStream,
    });
  }

  beforeEach(() => {
    // generate new instance for each test
    service = new GeminiChatService(TEST_API_KEY);
    vi.resetAllMocks();

    vi.spyOn(
      GeminiChatService.prototype as any,
      'blobToBase64',
    ).mockImplementation(() =>
      Promise.resolve('data:image/jpeg;base64,mockImageData'),
    );

    // Mock parseStream to simulate the correct behavior
    vi.spyOn(service as any, 'parseStream').mockImplementation(function (
      this: any,
      ...args: any[]
    ) {
      const onPartial = args[1] as ((text: string) => void) | undefined;
      const mockBlocks = [{ type: 'text', text: 'Hello from Gemini!' }];
      if (onPartial) {
        onPartial('Hello from Gemini!');
      }
      return Promise.resolve({ blocks: mockBlocks, stop_reason: 'end' });
    });
  });

  it('should return the default model if none is specified', () => {
    expect(service.getModel()).toBe(MODEL_GEMINI_2_0_FLASH_LITE);
  });

  it('should return the model passed into constructor', () => {
    const customModel = 'custom-gemini-model';
    const customService = new GeminiChatService(TEST_API_KEY, customModel);
    expect(customService.getModel()).toBe(customModel);
  });

  it('should call Gemini API with correct endpoint and body in processChat', async () => {
    // mock response
    const mockApiResponse = [
      {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello from Gemini!' }],
            },
          },
        ],
      },
    ];

    // mock fetch
    mockFetch(mockApiResponse);

    const messages: Message[] = [{ role: 'user', content: 'Hello' }];

    const onPartialResponse = vi.fn();
    const onCompleteResponse = vi.fn();

    await service.processChat(messages, onPartialResponse, onCompleteResponse);

    // check fetch call parameters
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const url = callArgs[0];
    const requestOptions = callArgs[1];

    // check if the URL contains the model name and API key
    expect(url).toMatch(
      new RegExp(
        `${ENDPOINT_GEMINI_API}/v1beta/models/${MODEL_GEMINI_2_0_FLASH_LITE}:streamGenerateContent`,
      ),
    );
    expect(url).toContain('key=test-api-key');

    // check the JSON content of the body
    const bodyObj = JSON.parse(requestOptions?.body as string);
    expect(bodyObj.contents).toEqual([
      {
        role: 'user',
        parts: [{ text: 'Hello' }],
      },
    ]);
    expect(bodyObj.generationConfig).toBeDefined();

    // check the callback calls
    expect(onCompleteResponse).toHaveBeenCalledWith('Hello from Gemini!');
  });

  it('should throw an error when Gemini API returns a non-200 status', async () => {
    // mock error response
    mockFetch(
      {
        error: { message: 'Unauthorized' },
      },
      false, // ok = false
      'Unauthorized',
    );

    const messages: Message[] = [{ role: 'user', content: 'Hi' }];

    await expect(
      service.processChat(messages, vi.fn(), vi.fn()),
    ).rejects.toThrow('Gemini HTTP 400');
  });

  it('should throw an error if response body is not readable', async () => {
    // mock when body is null
    vi.spyOn(service as any, 'callGemini').mockImplementation(() => {
      throw new Error("Cannot read properties of null (reading 'getReader')");
    });

    await expect(service.processChat([], vi.fn(), vi.fn())).rejects.toThrow(
      'Cannot read properties of null',
    );
  });

  it('should handle JSON parse error in processChat', async () => {
    // mock when JSON parse fails
    const encoder = new TextEncoder();
    const invalidJson = '{invalidJson}';
    const responseStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(invalidJson));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Invalid JSON');
      },
      body: responseStream,
    });

    // Override parseStream mock to throw an error
    vi.spyOn(service as any, 'parseStream').mockImplementation(() => {
      throw new Error('Failed to parse Gemini response');
    });

    await expect(service.processChat([], vi.fn(), vi.fn())).rejects.toThrow(
      /Failed to parse Gemini response/,
    );
  });

  it('should process vision chat with a vision-supported model', async () => {
    // specify a vision-supported model
    const visionModel = GEMINI_VISION_SUPPORTED_MODELS[0];
    service = new GeminiChatService(
      TEST_API_KEY,
      MODEL_GEMINI_2_0_FLASH_LITE,
      visionModel,
    );

    // Override parseStream again for this test
    vi.spyOn(service as any, 'parseStream').mockImplementation(function (
      this: any,
      ...args: any[]
    ) {
      const onPartial = args[1] as ((text: string) => void) | undefined;
      const mockBlocks = [{ type: 'text', text: 'Vision response' }];
      if (onPartial) {
        onPartial('Vision response');
      }
      return Promise.resolve({ blocks: mockBlocks, stop_reason: 'end' });
    });

    // mock response
    const mockApiResponse = [
      {
        candidates: [
          {
            content: {
              parts: [{ text: 'Vision response' }],
            },
          },
        ],
      },
    ];
    mockFetch(mockApiResponse);

    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Check this image' },
          {
            type: 'image_url',
            image_url: { url: 'http://example.com/image.jpg' },
          },
        ],
      },
    ];

    // mock image fetch (mock the part that converts to Base64)
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        // image fetch
        ok: true,
        blob: async () =>
          new Blob(['dummy image data'], { type: 'image/jpeg' }),
      })
      .mockResolvedValueOnce({
        // Gemini API
        ok: true,
        body: new ReadableStream({
          start(controller) {
            const data = JSON.stringify(mockApiResponse);
            controller.enqueue(new TextEncoder().encode(data));
            controller.close();
          },
        }),
        json: async () => mockApiResponse,
      });

    const onPartialResponse = vi.fn();
    const onCompleteResponse = vi.fn();

    await service.processVisionChat(
      messages,
      onPartialResponse,
      onCompleteResponse,
    );

    // vision API endpoint call
    expect(global.fetch).toHaveBeenCalledTimes(2);
    // 1st call is image fetch, 2nd call is Gemini API
    expect(onCompleteResponse).toHaveBeenCalledWith('Vision response');
  });

  it('should throw error if vision model does not support vision', async () => {
    expect(
      () =>
        new GeminiChatService(
          TEST_API_KEY,
          MODEL_GEMINI_2_0_FLASH_LITE,
          'non-vision-model',
        ),
    ).toThrow(/Model non-vision-model does not support vision capabilities/);
  });

  it('should call chatOnce directly and return tool chat completion', async () => {
    // Mock response for direct chatOnce call
    const mockApiResponse = [
      {
        candidates: [
          {
            content: {
              parts: [{ text: 'Direct response' }],
            },
          },
        ],
      },
    ];
    mockFetch(mockApiResponse);

    // Override parseStream for this test
    vi.spyOn(service as any, 'parseStream').mockImplementation(async () => {
      return {
        blocks: [{ type: 'text', text: 'Direct response' }],
        stop_reason: 'end',
      };
    });

    const messages: Message[] = [{ role: 'user', content: 'Hello' }];
    const result = await service.chatOnce(messages);

    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'Direct response' }],
      stop_reason: 'end',
    });
  });

  it('should handle tool use in chatOnce', async () => {
    // Create a service with tools
    const serviceWithTools = new GeminiChatService(
      TEST_API_KEY,
      MODEL_GEMINI_2_0_FLASH_LITE,
      MODEL_GEMINI_2_0_FLASH_LITE,
      [
        {
          name: 'test_tool',
          description: 'A test tool',
          parameters: { type: 'object', properties: {} },
        },
      ],
    );

    // Mock parseStream to return a tool_use
    vi.spyOn(serviceWithTools as any, 'parseStream').mockImplementation(
      async () => {
        return {
          blocks: [
            { type: 'tool_use', id: '123', name: 'test_tool', input: {} },
          ],
          stop_reason: 'tool_use',
        };
      },
    );

    // Mock fetch for API call
    mockFetch({});

    const messages: Message[] = [{ role: 'user', content: 'Use a tool' }];
    const result = await serviceWithTools.chatOnce(messages);

    expect(result).toEqual({
      blocks: [{ type: 'tool_use', id: '123', name: 'test_tool', input: {} }],
      stop_reason: 'tool_use',
    });
  });
});
