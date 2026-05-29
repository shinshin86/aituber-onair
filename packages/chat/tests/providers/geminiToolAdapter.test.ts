import { describe, expect, it } from 'vitest';
import {
  buildGeminiToolConfig,
  buildGeminiToolDeclarations,
  createFallbackMCPToolSchemas,
} from '../../src/services/providers/gemini/geminiToolAdapter';
import type { MCPServerConfig, ToolDefinition } from '../../src/types';

describe('geminiToolAdapter', () => {
  const weatherTool: ToolDefinition = {
    name: 'get_weather',
    description: 'Get weather by city',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'City name',
        },
      },
      required: ['city'],
    },
  };

  const mcpTool: ToolDefinition = {
    name: 'mcp_docs_search',
    description: 'Search docs',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
        },
      },
      required: ['query'],
    },
  };

  it('maps regular and MCP tools to Gemini function declarations', () => {
    expect(buildGeminiToolDeclarations([weatherTool], [mcpTool])).toEqual([
      {
        name: 'get_weather',
        description: 'Get weather by city',
        parameters: weatherTool.parameters,
      },
      {
        name: 'mcp_docs_search',
        description: 'Search docs',
        parameters: mcpTool.parameters,
      },
    ]);
  });

  it('builds AUTO function calling config only when declarations exist', () => {
    expect(buildGeminiToolConfig([], [])).toBeUndefined();
    expect(buildGeminiToolConfig([weatherTool], [])).toEqual({
      tools: [
        {
          functionDeclarations: [
            {
              name: 'get_weather',
              description: 'Get weather by city',
              parameters: weatherTool.parameters,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: 'AUTO',
        },
      },
    });
  });

  it('creates fallback MCP search schemas from configured servers', () => {
    const servers: MCPServerConfig[] = [
      {
        type: 'url',
        name: 'deepwiki',
        url: 'https://mcp.example.test',
      },
    ];

    expect(createFallbackMCPToolSchemas(servers)).toEqual([
      {
        name: 'mcp_deepwiki_search',
        description: 'Search using deepwiki MCP server (fallback)',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
    ]);
  });
});
