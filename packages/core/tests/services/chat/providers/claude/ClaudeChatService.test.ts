import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeChatService } from '../../../../../src/services/chat/providers/claude/ClaudeChatService.ts';

describe('ClaudeChatService parse functions', () => {
  const API_KEY = 'dummy-key';
  let service: ClaudeChatService;

  beforeEach(() => {
    service = new ClaudeChatService(API_KEY);
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
