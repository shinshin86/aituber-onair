export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock<P = any> {
  type: 'tool_use';
  id: string;
  name: string;
  input: P;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

export type CoreToolChatBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface ToolChatCompletion<B = CoreToolChatBlock> {
  blocks: B[];
  stop_reason: 'tool_use' | 'end';
}
export type ToolChatBlock = CoreToolChatBlock;
export type ToolDefinition<P = any> = {
  name: string;
  description?: string;
  parameters: Record<string, any>;
  config?: { timeoutMs?: number; serial?: boolean };
};
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}
