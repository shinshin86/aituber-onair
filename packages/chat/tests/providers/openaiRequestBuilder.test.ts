import { describe, expect, it } from 'vitest';
import {
  CHAT_RESPONSE_LENGTH,
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  MODEL_GPT_5_4,
  MODEL_GPT_5_4_MINI,
  MODEL_GPT_5_4_NANO,
  MODEL_GPT_5_6,
  MODEL_GPT_5_6_TERRA,
  MODEL_GPT_5_NANO,
} from '../../src/constants';
import { buildOpenAIRequestBody } from '../../src/services/providers/openai/openaiRequestBuilder';
import type {
  MCPServerConfig,
  Message,
  MessageWithVision,
} from '../../src/types';

const messages: Message[] = [{ role: 'user', content: 'hello' }];

describe('buildOpenAIRequestBody', () => {
  it('builds a GPT-5.6 Chat Completions request with max reasoning', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
      messages,
      model: MODEL_GPT_5_6,
      stream: true,
      tools: [],
      mcpServers: [],
      responseLength: CHAT_RESPONSE_LENGTH.MEDIUM,
      reasoning_effort: 'max',
    });

    expect(body).toEqual({
      model: MODEL_GPT_5_6,
      stream: true,
      max_completion_tokens: 25000,
      messages,
      reasoning_effort: 'max',
    });
  });

  it('builds a GPT-5.6 Terra Responses request with max reasoning', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_RESPONSES_API,
      messages,
      model: MODEL_GPT_5_6_TERRA,
      stream: true,
      tools: [],
      mcpServers: [],
      responseLength: CHAT_RESPONSE_LENGTH.MEDIUM,
      reasoning_effort: 'max',
    });

    expect(body).toEqual({
      model: MODEL_GPT_5_6_TERRA,
      stream: true,
      max_output_tokens: 25000,
      input: messages,
      reasoning: { effort: 'max' },
    });
  });

  it('raises chat completions token limit for GPT-5.4 responseLength presets', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
      messages,
      model: MODEL_GPT_5_4,
      stream: false,
      tools: [],
      mcpServers: [],
      responseLength: CHAT_RESPONSE_LENGTH.MEDIUM,
      reasoning_effort: 'none',
    });

    expect(body.max_completion_tokens).toBe(2000);
  });

  it('raises responses token limit further for GPT-5.4-mini with medium reasoning', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_RESPONSES_API,
      messages,
      model: MODEL_GPT_5_4_MINI,
      stream: false,
      tools: [],
      mcpServers: [],
      responseLength: CHAT_RESPONSE_LENGTH.MEDIUM,
      reasoning_effort: 'medium',
    });

    expect(body.max_output_tokens).toBe(4000);
  });

  it('uses the none reasoning minimum for GPT-5.4-nano when effort is unspecified', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_RESPONSES_API,
      messages,
      model: MODEL_GPT_5_4_NANO,
      stream: false,
      tools: [],
      mcpServers: [],
      responseLength: CHAT_RESPONSE_LENGTH.MEDIUM,
    });

    // Default effort resolves to 'none' (min 1200), so the medium
    // response-length floor (2000) wins instead of the 'medium' effort
    // floor (4000).
    expect(body.max_output_tokens).toBe(2000);
  });

  it('uses the minimal reasoning minimum for GPT-5-nano when effort is unspecified', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_RESPONSES_API,
      messages,
      model: MODEL_GPT_5_NANO,
      stream: false,
      tools: [],
      mcpServers: [],
      responseLength: CHAT_RESPONSE_LENGTH.VERY_SHORT,
    });

    expect(body.max_output_tokens).toBe(1600);
  });

  it('keeps explicit maxTokens unchanged', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_RESPONSES_API,
      messages,
      model: MODEL_GPT_5_4_MINI,
      stream: false,
      tools: [],
      mcpServers: [],
      responseLength: CHAT_RESPONSE_LENGTH.MEDIUM,
      reasoning_effort: 'medium',
      maxTokens: 300,
    });

    expect(body.max_output_tokens).toBe(300);
  });

  it('converts responses vision blocks and maps tool role to user', () => {
    const visionMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'describe this' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.test/image.png' },
          },
        ],
      },
      {
        role: 'tool',
        content: 'tool result',
      } as MessageWithVision,
    ];

    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_RESPONSES_API,
      messages: visionMessages,
      model: MODEL_GPT_5_4_MINI,
      stream: false,
      tools: [],
      mcpServers: [],
    });

    expect(body.input).toEqual([
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'describe this' },
          {
            type: 'input_image',
            image_url: 'https://example.test/image.png',
          },
        ],
      },
      {
        role: 'user',
        content: 'tool result',
      },
    ]);
  });

  it('adds response_format for chat completions JSON mode', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
      messages,
      model: MODEL_GPT_5_4_MINI,
      stream: false,
      tools: [],
      mcpServers: [],
      responseFormat: { type: 'json_object' },
    });

    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('maps responseFormat into responses text.format', () => {
    const body = buildOpenAIRequestBody({
      provider: 'openai',
      endpoint: ENDPOINT_OPENAI_RESPONSES_API,
      messages,
      model: MODEL_GPT_5_4_MINI,
      stream: false,
      tools: [],
      mcpServers: [],
      verbosity: 'low',
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'sample',
          schema: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
            },
            required: ['answer'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    expect(body.text).toEqual({
      verbosity: 'low',
      format: {
        type: 'json_schema',
        name: 'sample',
        schema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
          },
          required: ['answer'],
          additionalProperties: false,
        },
        strict: true,
      },
    });
  });

  it('normalizes Mistral image_url blocks to string URLs', () => {
    const visionMessages: MessageWithVision[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'describe this' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.test/image.png' },
          },
        ],
      },
    ];

    const body = buildOpenAIRequestBody({
      provider: 'mistral',
      endpoint: ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
      messages: visionMessages,
      model: 'mistral-small-latest',
      stream: false,
      tools: [],
      mcpServers: [],
    });

    expect(body.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'describe this' },
          {
            type: 'image_url',
            image_url: 'https://example.test/image.png',
          },
        ],
      },
    ]);
  });

  it('throws when MCP servers are used with chat completions endpoint', () => {
    const mcpServers: MCPServerConfig[] = [
      {
        name: 'docs',
        url: 'https://example.test/mcp',
      },
    ];

    expect(() =>
      buildOpenAIRequestBody({
        provider: 'openai',
        endpoint: ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
        messages,
        model: MODEL_GPT_5_4_MINI,
        stream: false,
        tools: [],
        mcpServers,
      }),
    ).toThrow('MCP servers are not supported with Chat Completions API');
  });
});
