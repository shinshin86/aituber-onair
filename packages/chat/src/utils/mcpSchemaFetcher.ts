import { ToolDefinition, MCPServerConfig } from '../types';
import { ChatServiceHttpClient } from './chatServiceHttpClient';

export type MCPSchemaFetchFailure = {
  server: MCPServerConfig;
  error: unknown;
};

export type MCPSchemaFetchResult = {
  schemas: ToolDefinition[];
  failures: MCPSchemaFetchFailure[];
};

const createGenericSearchTool = (
  serverConfig: MCPServerConfig,
  reason?: 'schema-fetch-failed',
): ToolDefinition => ({
  name: `mcp_${serverConfig.name}_search`,
  description:
    reason === 'schema-fetch-failed'
      ? `Search using ${serverConfig.name} MCP server (schema fetch failed)`
      : `Search using ${serverConfig.name} MCP server`,
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
});

/**
 * MCP server schema fetcher for SDK-less implementation
 */
export class MCPSchemaFetcher {
  /**
   * Fetch tool schemas from MCP server
   * @param serverConfig MCP server configuration
   * @returns Array of tool definitions
   */
  static async fetchToolSchemas(
    serverConfig: MCPServerConfig,
  ): Promise<ToolDefinition[]> {
    const result = await this.fetchToolSchemasWithStatus(serverConfig);
    return result.schemas;
  }

  /**
   * Fetch tool schemas from MCP server with failure metadata.
   * @param serverConfig MCP server configuration
   * @returns Tool schemas and failure metadata if fallback was used
   */
  static async fetchToolSchemasWithStatus(
    serverConfig: MCPServerConfig,
  ): Promise<MCPSchemaFetchResult> {
    try {
      // Try to fetch tools list from MCP server
      // This follows the MCP protocol for tool discovery
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (serverConfig.authorization_token) {
        headers['Authorization'] = `Bearer ${serverConfig.authorization_token}`;
      }

      // MCP protocol: POST to /tools to list available tools
      const response = await ChatServiceHttpClient.post(
        `${serverConfig.url}/tools`,
        {},
        headers,
      );

      const toolsData = await response.json();

      // Convert MCP tool schemas to AITuber ToolDefinition format
      if (Array.isArray(toolsData.tools)) {
        return {
          schemas: toolsData.tools.map((tool: any) => ({
            name: `mcp_${serverConfig.name}_${tool.name}`,
            description:
              tool.description || `Tool from ${serverConfig.name} MCP server`,
            parameters: tool.inputSchema || {
              type: 'object',
              properties: {},
              required: [],
            },
          })),
          failures: [],
        };
      }

      // Fallback: create generic search tool if server doesn't provide schema
      return {
        schemas: [createGenericSearchTool(serverConfig)],
        failures: [],
      };
    } catch (error) {
      console.warn(
        `Failed to fetch MCP schemas from ${serverConfig.name}:`,
        error,
      );

      // Fallback: create generic search tool
      return {
        schemas: [createGenericSearchTool(serverConfig, 'schema-fetch-failed')],
        failures: [{ server: serverConfig, error }],
      };
    }
  }

  /**
   * Fetch all tool schemas from multiple MCP servers
   * @param mcpServers Array of MCP server configurations
   * @returns Array of all tool definitions
   */
  static async fetchAllToolSchemas(
    mcpServers: MCPServerConfig[],
  ): Promise<ToolDefinition[]> {
    const result = await this.fetchAllToolSchemasWithStatus(mcpServers);
    return result.schemas;
  }

  /**
   * Fetch all tool schemas from multiple MCP servers with failure metadata.
   * @param mcpServers Array of MCP server configurations
   * @returns Array of all tool definitions and failures
   */
  static async fetchAllToolSchemasWithStatus(
    mcpServers: MCPServerConfig[],
  ): Promise<MCPSchemaFetchResult> {
    const allSchemas: ToolDefinition[] = [];
    const failures: MCPSchemaFetchFailure[] = [];

    for (const server of mcpServers) {
      try {
        const result = await this.fetchToolSchemasWithStatus(server);
        allSchemas.push(...result.schemas);
        failures.push(...result.failures);
      } catch (error) {
        console.error(`Failed to fetch schemas from ${server.name}:`, error);
        failures.push({ server, error });
      }
    }

    return { schemas: allSchemas, failures };
  }
}
