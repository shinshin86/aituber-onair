// when use MCP, install @modelcontextprotocol/sdk
// @ts-ignore
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
// @ts-ignore
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

let clientPromise: Promise<MCPClient> | null = null;

async function getMcpClient(): Promise<MCPClient> {
  if (clientPromise) return clientPromise;

  const client = new MCPClient({
    name: 'random-int-server',
    version: '0.0.1',
  });
  const endpoint = import.meta.env.VITE_MCP_ENDPOINT as string;
  if (!endpoint) throw new Error('VITE_MCP_ENDPOINT is not defined');

  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  clientPromise = client.connect(transport).then(() => client);
  return clientPromise;
}

export function createMcpToolHandler<
  T extends { [key: string]: unknown } = any,
>(toolName: string) {
  return async (args: T): Promise<string> => {
    const client = await getMcpClient();
    const out = await client.callTool({ name: toolName, arguments: args });
    return (out.content as { text: string }[] | undefined)?.[0]?.text ?? '';
  };
}
