/**
 * Model Context Protocol (MCP) related types
 */

/**
 * MCP server configuration for MCP connector
 * This is a standard configuration format that may be used by multiple providers
 */
export interface MCPServerConfig {
  type: 'url';
  url: string;
  name: string;
  require_approval?: 'always' | 'never';
  tool_configuration?: {
    enabled?: boolean;
    allowed_tools?: string[];
  };
  authorization_token?: string;
}

/**
 * Claude-specific MCP tool use block (internal type for Claude)
 */
export interface ClaudeMCPToolUseBlock {
  type: 'mcp_tool_use';
  id: string;
  name: string;
  server_name: string;
  input: any;
}

/**
 * Claude-specific MCP tool result block (internal type for Claude)
 */
export interface ClaudeMCPToolResultBlock {
  type: 'mcp_tool_result';
  tool_use_id: string;
  is_error: boolean;
  content: any[];
}
