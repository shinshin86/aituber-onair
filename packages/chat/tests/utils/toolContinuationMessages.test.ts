import { buildToolContinuationMessages } from '../../src/backend';
import type { Message, ToolChatCompletion } from '../../src/types';

describe('buildToolContinuationMessages', () => {
  it('builds OpenAI-compatible Tool history without mutating the input', () => {
    const messages: Message[] = [{ role: 'user', content: 'Find the status.' }];
    const completion: ToolChatCompletion = {
      blocks: [
        {
          type: 'tool_use',
          id: 'call-1',
          name: 'status_read',
          input: { streamId: 'stream-1' },
        },
      ],
      stop_reason: 'tool_use',
    };

    const result = buildToolContinuationMessages({
      provider: 'openai',
      messages,
      completion,
      toolResults: [
        {
          type: 'tool_result',
          tool_use_id: 'call-1',
          content: '{"status":"live"}',
        },
      ],
    });

    expect(messages).toEqual([{ role: 'user', content: 'Find the status.' }]);
    expect(result).toEqual([
      { role: 'user', content: 'Find the status.' },
      {
        role: 'assistant',
        content: [],
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'status_read',
              arguments: '{"streamId":"stream-1"}',
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: 'call-1',
        content: '{"status":"live"}',
      },
    ]);
  });

  it('preserves provider-native assistant state when supplied', () => {
    const assistantMessage = {
      role: 'assistant' as const,
      content: '',
      reasoning_content: 'signed state',
      tool_calls: [
        {
          id: 'call-1',
          type: 'function' as const,
          function: { name: 'status_read', arguments: '{}' },
        },
      ],
    };

    const result = buildToolContinuationMessages({
      provider: 'openai',
      messages: [],
      completion: {
        blocks: [
          {
            type: 'tool_use',
            id: 'call-1',
            name: 'status_read',
            input: {},
          },
        ],
        assistant_message: assistantMessage,
      },
      toolResults: [
        {
          type: 'tool_result',
          tool_use_id: 'call-1',
          content: 'ok',
        },
      ],
    });

    expect(result[0]).toEqual(assistantMessage);
    expect(result[0]).not.toBe(assistantMessage);
  });

  it('builds Claude Tool results and removes empty legacy assistants', () => {
    const providerContent = [
      { type: 'thinking', signature: 'signed' },
      {
        type: 'tool_use',
        id: 'call-1',
        name: 'status_read',
        input: {},
      },
    ];

    const result = buildToolContinuationMessages({
      provider: 'claude',
      messages: [
        { role: 'user', content: 'Find the status.' },
        { role: 'assistant', content: [] } as unknown as Message,
      ],
      completion: {
        blocks: [
          {
            type: 'tool_use',
            id: 'call-1',
            name: 'status_read',
            input: {},
          },
        ],
        assistant_message: {
          role: 'assistant',
          content: '',
          provider_content: providerContent,
        },
      },
      toolResults: [
        {
          type: 'tool_result',
          tool_use_id: 'call-1',
          content: 'live',
        },
      ],
    });

    expect(result).toEqual([
      { role: 'user', content: 'Find the status.' },
      {
        role: 'assistant',
        content: '',
        provider_content: providerContent,
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'call-1',
            content: 'live',
          },
        ],
      },
    ]);
  });
});
