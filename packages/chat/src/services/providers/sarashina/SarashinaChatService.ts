import { ChatService } from '../../ChatService';
import {
  Message,
  MessageWithVision,
  ToolDefinition,
  ToolChatCompletion,
} from '../../../types';
import {
  ENDPOINT_SARASHINA_CHAT_COMPLETIONS_API,
  MODEL_SARASHINA_3_NANO,
  SARASHINA_MAX_COMPLETION_TOKENS,
  SarashinaReasoningEffort,
  getDefaultSarashinaReasoningEffort,
  getSarashinaSupportedReasoningEfforts,
} from '../../../constants/sarashina';
import {
  ChatResponseLength,
  getMaxTokensForResponseLength,
} from '../../../constants/chat';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';
import {
  buildOpenAICompatibleTools,
  parseOpenAICompatibleOneShot,
  parseOpenAICompatibleToolStream,
  processChatWithOptionalTools,
} from '../../../utils';

/** Text-only Sarashina Chat Completions for protected backend runtimes. */
export class SarashinaChatService implements ChatService {
  readonly provider = 'sarashina';
  private readonly reasoningEffort?: SarashinaReasoningEffort;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = MODEL_SARASHINA_3_NANO,
    private readonly tools: ToolDefinition[] = [],
    private readonly endpoint: string = ENDPOINT_SARASHINA_CHAT_COMPLETIONS_API,
    private readonly responseLength?: ChatResponseLength,
    reasoningEffort?: SarashinaReasoningEffort,
  ) {
    if (!apiKey?.trim()) {
      throw new Error('sarashina provider requires apiKey.');
    }
    const supported = getSarashinaSupportedReasoningEfforts(model);
    if (reasoningEffort !== undefined && !supported.includes(reasoningEffort)) {
      throw new Error(
        `Model ${model} does not support reasoning_effort: ${reasoningEffort}.`,
      );
    }
    this.reasoningEffort =
      reasoningEffort ?? getDefaultSarashinaReasoningEffort(model);
  }

  getModel(): string {
    return this.model;
  }

  getVisionModel(): string {
    return this.model;
  }

  async processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (
      text: string,
      completion?: ToolChatCompletion,
    ) => Promise<void>,
  ): Promise<void> {
    await processChatWithOptionalTools({
      hasTools: this.tools.length > 0,
      runWithoutTools: () => this.chatOnce(messages, true, onPartialResponse),
      runWithTools: () => this.chatOnce(messages, true, onPartialResponse),
      onCompleteResponse,
      toolErrorMessage:
        'processChat received tool_calls. Use the chatOnce() tool loop.',
    });
  }

  async processVisionChat(
    _messages: MessageWithVision[],
    _onPartialResponse: (text: string) => void,
    _onCompleteResponse: (
      text: string,
      completion?: ToolChatCompletion,
    ) => Promise<void>,
  ): Promise<never> {
    throw new Error('Sarashina does not support vision.');
  }

  async visionChatOnce(
    _messages: MessageWithVision[],
    _stream = false,
    _onPartialResponse: (text: string) => void = () => {},
    _maxTokens?: number,
  ): Promise<never> {
    throw new Error('Sarashina does not support vision.');
  }

  async chatOnce(
    messages: Message[],
    stream = true,
    onPartialResponse: (text: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const tokenLimit =
      maxTokens ?? getMaxTokensForResponseLength(this.responseLength);
    if (tokenLimit !== undefined && !Number.isFinite(tokenLimit)) {
      throw new Error('Sarashina maxTokens must be finite.');
    }
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((message) => {
        const { role, content, tool_calls, tool_call_id, reasoning } = message;
        if (
          typeof content !== 'string' &&
          !(role === 'assistant' && content === null)
        ) {
          throw new Error('Sarashina only supports text messages.');
        }
        return {
          role,
          content,
          ...(role === 'assistant' && tool_calls ? { tool_calls } : {}),
          ...(role === 'assistant' && reasoning !== undefined
            ? { reasoning }
            : {}),
          ...(role === 'tool' && tool_call_id ? { tool_call_id } : {}),
        };
      }),
      stream,
    };
    if (tokenLimit !== undefined) {
      body.max_completion_tokens = Math.min(
        SARASHINA_MAX_COMPLETION_TOKENS,
        Math.max(1, Math.floor(tokenLimit)),
      );
    }
    if (this.reasoningEffort !== undefined) {
      body.reasoning_effort = this.reasoningEffort;
    }
    if (this.tools.length) {
      body.tools = buildOpenAICompatibleTools(this.tools, 'chat-completions');
      body.tool_choice = 'auto';
    }
    const response = await ChatServiceHttpClient.post(this.endpoint, body, {
      Authorization: `Bearer ${this.apiKey}`,
    });
    const options = {
      preserveAssistantMessage: true,
      reasoningField: 'reasoning' as const,
      requireDone: true,
      throwOnApiError: true,
    };
    return stream
      ? parseOpenAICompatibleToolStream(response, onPartialResponse, options)
      : parseOpenAICompatibleOneShot(await response.json(), options);
  }
}
