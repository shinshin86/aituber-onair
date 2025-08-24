import type { MCPServerConfig } from '@aituber-onair/core';

// DeepWiki MCP server configuration
export const deepwikiMcpServer: MCPServerConfig = {
  type: 'url',
  url: 'https://mcp.deepwiki.com/sse',
  name: 'deepwiki',
};

// MCP servers array
export const mcpServers: MCPServerConfig[] = [deepwikiMcpServer];