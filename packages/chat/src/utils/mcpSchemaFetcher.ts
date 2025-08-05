import { ToolDefinition, MCPServerConfig } from '../types';
import { ChatServiceHttpClient } from './chatServiceHttpClient';

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
        return toolsData.tools.map((tool: any) => ({
          name: `mcp_${serverConfig.name}_${tool.name}`,
          description:
            tool.description || `Tool from ${serverConfig.name} MCP server`,
          parameters: tool.inputSchema || {
            type: 'object',
            properties: {},
            required: [],
          },
        }));
      }

      // Fallback: create generic search tool if server doesn't provide schema
      return [
        {
          name: `mcp_${serverConfig.name}_search`,
          description: `Search using ${serverConfig.name} MCP server`,
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
      ];
    } catch (error) {
      console.warn(
        `Failed to fetch MCP schemas from ${serverConfig.name}:`,
        error,
      );

      // Fallback: create generic search tool
      return [
        {
          name: `mcp_${serverConfig.name}_search`,
          description: `Search using ${serverConfig.name} MCP server (schema fetch failed)`,
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
      ];
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
    const allSchemas: ToolDefinition[] = [];

    for (const server of mcpServers) {
      try {
        const schemas = await this.fetchToolSchemas(server);
        allSchemas.push(...schemas);
      } catch (error) {
        console.error(`Failed to fetch schemas from ${server.name}:`, error);
      }
    }

    return allSchemas;
  }
}
