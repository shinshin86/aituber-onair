import {
  ToolDefinition,
  ToolUseBlock,
  ToolResultBlock,
  MCPServerConfig,
} from '@aituber-onair/chat';

type Handler<P = any, R = any> = (input: P) => Promise<R>;

export class ToolExecutor {
  private registry = new Map<string, { def: ToolDefinition; fn: Handler }>();
  private mcpServers: MCPServerConfig[] = [];

  register<P, R>(definition: ToolDefinition, fn: Handler<P, R>) {
    if (this.registry.has(definition.name)) {
      throw new Error(`Tool '${definition.name}' already registered`);
    }
    this.registry.set(definition.name, { def: definition, fn });
  }

  setMCPServers(servers: MCPServerConfig[]) {
    this.mcpServers = servers;
  }

  /**
   * Parse MCP tool name
   * @param toolName Tool name (e.g., "mcp_deepwiki_search")
   * @returns Parsed MCP tool parts or null for non-MCP tools
   */
  private parseMCPToolName(
    toolName: string,
  ): { serverName: string; toolName: string } | null {
    // Format: mcp_{serverName}_{toolName}
    if (!toolName.startsWith('mcp_')) {
      return null;
    }
    const parts = toolName.split('_');
    if (parts.length >= 3 && parts[0] === 'mcp') {
      return {
        serverName: parts[1],
        toolName: parts.slice(2).join('_'),
      };
    }
    throw new Error(`Invalid MCP tool name format: ${toolName}`);
  }

  /**
   * Execute MCP tool call
   * @param block Tool use block
   * @returns Tool result block
   */
  private async executeMCPTool(
    block: ToolUseBlock,
    mcpTool: { serverName: string; toolName: string },
  ): Promise<ToolResultBlock> {
    const { serverName, toolName } = mcpTool;
    const mcpServer = this.mcpServers.find(
      (server) => server.name === serverName,
    );

    if (!mcpServer) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    try {
      // Prepare headers with optional authorization
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (mcpServer.authorization_token) {
        headers['Authorization'] = `Bearer ${mcpServer.authorization_token}`;
      }

      // Make HTTP request to MCP server using proper MCP protocol
      // Format: POST /tools/{toolName} with arguments in body
      const response = await fetch(`${mcpServer.url}/tools/${toolName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(block.input || {}),
      });

      if (!response.ok) {
        throw new Error(
          `MCP server responded with ${response.status}: ${response.statusText}`,
        );
      }

      const result = await response.json();

      return {
        type: 'tool_result',
        tool_use_id: block.id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      };
    } catch (error: any) {
      return {
        type: 'tool_result',
        tool_use_id: block.id,
        content: `MCP tool execution failed: ${error.message}`,
      };
    }
  }

  async run(blocks: ToolUseBlock[]): Promise<ToolResultBlock[]> {
    const tasks = blocks
      .filter((b): b is ToolUseBlock => b.type === 'tool_use')
      .map(async (b) => {
        // Check if this is an MCP tool
        const mcpTool = this.parseMCPToolName(b.name);
        if (mcpTool) {
          return this.executeMCPTool(b, mcpTool);
        }

        // Handle regular tools
        const entry = this.registry.get(b.name);
        if (!entry) {
          throw new Error(`Unhandled tool: ${b.name}`);
        }
        const { fn, def } = entry;

        const resPromise = fn(b.input);
        const result = def.config?.timeoutMs
          ? await Promise.race([
              resPromise,
              new Promise<never>((_, rej) =>
                setTimeout(
                  () => rej(new Error(`${b.name} timed out`)),
                  def.config!.timeoutMs,
                ),
              ),
            ])
          : await resPromise;

        return <ToolResultBlock>{
          type: 'tool_result',
          tool_use_id: b.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        };
      });

    return Promise.all(tasks);
  }

  listDefinitions(): ToolDefinition[] {
    return Array.from(this.registry.values()).map((r) => r.def);
  }
}
