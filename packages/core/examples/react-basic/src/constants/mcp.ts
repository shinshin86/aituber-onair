import type { MCPServerConfig } from '@aituber-onair/core';

// DeepWiki MCP server configuration
export const deepwikiMcpServer: MCPServerConfig = {
  type: 'url',
  url: 'https://mcp.deepwiki.com/mcp',
  name: 'deepwiki',
  require_approval: 'never',
};

// MCP servers array
export const mcpServers: MCPServerConfig[] = [deepwikiMcpServer];
