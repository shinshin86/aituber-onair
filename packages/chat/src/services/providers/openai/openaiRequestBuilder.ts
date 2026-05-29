import {
  ENDPOINT_OPENAI_CHAT_COMPLETIONS_API,
  ENDPOINT_OPENAI_RESPONSES_API,
  OpenAIReasoningEffort,
  getDefaultReasoningEffortForGPT5Model,
  isGPT5Model,
  isMistralReasoningEffort,
  isMistralReasoningEffortModel,
} from '../../../constants';
import {
  CHAT_RESPONSE_LENGTH,
  ChatResponseLength,
  getMaxTokensForResponseLength,
} from '../../../constants/chat';
import type {
  MCPServerConfig,
  Message,
  MessageWithVision,
  ToolDefinition,
} from '../../../types';
import { buildOpenAIToolsDefinition } from './openaiToolBuilder';

const GPT5_RESPONSE_LENGTH_MIN_TOKENS: Record<ChatResponseLength, number> = {
  [CHAT_RESPONSE_LENGTH.VERY_SHORT]: 800,
  [CHAT_RESPONSE_LENGTH.SHORT]: 1200,
  [CHAT_RESPONSE_LENGTH.MEDIUM]: 2000,
  [CHAT_RESPONSE_LENGTH.LONG]: 3000,
  [CHAT_RESPONSE_LENGTH.VERY_LONG]: 8000,
  [CHAT_RESPONSE_LENGTH.DEEP]: 25000,
};

const GPT5_REASONING_MIN_TOKENS: Record<OpenAIReasoningEffort, number> = {
  none: 1200,
  minimal: 1600,
  low: 2500,
  medium: 4000,
  high: 8000,
  xhigh: 12000,
};

const OPENAI_COMPATIBLE_CHAT_COMPLETIONS_PROVIDERS = new Set([
  'openai-compatible',
  'deepseek',
  'mistral',
]);

type BuildOpenAIRequestBodyOptions = {
  provider: string;
  endpoint: string;
  messages: (Message | MessageWithVision)[];
  model: string;
  stream: boolean;
  tools: ToolDefinition[];
  mcpServers: MCPServerConfig[];
  responseLength?: ChatResponseLength;
  verbosity?: 'low' | 'medium' | 'high';
  reasoning_effort?: OpenAIReasoningEffort;
  enableReasoningSummary?: boolean;
  maxTokens?: number;
};

/**
 * Build request body based on the endpoint type.
 */
export function buildOpenAIRequestBody({
  provider,
  endpoint,
  messages,
  model,
  stream,
  tools,
  mcpServers,
  responseLength,
  verbosity,
  reasoning_effort,
  enableReasoningSummary,
  maxTokens,
}: BuildOpenAIRequestBodyOptions): any {
  const isResponsesAPI = endpoint === ENDPOINT_OPENAI_RESPONSES_API;

  validateMCPCompatibility(endpoint, mcpServers);

  const body: any = {
    model,
    stream,
  };

  // Add max token field based on endpoint/provider compatibility.
  // For openai-compatible providers, omit token limit by default to avoid
  // server-specific context-window errors on local/self-hosted models.
  const tokenLimit = resolveOpenAITokenLimit({
    provider,
    model,
    responseLength,
    reasoning_effort,
    maxTokens,
  });

  if (isResponsesAPI) {
    if (tokenLimit !== undefined) {
      body.max_output_tokens = tokenLimit;
    }
  } else {
    if (tokenLimit !== undefined) {
      // OpenAI-compatible Chat Completions providers expect max_tokens.
      if (usesCompatibleChatCompletions(provider)) {
        body.max_tokens = tokenLimit;
      } else {
        body.max_completion_tokens = tokenLimit;
      }
    }
  }

  // Handle messages format based on endpoint.
  if (isResponsesAPI) {
    body.input = cleanMessagesForResponsesAPI(messages);
  } else {
    body.messages =
      provider === 'mistral'
        ? cleanMessagesForMistralChatCompletions(messages)
        : messages;
  }

  // Add GPT-5 specific parameters.
  if (isGPT5Model(model)) {
    // For Responses API, use nested structure.
    if (isResponsesAPI) {
      if (reasoning_effort) {
        body.reasoning = {
          ...body.reasoning,
          effort: reasoning_effort,
        };
        // Only add summary if explicitly enabled (requires org verification).
        if (enableReasoningSummary) {
          body.reasoning.summary = 'auto';
        }
      }
      if (verbosity) {
        body.text = {
          ...body.text,
          format: { type: 'text' },
          verbosity,
        };
      }
    } else {
      // For Chat Completions API, add GPT-5 parameters directly.
      if (reasoning_effort) {
        body.reasoning_effort = reasoning_effort;
      }
      if (verbosity) {
        body.verbosity = verbosity;
      }
    }
  }

  if (
    provider === 'mistral' &&
    isMistralReasoningEffortModel(model) &&
    reasoning_effort &&
    isMistralReasoningEffort(reasoning_effort)
  ) {
    body.reasoning_effort = reasoning_effort;
  }

  const toolDefinitions = buildOpenAIToolsDefinition({
    tools,
    mcpServers,
    isResponsesAPI,
  });
  if (toolDefinitions.length > 0) {
    body.tools = toolDefinitions;

    // Only Chat Completions API requires tool_choice.
    if (!isResponsesAPI) {
      body.tool_choice = 'auto';
    }
  }

  return body;
}

