import { secretaryCharacter } from './character';
import {
  toChatToolName,
  tools as defaultTools,
  type AnySecretaryTool,
} from './tools';

export type AgentMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

export type ToolUseBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
};

export type TextBlock = {
  type: 'text';
  text: string;
};

export type ToolChatCompletion = {
  blocks: Array<ToolUseBlock | TextBlock>;
  stop_reason: 'tool_use' | 'end';
};

export type SecretaryChatClient = {
  chatOnce(
    messages: AgentMessage[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number,
  ): Promise<ToolChatCompletion>;
};

export type SecretaryAgentOptions = {
  chat: SecretaryChatClient;
  tools?: AnySecretaryTool[];
  maxHops?: number;
};

export type SecretaryAgent = {
  respond(userInput: string): Promise<string>;
};

export function createSecretaryAgent({
  chat,
  tools = defaultTools,
  maxHops = 4,
}: SecretaryAgentOptions): SecretaryAgent {
  const toolMap = new Map(
    tools.flatMap((tool) => [
      [tool.name, tool],
      [toChatToolName(tool.name), tool],
    ]),
  );
  const messages: AgentMessage[] = [
    { role: 'system', content: secretaryCharacter.systemPrompt },
  ];

  return {
    async respond(userInput: string): Promise<string> {
      messages.push({ role: 'user', content: userInput });

      for (let hop = 0; hop < maxHops; hop += 1) {
        const completion = await chat.chatOnce([...messages], false, () => {});
        const text = completion.blocks
          .filter((block): block is TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('');

        const toolCalls = completion.blocks.filter(
          (block): block is ToolUseBlock => block.type === 'tool_use',
        );

        if (toolCalls.length === 0) {
          if (text.length > 0) {
            messages.push({ role: 'assistant', content: text });
          }

          return text;
        }

        messages.push({
          role: 'assistant',
          content: text,
          tool_calls: toolCalls.map((toolCall) => ({
            id: toolCall.id,
            type: 'function',
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.input),
            },
          })),
        });

        for (const toolCall of toolCalls) {
          const tool = toolMap.get(toolCall.name);

          if (!tool) {
            throw new Error(`Unknown tool: ${toolCall.name}`);
          }

          const result = await tool.execute(toolCall.input);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
      }

      throw new Error(`Tool loop exceeded ${maxHops} hops.`);
    },
  };
}
