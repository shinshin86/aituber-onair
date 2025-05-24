import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIChatService } from '../../../../../src/services/chat/providers/openai/OpenAIChatService.ts';
import { Message, MessageWithVision } from '../../../../../src/types';
import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  MODEL_GPT_4O_MINI,
  VISION_SUPPORTED_MODELS,
} from '../../../../../src/constants';

describe('OpenAIChatService', () => {
  const TEST_API_KEY = 'test-api-key';
  let service: OpenAIChatService;

  // utility function for mocking fetch
  function mockFetch(responseData: any, ok = true, statusText = 'OK') {
    // mock streaming response with chunks that simulate OpenAI's format
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 400,
      statusText,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: ' +
                  JSON.stringify({
                    choices: [{ delta: { content: 'Hello' } }],
                  }) +
                  '\n\n',
              ),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: ' +
                  JSON.stringify({
                    choices: [{ delta: { content: ' from OpenAI!' } }],
                  }) +
                  '\n\n',
              ),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
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

    const messages: Message[] = [{ role: 'user', content: 'Hello' }];

    const onPartialResponse = vi.fn();
    const onCompleteResponse = vi.fn();

    // Override parseStream to simulate correctly what the implementation would do
    vi.spyOn(service as any, 'parseStream').mockResolvedValueOnce({
      blocks: [{ type: 'text', text: 'Hello from OpenAI!' }],
      stop_reason: 'end',
    });

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
      Authorization: `Bearer ${TEST_API_KEY}`,
    });

    // check the body
    const bodyObj = JSON.parse(requestOptions?.body as string);
    expect(bodyObj.model).toBe(MODEL_GPT_4O_MINI);
    expect(bodyObj.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    expect(bodyObj.stream).toBe(true);

    // check the callback calls - for processChat, the call is made to onCompleteResponse only
    expect(onCompleteResponse).toHaveBeenCalledWith('Hello from OpenAI!');
  });

  it('should throw an error when OpenAI API returns a non-200 status', async () => {
    // mock error response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ error: { message: 'Unauthorized' } }),
    });

    const messages: Message[] = [{ role: 'user', content: 'Hi' }];

    await expect(
      service.processChat(messages, vi.fn(), vi.fn()),
    ).rejects.toThrow('OpenAI error: {"error":{"message":"Unauthorized"}}');
  });

  it('should throw an error if response body is not readable', async () => {
    // mock when body is null
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
      body: null,
    });

    await expect(service.processChat([], vi.fn(), vi.fn())).rejects.toThrow(
      'Cannot read properties of null',
    );
  });

  it('should process vision chat with a vision-supported model', async () => {
    // specify a vision-supported model
    const visionModel = VISION_SUPPORTED_MODELS[0];
    service = new OpenAIChatService(
      TEST_API_KEY,
      MODEL_GPT_4O_MINI,
      visionModel,
    );

    // mock response
    mockFetch({ choices: [{ message: { content: 'Vision response' } }] });

    // Override parseStream to simulate correctly what the implementation would do
    vi.spyOn(service as any, 'parseStream').mockResolvedValueOnce({
      blocks: [{ type: 'text', text: 'Hello from OpenAI!' }],
      stop_reason: 'end',
    });

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

    const onPartialResponse = vi.fn();
    const onCompleteResponse = vi.fn();

    await service.processVisionChat(
      messages,
      onPartialResponse,
      onCompleteResponse,
    );

    // vision API endpoint call
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(global.fetch).mock.calls[0];

    // check request body
    const bodyObj = JSON.parse(callArgs[1]?.body as string);
    expect(bodyObj.model).toBe(visionModel);
    expect(bodyObj.messages).toEqual(messages);
    expect(bodyObj.stream).toBe(true);

    // check callbacks
    expect(onCompleteResponse).toHaveBeenCalledWith('Hello from OpenAI!');
  });

  it('should throw error if vision model does not support vision', async () => {
    expect(
      () =>
        new OpenAIChatService(
          TEST_API_KEY,
          MODEL_GPT_4O_MINI,
          'non-vision-model',
        ),
    ).toThrow(/Model non-vision-model does not support vision capabilities/);
  });

  it('should call chatOnce directly and return tool chat completion', async () => {
    // mock response for direct chatOnce call
    mockFetch({ choices: [{ message: { content: 'Direct response' } }] });

    // Override parseStream to simulate correctly what the implementation would do
    vi.spyOn(service as any, 'parseStream').mockResolvedValueOnce({
      blocks: [{ type: 'text', text: 'Direct response' }],
      stop_reason: 'end',
    });

    const messages: Message[] = [{ role: 'user', content: 'Hello' }];

    const result = await service.chatOnce(messages, true, vi.fn());

    expect(result).toEqual({
      blocks: [{ type: 'text', text: 'Direct response' }],
      stop_reason: 'end',
    });
  });

  it('should throw error when processChat receives tool_use with tools enabled', async () => {
    // Create service with tools enabled
    const toolEnabledService = new OpenAIChatService(
      TEST_API_KEY,
      MODEL_GPT_4O_MINI,
      MODEL_GPT_4O_MINI,
      [
        {
          name: 'test_tool',
          description: 'test',
          parameters: { type: 'object' },
        },
      ],
    );

    // Mock chatOnce to return tool_use
    vi.spyOn(toolEnabledService as any, 'chatOnce').mockResolvedValueOnce({
      blocks: [{ type: 'tool_use', id: 'call1', name: 'test_tool', input: {} }],
      stop_reason: 'tool_use',
    });

    const messages: Message[] = [{ role: 'user', content: 'Hello' }];

    await expect(
      toolEnabledService.processChat(messages, vi.fn(), vi.fn()),
    ).rejects.toThrow(
      'processChat received tool_calls. ChatProcessor must use chatOnce() loop when tools are enabled.',
    );
  });

  it('should throw error when processVisionChat receives tool_use with tools enabled', async () => {
    // Create service with tools enabled
    const toolEnabledService = new OpenAIChatService(
      TEST_API_KEY,
      MODEL_GPT_4O_MINI,
      VISION_SUPPORTED_MODELS[0],
      [
        {
          name: 'test_tool',
          description: 'test',
          parameters: { type: 'object' },
        },
      ],
    );

    // Mock visionChatOnce to return tool_use
    vi.spyOn(toolEnabledService as any, 'visionChatOnce').mockResolvedValueOnce(
      {
        blocks: [
          { type: 'tool_use', id: 'call1', name: 'test_tool', input: {} },
        ],
        stop_reason: 'tool_use',
      },
    );

    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this' },
          {
            type: 'image_url',
            image_url: { url: 'http://example.com/img.jpg' },
          },
        ],
      },
    ];

    await expect(
      toolEnabledService.processVisionChat(messages, vi.fn(), vi.fn()),
    ).rejects.toThrow(
      'processVisionChat received tool_calls. ChatProcessor must use visionChatOnce() loop when tools are enabled.',
    );
  });
});

