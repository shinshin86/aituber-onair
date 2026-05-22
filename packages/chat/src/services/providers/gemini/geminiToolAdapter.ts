import type { MCPServerConfig, ToolDefinition } from '../../../types';

type GeminiFunctionDeclaration = {
  name: string;
  description?: string;
  parameters: ToolDefinition['parameters'];
};

type GeminiToolConfig = {
  tools: [
    {
      functionDeclarations: GeminiFunctionDeclaration[];
    },
  ];
  toolConfig: {
    functionCallingConfig: {
      mode: 'AUTO';
    };
  };
};

export function buildGeminiToolDeclarations(
  tools: ToolDefinition[],
  mcpToolSchemas: ToolDefinition[],
): GeminiFunctionDeclaration[] {
  return [...tools, ...mcpToolSchemas].map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export function buildGeminiToolConfig(
  tools: ToolDefinition[],
  mcpToolSchemas: ToolDefinition[],
): GeminiToolConfig | undefined {
  const functionDeclarations = buildGeminiToolDeclarations(
    tools,
    mcpToolSchemas,
  );

  if (functionDeclarations.length === 0) {
    return undefined;
  }

  return {
    tools: [
      {
        functionDeclarations,
      },
    ],
    toolConfig: {
      functionCallingConfig: {
        mode: 'AUTO',
      },
    },
  };
}

export function createFallbackMCPToolSchemas(
  servers: MCPServerConfig[],
): ToolDefinition[] {
  return servers.map((server) => ({
    name: `mcp_${server.name}_search`,
    description: `Search using ${server.name} MCP server (fallback)`,
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
  }));
}