type ResolveOpenAITokenLimitOptions = {
  provider: string;
  model: string;
  responseLength?: ChatResponseLength;
  reasoning_effort?: OpenAIReasoningEffort;
  maxTokens?: number;
};

export function resolveOpenAITokenLimit({
  provider,
  model,
  responseLength,
  reasoning_effort,
  maxTokens,
}: ResolveOpenAITokenLimitOptions): number | undefined {
  if (maxTokens !== undefined) {
    return maxTokens;
  }

  const baseTokenLimit = usesCompatibleChatCompletions(provider)
    ? responseLength !== undefined
      ? getMaxTokensForResponseLength(responseLength)
      : undefined
    : getMaxTokensForResponseLength(responseLength);

  if (
    provider !== 'openai' ||
    !isGPT5Model(model) ||
    responseLength === undefined
  ) {
    return baseTokenLimit;
  }

  const effectiveReasoningEffort =
    reasoning_effort ?? getDefaultReasoningEffortForGPT5Model(model);

  return Math.max(
    baseTokenLimit ?? 0,
    GPT5_RESPONSE_LENGTH_MIN_TOKENS[responseLength],
    GPT5_REASONING_MIN_TOKENS[effectiveReasoningEffort],
  );
}

function validateMCPCompatibility(
  endpoint: string,
  mcpServers: MCPServerConfig[],
): void {
  if (
    mcpServers.length > 0 &&
    endpoint === ENDPOINT_OPENAI_CHAT_COMPLETIONS_API
  ) {
    throw new Error(
      `MCP servers are not supported with Chat Completions API. ` +
        `Current endpoint: ${endpoint}. ` +
        `Please use OpenAI Responses API endpoint: ${ENDPOINT_OPENAI_RESPONSES_API}. ` +
        `MCP tools are only available in the Responses API endpoint.`,
    );
  }
}

export function cleanMessagesForResponsesAPI(
  messages: (Message | MessageWithVision)[],
): any[] {
  return messages.map((msg) => {
    // Convert 'tool' role to 'user' for Responses API compatibility.
    const role = msg.role === 'tool' ? 'user' : msg.role;

    const cleanMsg: any = {
      role: role,
    };

    // Handle content (text or vision).
    if (typeof msg.content === 'string') {
      cleanMsg.content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Vision message case - convert VisionBlock types for Responses API.
      cleanMsg.content = msg.content.map((block: any) => {
        if (block.type === 'text') {
          // Convert 'text' to 'input_text' for Responses API.
          return {
            type: 'input_text',
            text: block.text,
          };
        } else if (block.type === 'image_url') {
          // For Responses API, image_url should be a direct string.
          return {
            type: 'input_image',
            image_url: block.image_url.url,
          };
        }
        return block;
      });
    } else {
      cleanMsg.content = msg.content;
    }

    return cleanMsg;
  });
}

export function cleanMessagesForMistralChatCompletions(
  messages: (Message | MessageWithVision)[],
): any[] {
  return messages.map((msg) => {
    const cleanMsg: any = {
      role: msg.role,
    };

    if (!Array.isArray(msg.content)) {
      cleanMsg.content = msg.content;
      return cleanMsg;
    }

    cleanMsg.content = msg.content.map((block: any) => {
      if (
        block.type === 'image_url' &&
        typeof block.image_url === 'object' &&
        typeof block.image_url?.url === 'string'
      ) {
        return {
          type: 'image_url',
          image_url: block.image_url.url,
        };
      }
      return block;
    });

    return cleanMsg;
  });
}

function usesCompatibleChatCompletions(provider: string): boolean {
  return OPENAI_COMPATIBLE_CHAT_COMPLETIONS_PROVIDERS.has(provider);
}
