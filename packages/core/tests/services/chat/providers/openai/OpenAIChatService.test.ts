import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIChatService } from '../../../../../src/services/chat/providers/openai/OpenAIChatService.ts';
import {
  Message,
  MessageWithVision,
} from '../../../../../src/types';
import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  MODEL_GPT_4O_MINI,
  VISION_SUPPORTED_MODELS,
} from '../../../../../src/constants';

describe('OpenAIChatService', () => {
  const TEST_API_KEY = 'test-api-key';
  let service: OpenAIChatService;

  // utility function for mocking fetch
  function mockFetch(responseData: any, ok = true, statusText = 'OK') {
    // Streaming responseのモック用関数
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 400,
      statusText,
      json: async () => responseData,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: ' + JSON.stringify({
                choices: [{ delta: { content: 'Hello' } }]
              }) + '\n')
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: ' + JSON.stringify({
                choices: [{ delta: { content: ' from OpenAI!' } }]
              }) + '\n')
            })
            .mockResolvedValueOnce({ done: true })
        })
      }
    });
  }

  beforeEach(() => {
    // generate new instance for each test
    service = new OpenAIChatService(TEST_API_KEY);
    vi.resetAllMocks();
  });

  it('should return the default model if none is specified', () => {
    expect(service.getModel()).toBe(MODEL_GPT_4O_MINI);
  });

  it('should return the model passed into constructor', () => {
    const customModel = 'custom-openai-model';
    const customService = new OpenAIChatService(TEST_API_KEY, customModel);
    expect(customService.getModel()).toBe(customModel);
  });

  it('should call OpenAI API with correct endpoint and body in processChat', async () => {
    // mock response
    mockFetch({ choices: [{ message: { content: 'Hello from OpenAI!' } }] });

    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
    ];

    const onPartialResponse = vi.fn();
    const onCompleteResponse = vi.fn();

    await service.processChat(messages, onPartialResponse, onCompleteResponse);

    // check fetch call parameters
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const url = callArgs[0];
    const requestOptions = callArgs[1];
    
    // check if the URL is correct
    expect(url).toBe(ENDPOINT_OPENAI_CHAT_COMPLETIONS_API);

    // check the request options
    expect(requestOptions?.method).toBe('POST');
    expect(requestOptions?.headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_API_KEY}`
    });

    // check the body
    const bodyObj = JSON.parse(requestOptions?.body as string);
    expect(bodyObj.model).toBe(MODEL_GPT_4O_MINI);
    expect(bodyObj.messages).toEqual([
      { role: 'user', content: 'Hello' }
    ]);
    expect(bodyObj.stream).toBe(true);

    // check the callback calls
    expect(onPartialResponse).toHaveBeenCalledWith('Hello');
    expect(onPartialResponse).toHaveBeenCalledWith(' from OpenAI!');
    expect(onCompleteResponse).toHaveBeenCalledWith('Hello from OpenAI!');
  });

  it('should throw an error when OpenAI API returns a non-200 status', async () => {
    // mock error response
    mockFetch(
      {
        error: { message: 'Unauthorized' },
      },
      false, // ok = false
      'Unauthorized'
    );

    const messages: Message[] = [
      { role: 'user', content: 'Hi' },
    ];

    await expect(
      service.processChat(messages, vi.fn(), vi.fn())
    ).rejects.toThrow('OpenAI API error: Unauthorized');
  });

  it('should throw an error if response body is not readable', async () => {
    // mock when body is null
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
      body: null,
    });

    await expect(
      service.processChat([], vi.fn(), vi.fn())
    ).rejects.toThrow('Failed to get response reader');
  });

  it('should process vision chat with a vision-supported model', async () => {
    // specify a vision-supported model
    const visionModel = VISION_SUPPORTED_MODELS[0];
    service = new OpenAIChatService(TEST_API_KEY, MODEL_GPT_4O_MINI, visionModel);

    // mock response
    mockFetch({ choices: [{ message: { content: 'Vision response' } }] });

    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Check this image' },
          { type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } },
        ],
      },
    ];

    const onPartialResponse = vi.fn();
    const onCompleteResponse = vi.fn();

    await service.processVisionChat(messages, onPartialResponse, onCompleteResponse);

    // vision API endpoint call
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    
    // check request body
    const bodyObj = JSON.parse(callArgs[1]?.body as string);
    expect(bodyObj.model).toBe(visionModel);
    expect(bodyObj.messages).toEqual(messages);
    expect(bodyObj.stream).toBe(true);
    
    // check callbacks
    expect(onPartialResponse).toHaveBeenCalledWith('Hello');
    expect(onPartialResponse).toHaveBeenCalledWith(' from OpenAI!');
    expect(onCompleteResponse).toHaveBeenCalledWith('Hello from OpenAI!');
  });

  it('should throw error if vision model does not support vision', async () => {
    service = new OpenAIChatService(
      TEST_API_KEY, 
      MODEL_GPT_4O_MINI, 
      'non-vision-model'
    );

    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Test' }],
      },
    ];

    await expect(
      service.processVisionChat(messages, vi.fn(), vi.fn())
    ).rejects.toThrow(
      /Model non-vision-model does not support vision capabilities/
    );
  });
}); 