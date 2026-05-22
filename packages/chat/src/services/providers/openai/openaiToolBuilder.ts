import type { MCPServerConfig, ToolDefinition } from '../../../types';
import { buildOpenAICompatibleTools } from '../../../utils';

type BuildOpenAIToolsDefinitionOptions = {
  tools: ToolDefinition[];
  mcpServers: MCPServerConfig[];
  isResponsesAPI: boolean;
};

export function buildOpenAIToolsDefinition({
  tools,
  mcpServers,
  isResponsesAPI,
}: BuildOpenAIToolsDefinitionOptions): any[] {
  const toolDefs: any[] = [];

  if (tools.length > 0) {
    toolDefs.push(
      ...buildOpenAICompatibleTools(
        tools,
        isResponsesAPI ? 'responses' : 'chat-completions',
      ),
    );
  }

  if (mcpServers.length > 0 && isResponsesAPI) {
    toolDefs.push(...buildOpenAIMCPToolsDefinition(mcpServers));
  }

  return toolDefs;
}

function buildOpenAIMCPToolsDefinition(mcpServers: MCPServerConfig[]): any[] {
  return mcpServers.map((server) => {
    const mcpDef: any = {
      type: 'mcp',
      server_label: server.name,
      server_url: server.url,
    };

    if (server.require_approval) {
      mcpDef.require_approval = server.require_approval;
    }

    if (server.tool_configuration?.allowed_tools) {
      mcpDef.allowed_tools = server.tool_configuration.allowed_tools;
    }

    if (server.authorization_token) {
      mcpDef.headers = {
        Authorization: `Bearer ${server.authorization_token}`,
      };
    }

    return mcpDef;
  });
}
