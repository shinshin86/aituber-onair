import { ToolDefinition } from '../types';

export type OpenAICompatibleToolFormat = 'chat-completions' | 'responses';

export const buildOpenAICompatibleTools = (
  tools: ToolDefinition[],
  format: OpenAICompatibleToolFormat = 'chat-completions',
): any[] => {
  if (tools.length === 0) return [];

  if (format === 'responses') {
    return tools.map((t) => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
};