// Additional tests for untested functionality
describe('OpenAIChatService advanced features', () => {
  const TEST_API_KEY = 'test-api-key';

  const baseTool = {
    name: 'my_tool',
    description: 'desc',
    parameters: { type: 'object' },
  } as const;

  it('buildRequestBody creates proper payload for Chat Completions', () => {
    const service = new OpenAIChatService(TEST_API_KEY, undefined, undefined, [
      baseTool,
    ]);

    const messages: Message[] = [{ role: 'user', content: 'hi' }];
    const body = (service as any).buildRequestBody(
      messages,
      service.getModel(),
      true,
    );

    expect(body).toEqual({
      model: service.getModel(),
      stream: true,
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'my_tool',
            description: 'desc',
            parameters: { type: 'object' },
          },
        },
      ],
      tool_choice: 'auto',
    });
  });

  it('buildRequestBody creates proper payload for Responses API with MCP', () => {
    const mcpServers = [
      {
        type: 'url' as const,
        url: 'http://mcp.example',
        name: 'mcp1',
        tool_configuration: { allowed_tools: ['my_tool'] },
        authorization_token: 'token123',
      },
    ];

    const service = new OpenAIChatService(
      TEST_API_KEY,
      undefined,
      undefined,
      [baseTool],
      ENDPOINT_OPENAI_RESPONSES_API,
      mcpServers,
    );

    const messages: Message[] = [{ role: 'user', content: 'hello' }];
    const body = (service as any).buildRequestBody(
      messages,
      service.getModel(),
      false,
    );

    expect(body.model).toBe(service.getModel());
    expect(body.stream).toBe(false);
    expect(body.input).toEqual([{ role: 'user', content: 'hello' }]);
    expect(body.messages).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
    expect(body.tools).toEqual([
      {
        type: 'function',
        name: 'my_tool',
        description: 'desc',
        parameters: { type: 'object' },
      },
      {
        type: 'mcp',
        server_label: 'mcp1',
        server_url: 'http://mcp.example',
        require_approval: 'never',
        allowed_tools: ['my_tool'],
        headers: { Authorization: 'Bearer token123' },
      },
    ]);
  });

  it('validateMCPCompatibility throws with unsupported endpoint', () => {
    const mcpServers = [
      {
        type: 'url' as const,
        url: 'http://mcp.example',
        name: 'mcp1',
      },
    ];

    const service = new OpenAIChatService(
      TEST_API_KEY,
      undefined,
      undefined,
      [],
      ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
      mcpServers,
    );

    expect(() => (service as any).validateMCPCompatibility()).toThrow(
      /MCP servers are not supported/,
    );
  });

  it('parseResponsesOneShot converts output items', () => {
    const service = new OpenAIChatService(TEST_API_KEY);
    const data = {
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'Hi' }],
        },
        {
          type: 'function_call',
          id: 'call1',
          name: 'my_tool',
          arguments: '{"foo":1}',
        },
      ],
    };

    const result = (service as any).parseResponsesOneShot(data);
    expect(result).toEqual({
      blocks: [
        { type: 'text', text: 'Hi' },
        { type: 'tool_use', id: 'call1', name: 'my_tool', input: { foo: 1 } },
      ],
      stop_reason: 'tool_use',
    });
  });

  it('parseResponsesStream handles SSE events', async () => {
    const service = new OpenAIChatService(TEST_API_KEY);
    const sse =
      'event: response.output_item.added\n' +
      'data: {"item":{"type":"message","content":[{"type":"output_text","text":"Hi"}]}}\n\n' +
      'event: response.output_item.added\n' +
      'data: {"item":{"type":"function_call","id":"call1","name":"my_tool","arguments":"{\\"foo\\":1}"}}\n\n';

    const onPartial = vi.fn();
    const res = new Response(sse);
    const result = await (service as any).parseResponsesStream(res, onPartial);

    expect(onPartial).toHaveBeenCalledWith('Hi');
    expect(result).toEqual({
      blocks: [
        { type: 'text', text: 'Hi' },
        { type: 'tool_use', id: 'call1', name: 'my_tool', input: { foo: 1 } },
      ],
      stop_reason: 'tool_use',
    });
  });
});

