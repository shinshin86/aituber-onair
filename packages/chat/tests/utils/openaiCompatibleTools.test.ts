import { describe, it, expect } from 'vitest';
import { buildOpenAICompatibleTools } from '../../src/utils/openaiCompatibleTools';
import type { ToolDefinition } from '../../src/types';

describe('openaiCompatibleTools', () => {
  it('should build chat-completions tool format by default', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'search',
        description: 'Search something',
        parameters: { type: 'object', properties: { q: { type: 'string' } } },
      },
    ];

    const result = buildOpenAICompatibleTools(tools);

    expect(result).toEqual([
      {
        type: 'function',
        function: {
          name: 'search',
          description: 'Search something',
          parameters: { type: 'object', properties: { q: { type: 'string' } } },
        },
      },
    ]);
  });

  it('should build responses tool format when specified', () => {
    const tools: ToolDefinition[] = [
      {
        name: 'get_weather',
        description: 'Get weather',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
        },
      },
    ];

    const result = buildOpenAICompatibleTools(tools, 'responses');

    expect(result).toEqual([
      {
        type: 'function',
        name: 'get_weather',
        description: 'Get weather',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
        },
      },
    ]);
  });

  it('should return empty array when no tools are provided', () => {
    expect(buildOpenAICompatibleTools([])).toEqual([]);
  });
});
