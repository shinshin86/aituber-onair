import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeChatService } from '../../../../../src/services/chat/providers/claude/ClaudeChatService.ts';

describe('ClaudeChatService parse functions', () => {
  const TEST_API_KEY = 'test-api-key';
  let service: ClaudeChatService;

  beforeEach(() => {
    service = new ClaudeChatService(TEST_API_KEY);
  });

  it('parseOneShot should handle tool use and result', () => {
    const json = {
      content: [
        { type: 'text', text: 'hello' },
        { type: 'tool_use', id: '1', name: 'my_tool', input: { foo: 1 } },
        { type: 'tool_result', tool_use_id: '1', content: 'ok' },
      ],
    };

    const result = (service as any).parseOneShot(json);
    expect(result).toEqual({
      blocks: [
        { type: 'text', text: 'hello' },
        { type: 'tool_use', id: '1', name: 'my_tool', input: { foo: 1 } },
        { type: 'tool_result', tool_use_id: '1', content: 'ok' },
      ],
      stop_reason: 'tool_use',
    });
  });

  it('parseStream should handle SSE events for tool use and result', async () => {
    const sse =
      'data: {"type":"content_block_delta","index":1,"delta":{"text":"hi"}}\n' +
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"1","name":"my_tool"}}\n' +
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"foo\\":1"}}\n' +
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"}"}}\n' +
      'data: {"type":"content_block_stop","index":0}\n' +
      'data: {"type":"content_block_start","index":2,"content_block":{"type":"tool_result","tool_use_id":"1","content":"ok"}}\n' +
      'data: [DONE]\n';
    const res = new Response(sse);
    const result = await (service as any).parseStream(res, () => {});
    expect(result).toEqual({
      blocks: [
        { type: 'text', text: 'hi' },
        { type: 'tool_use', id: '1', name: 'my_tool', input: { foo: 1 } },
        { type: 'tool_result', tool_use_id: '1', content: 'ok' },
      ],
      stop_reason: 'tool_use',
    });
  });
});

import { vi } from 'vitest';
import { Message, MessageWithVision } from '../../../../../src/types';
import {
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_3_HAIKU,
  CLAUDE_VISION_SUPPORTED_MODELS,
} from '../../../../../src/constants';

describe('ClaudeChatService', () => {
  const TEST_API_KEY = 'test-api-key';
  let service: ClaudeChatService;

  function mockFetch(responseData: any, ok = true, statusText = 'OK') {
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 400,
      statusText,
      json: async () => responseData,
      body: { getReader: () => ({ read: vi.fn().mockResolvedValueOnce({ done: true }) }) },
    });
  }

  beforeEach(() => {
    service = new ClaudeChatService(TEST_API_KEY);
    vi.resetAllMocks();
  });

  it('should return the default model if none is specified', () => {
    expect(service.getModel()).toBe(MODEL_CLAUDE_3_HAIKU);
  });

  it('should return the model passed into constructor', () => {
    const customModel = 'custom-claude-model';
    const customService = new ClaudeChatService(TEST_API_KEY, customModel);
    expect(customService.getModel()).toBe(customModel);
  });

  it('should call Claude API with correct endpoint and body in processChat', async () => {
    mockFetch({ content: [{ text: 'Hello from Claude!' }] });
    vi.spyOn(service as any, 'parsePureStream').mockResolvedValueOnce('Hello from Claude!');

    const messages: Message[] = [{ role: 'user', content: 'Hello' }];

    const onPartialResponse = vi.fn();
    const onCompleteResponse = vi.fn();

    await service.processChat(messages, onPartialResponse, onCompleteResponse);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const url = callArgs[0];
    const requestOptions = callArgs[1];

    expect(url).toBe(ENDPOINT_CLAUDE_API);
    expect(requestOptions?.method).toBe('POST');
    expect(requestOptions?.headers).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': TEST_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });

    const bodyObj = JSON.parse(requestOptions?.body as string);
    expect(bodyObj.model).toBe(MODEL_CLAUDE_3_HAIKU);
    expect(bodyObj.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    expect(bodyObj.stream).toBe(true);

    expect(onCompleteResponse).toHaveBeenCalledWith('Hello from Claude!');
  });

  it('should throw an error when Claude API returns a non-200 status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ error: { message: 'Unauthorized' } }),
    });

    const messages: Message[] = [{ role: 'user', content: 'Hi' }];

    await expect(service.processChat(messages, vi.fn(), vi.fn())).rejects.toThrow();
  });

  it('should process vision chat with a vision-supported model', async () => {
    const visionModel = CLAUDE_VISION_SUPPORTED_MODELS[0];
    service = new ClaudeChatService(TEST_API_KEY, MODEL_CLAUDE_3_HAIKU, visionModel);

    mockFetch({ content: [{ text: 'Vision response' }] });
    vi.spyOn(service as any, 'parsePureStream').mockResolvedValueOnce('Vision response');

    const messages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Check image' },
          { type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } },
        ],
      },
    ];

    const onPartialResponse = vi.fn();
    const onCompleteResponse = vi.fn();

    await service.processVisionChat(messages, onPartialResponse, onCompleteResponse);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const bodyObj = JSON.parse(callArgs[1]?.body as string);
    expect(bodyObj.model).toBe(visionModel);
    expect(bodyObj.stream).toBe(true);

    expect(onCompleteResponse).toHaveBeenCalledWith('Vision response');
  });

  it('should throw error if vision model does not support vision', async () => {
    expect(() => new ClaudeChatService(TEST_API_KEY, MODEL_CLAUDE_3_HAIKU, 'non-vision')).toThrow();
  });

  it('should call chatOnce directly and return tool chat completion', async () => {
    mockFetch({ content: [{ text: 'Direct response' }] });
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
});
