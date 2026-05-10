import { ChatResponseLength, MAX_TOKENS_BY_LENGTH } from '../../../constants';
import { ChatService } from '../../ChatService';
import { Message, MessageWithVision, ToolChatCompletion } from '../../../types';

export type AgentBaseChatServiceOptions = {
  /** Subscription agent providers use local/CLI auth, not API keys. */
  apiKey?: never;
  /** Model name passed to the underlying SDK when supported. */
  model?: string;
  /** Soft response length instruction for SDKs without max-token controls. */
  responseLength?: ChatResponseLength;
};

export type AgentTextChatOptions = AgentBaseChatServiceOptions & {
  provider: string;
  defaultModel: string;
  getResponse: (
    prompt: string,
    stream: boolean,
    onPartialResponse: (text: string) => void,
  ) => Promise<string>;
};

export class AgentTextChatService implements ChatService {
  readonly provider: string;

  private model: string;
  private responseLength?: ChatResponseLength;
  private getResponse: AgentTextChatOptions['getResponse'];

  constructor(options: AgentTextChatOptions) {
    this.provider = options.provider;
    this.model = options.model ?? options.defaultModel;
    this.responseLength = options.responseLength;
    this.getResponse = options.getResponse;
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
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    const result = await this.chatOnce(messages, true, onPartialResponse);
    const text = result.blocks
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');
    await onCompleteResponse(text);
  }

  async processVisionChat(
    _messages: MessageWithVision[],
    _onPartialResponse: (text: string) => void,
    _onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    throw new Error(`${this.provider} does not support vision chat yet.`);
  }

  async chatOnce(
    messages: Message[],
    stream: boolean = true,
    onPartialResponse: (text: string) => void = () => {},
    maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    const prompt = buildTextPrompt(messages, this.responseLength, maxTokens);
    const text = await this.getResponse(prompt, stream, onPartialResponse);

    if (!stream) {
      onPartialResponse(text);
    }

    return {
      blocks: [{ type: 'text', text }],
      stop_reason: 'end',
    };
  }

  async visionChatOnce(
    _messages: MessageWithVision[],
    _stream: boolean = false,
    _onPartialResponse: (text: string) => void = () => {},
    _maxTokens?: number,
  ): Promise<ToolChatCompletion> {
    throw new Error(`${this.provider} does not support vision chat yet.`);
  }
}

export function rejectUnsupportedAgentOptions(
  providerName: string,
  options: { apiKey?: unknown; tools?: unknown; mcpServers?: unknown },
): void {
  if (options.apiKey !== undefined) {
    throw new Error(`${providerName} provider does not accept apiKey.`);
  }

  if (options.tools !== undefined) {
    throw new Error(`${providerName} provider does not support tools yet.`);
  }

  if (options.mcpServers !== undefined) {
    throw new Error(
      `${providerName} provider does not support mcpServers yet.`,
    );
  }
}

export function wrapAgentProviderError(
  providerName: string,
  error: unknown,
): Error {
  if (error instanceof Error && error.message.includes(' provider requires ')) {
    return error;
  }

  const detail = stringifyError(error);
  const authHint = isLikelyAuthError(detail)
    ? ' This looks like an authentication or subscription permission failure.'
    : '';
  const wrappedError = new Error(
    `${providerName} provider failed.${authHint}\n\nOriginal error:\n${detail}`,
  );
  (wrappedError as { cause?: unknown }).cause = error;
  return wrappedError;
}

function buildTextPrompt(
  messages: Message[],
  responseLength?: ChatResponseLength,
  maxTokens?: number,
): string {
  const parts: string[] = [];
  const lengthInstruction = buildLengthInstruction(responseLength, maxTokens);

  if (lengthInstruction) {
    parts.push(lengthInstruction);
  }

  parts.push(
    ...messages.map((message) => {
      const label = toRoleLabel(message.role);
      return `${label}: ${message.content}`;
    }),
  );

  return parts.join('\n\n');
}

function buildLengthInstruction(
  responseLength?: ChatResponseLength,
  maxTokens?: number,
): string | undefined {
  const tokenLimit =
    maxTokens ??
    (responseLength !== undefined
      ? MAX_TOKENS_BY_LENGTH[responseLength]
      : undefined);

  if (!tokenLimit) {
    return undefined;
  }

  return `Please keep your response within approximately ${tokenLimit} tokens.`;
}

function toRoleLabel(role: Message['role']): string {
  switch (role) {
    case 'system':
      return 'System';
    case 'assistant':
      return 'Assistant';
    case 'tool':
      return 'Tool';
    case 'user':
      return 'User';
  }
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return [error.name, error.message, error.stack]
      .filter((value): value is string => Boolean(value))
      .join('\n');
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

function isLikelyAuthError(detail: string): boolean {
  return /auth|login|log in|logged in|unauthori[sz]ed|forbidden|permission|subscription|credential|token|401|403/i.test(
    detail,
  );
}
