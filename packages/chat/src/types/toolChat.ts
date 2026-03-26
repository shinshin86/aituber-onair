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
  truncated?: boolean;
  finish_reason?: string;
  response_status?: string;
  incomplete_details?: { reason?: string; [key: string]: any } | null;
  usage?: Record<string, any>;
}
export type ToolChatBlock = CoreToolChatBlock;

export type ToolDefinition = {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties?: Record<
      string,
      {
        type?: string;
        description?: string;
        enum?: any[];
        items?: any; // for array
        required?: string[];
        [key: string]: any; // other JSON Schema properties
      }
    >;
    required?: string[];
    [key: string]: any;
  };
  config?: { timeoutMs?: number };
};
