import type {
  Message,
  ToolChatCompletion,
  ToolResultBlock,
  ToolUseBlock,
} from './types';

const KNOWN_CHAT_PROVIDERS = new Set([
  'claude',
  'claude-agent-sdk',
  'codex-sdk',
  'copilot-sdk',
  'deepseek',
  'gemini',
  'gemini-nano',
  'kimi',
  'mistral',
  'openai',
  'openai-compatible',
  'openrouter',
  'plamo',
  'sakana',
  'xai',
  'zai',
]);

const TOOL_SUPPORTED_PROVIDERS = new Set([
  'claude',
  'deepseek',
  'gemini',
  'kimi',
  'mistral',
  'openai',
  'openai-compatible',
  'openrouter',
  'plamo',
  'sakana',
  'xai',
  'zai',
]);

const NON_STREAMING_PROVIDERS = new Set(['codex-sdk']);

export interface ChatBackendProviderCapabilities {
  readonly text: true;
  readonly streaming: boolean;
  readonly tools: boolean;
}

/** Returns the execution capabilities known for a built-in Chat provider. */
export function getChatBackendProviderCapabilities(
  provider: string,
): ChatBackendProviderCapabilities | undefined {
  if (!KNOWN_CHAT_PROVIDERS.has(provider)) return undefined;
  return {
    text: true,
    streaming: !NON_STREAMING_PROVIDERS.has(provider),
    tools: TOOL_SUPPORTED_PROVIDERS.has(provider),
  };
}

export interface BuildToolContinuationMessagesInput {
  readonly provider: string;
  readonly messages: readonly Message[];
  readonly completion: Pick<ToolChatCompletion, 'assistant_message' | 'blocks'>;
  readonly toolResults: readonly ToolResultBlock[];
}

/**
 * Builds the provider-compatible history required after a Tool call.
 * The input arrays and messages are never mutated.
 */
export function buildToolContinuationMessages(
  input: BuildToolContinuationMessagesInput,
): Message[] {
  const isClaude = input.provider === 'claude';
  const messages = input.messages.filter(
    (message) => !isEmptyClaudeAssistantMessage(isClaude, message),
  );
  const toolUses = input.completion.blocks.filter(
    (block): block is ToolUseBlock => block.type === 'tool_use',
  );
  const assistantMessage =
    input.completion.assistant_message ??
    buildAssistantToolCall(isClaude, toolUses);

  if (!isEmptyClaudeAssistantMessage(isClaude, assistantMessage as Message)) {
    messages.push({ ...assistantMessage } as Message);
  }

  messages.push(...buildToolResultMessages(isClaude, input.toolResults));
  return messages;
}

function isEmptyClaudeAssistantMessage(
  isClaude: boolean,
  message: Message,
): boolean {
  if (!isClaude || message.role !== 'assistant') {
    return false;
  }
  const content = (message as { content?: unknown }).content;
  return Array.isArray(content) && content.length === 0;
}

function buildAssistantToolCall(
  isClaude: boolean,
  toolUses: readonly ToolUseBlock[],
): Message {
  if (isClaude) {
    return {
      role: 'assistant',
      content: toolUses.map((toolUse) => ({
        type: 'tool_use',
        id: toolUse.id,
        name: toolUse.name,
        input: toolUse.input ?? {},
      })),
    } as unknown as Message;
  }

  return {
    role: 'assistant',
    content: [],
    tool_calls: toolUses.map((toolUse) => ({
      id: toolUse.id,
      type: 'function',
      function: {
        name: toolUse.name,
        arguments: JSON.stringify(toolUse.input ?? {}),
      },
    })),
  } as unknown as Message;
}

function buildToolResultMessages(
  isClaude: boolean,
  toolResults: readonly ToolResultBlock[],
): Message[] {
  if (isClaude) {
    return toolResults.map(
      (result) =>
        ({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: result.tool_use_id,
              content: result.content,
            },
          ],
        }) as unknown as Message,
    );
  }

  return toolResults.map(
    (result) =>
      ({
        role: 'tool',
        tool_call_id: result.tool_use_id,
        content: result.content,
      }) as Message,
  );
}
