import { describe, expect, it } from 'vitest';
import { buildOpenAIToolsDefinition } from '../../src/services/providers/openai/openaiToolBuilder';
import type { MCPServerConfig, ToolDefinition } from '../../src/types';

describe('openaiToolBuilder', () => {
  const weatherTool: ToolDefinition = {
    name: 'get_weather',
    description: 'Get weather',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
        },
      },
      required: ['city'],
    },
  };

  const mcpServer: MCPServerConfig = {
    type: 'url',
    name: 'docs',
    url: 'https://mcp.example.test',
    require_approval: 'never',
    tool_configuration: {
      allowed_tools: ['search'],
    },
    authorization_token: 'example',
  };

  it('builds chat-completions function tools and skips MCP servers', () => {
    expect(
      buildOpenAIToolsDefinition({
        tools: [weatherTool],
        mcpServers: [mcpServer],
        isResponsesAPI: false,
      }),
    ).toEqual([
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get weather',
          parameters: weatherTool.parameters,
        },
      },
    ]);
  });

  it('builds responses function tools and MCP server tools', () => {
    expect(
      buildOpenAIToolsDefinition({
        tools: [weatherTool],
        mcpServers: [mcpServer],
        isResponsesAPI: true,
      }),
    ).toEqual([
      {
        type: 'function',
        name: 'get_weather',
        description: 'Get weather',
        parameters: weatherTool.parameters,
      },
      {
        type: 'mcp',
        server_label: 'docs',
        server_url: 'https://mcp.example.test',
        require_approval: 'never',
        allowed_tools: ['search'],
        headers: {
          Authorization: 'Bearer example',
        },
      },
    ]);
  });

  it('returns an empty array when no tools are configured', () => {
    expect(
      buildOpenAIToolsDefinition({
        tools: [],
        mcpServers: [],
        isResponsesAPI: true,
      }),
    ).toEqual([]);
  });
});