describe('OpenAIChatService parse helpers', () => {
  const TEST_API_KEY = 'test-api-key';
  let service: OpenAIChatService;

  beforeEach(() => {
    service = new OpenAIChatService(TEST_API_KEY);
  });

  it('parseOneShot should extract tool calls', () => {
    const data = {
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: 'call1',
                function: { name: 'my_tool', arguments: '{"foo":1}' },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    };
    const result = (service as any).parseOneShot(data);
    expect(result).toEqual({
      blocks: [
        { type: 'tool_use', id: 'call1', name: 'my_tool', input: { foo: 1 } },
      ],
      stop_reason: 'tool_use',
    });
  });

  it('parseStream should extract tool calls from SSE', async () => {
    const sse =
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n' +
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call1","function":{"name":"my_tool","arguments":"{\\"foo\\":1}"}}]}}]}\n\n' +
      'data: [DONE]\n\n';
    const res = new Response(sse);
    const result = await (service as any).parseStream(res, () => {});
    expect(result).toEqual({
      blocks: [
        { type: 'text', text: 'Hi' },
        { type: 'tool_use', id: 'call1', name: 'my_tool', input: { foo: 1 } },
      ],
      stop_reason: 'tool_use',
    });
  });
});

describe('OpenAIChatService error handling and edge cases', () => {
  const TEST_API_KEY = 'test-api-key';
  let service: OpenAIChatService;

  // utility function for mocking fetch
  function mockFetch(responseData: any, ok = true, statusText = 'OK') {
    // mock streaming response with chunks that simulate OpenAI's format
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 400,
      statusText,
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: ' +
                  JSON.stringify({
                    choices: [{ delta: { content: 'Hello' } }],
                  }) +
                  '\n\n',
              ),
            })
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: ' +
                  JSON.stringify({
                    choices: [{ delta: { content: ' from OpenAI!' } }],
                  }) +
                  '\n\n',
              ),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });
  }

  beforeEach(() => {
    service = new OpenAIChatService(TEST_API_KEY);
    vi.resetAllMocks();
  });

  it('should handle fetch network errors', async () => {
    // Simulate network error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const messages: Message[] = [{ role: 'user', content: 'Hello' }];

    await expect(
      service.processChat(messages, vi.fn(), vi.fn()),
    ).rejects.toThrow('Network error');
  });

  it('should handle empty messages array', async () => {
    // Mock callOpenAI to return a proper response
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"Empty response"}}]}\n\n',
              ),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    };
    vi.spyOn(service as any, 'callOpenAI').mockResolvedValueOnce(mockResponse);

    const messages: Message[] = [];
    const onCompleteResponse = vi.fn();

    await service.processChat(messages, vi.fn(), onCompleteResponse);

    expect(onCompleteResponse).toHaveBeenCalledWith('Empty response');
  });

  it('should handle streaming parse errors gracefully', async () => {
    // Mock streaming response with invalid JSON
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: invalid json\n\n'),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const messages: Message[] = [{ role: 'user', content: 'Hello' }];

    await expect(
      service.processChat(messages, vi.fn(), vi.fn()),
    ).rejects.toThrow();
  });

  it('should handle visionChatOnce with non-streaming mode', async () => {
    const visionModel = VISION_SUPPORTED_MODELS[0];
    service = new OpenAIChatService(
      TEST_API_KEY,
      MODEL_GPT_4O_MINI,
      visionModel,
    );

    mockFetch({ choices: [{ message: { content: 'Vision analysis' } }] });

    // Override parseOneShot to simulate correct implementation behavior
    vi.spyOn(service as any, 'parseOneShot').mockReturnValueOnce({
      blocks: [{ type: 'text', text: 'Vision analysis' }],
      stop_reason: 'end',
    });

    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this' },
          {
            type: 'image_url',
            image_url: { url: 'http://example.com/img.jpg' },
          },
        ],
      },
    ];

    const result = await service.visionChatOnce(messages, false, vi.fn());

    expect(result.blocks).toEqual([{ type: 'text', text: 'Vision analysis' }]);
    expect(result.stop_reason).toBe('end');
  });

  it('should handle getVisionModel method', () => {
    const visionModel = VISION_SUPPORTED_MODELS[0];
    service = new OpenAIChatService(
      TEST_API_KEY,
      MODEL_GPT_4O_MINI,
      visionModel,
    );

    expect(service.getVisionModel()).toBe(visionModel);
  });

  it('should handle different HTTP error status codes', async () => {
    const errorCases = [
      { status: 400, statusText: 'Bad Request' },
      { status: 403, statusText: 'Forbidden' },
      { status: 429, statusText: 'Too Many Requests' },
      { status: 500, statusText: 'Internal Server Error' },
    ];

    for (const errorCase of errorCases) {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: errorCase.status,
        statusText: errorCase.statusText,
        text: async () =>
          JSON.stringify({ error: { message: errorCase.statusText } }),
      });

      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      await expect(
        service.processChat(messages, vi.fn(), vi.fn()),
      ).rejects.toThrow(
        `OpenAI error: {"error":{"message":"${errorCase.statusText}"}}`,
      );
    }
  });
});
