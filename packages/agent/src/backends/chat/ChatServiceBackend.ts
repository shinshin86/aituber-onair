import {
  buildToolContinuationMessages,
  getChatBackendProviderCapabilities,
} from '@aituber-onair/chat/backend';
import type {
  ChatService,
  Message,
  ToolChatCompletion,
  ToolDefinition,
  ToolResultBlock,
  ToolUseBlock,
} from '@aituber-onair/chat';
import {
  AgentBackendError,
  AgentBackendProtocolError,
  AgentConfigurationError,
  AgentInterruptedError,
  AgentSessionClosedError,
  AgentTimeoutError,
  AgentTurnInProgressError,
} from '../../errors.js';
import type {
  AgentBackendEvent,
  AgentBackendSession,
  AgentBackendSessionInput,
  AgentBackendTool,
  AgentBackendToolResult,
  AgentEventError,
  AgentRunInput,
  AgentRunOptions,
  AgentUsage,
  JsonValue,
} from '../../types.js';
import { AsyncEventQueue } from '../../core/AsyncEventQueue.js';
import { sanitizeJsonRecord } from '../../internal/eventError.js';
import {
  buildChatSessionMessages,
  buildChatTurnMessages,
  serializeChatData,
} from './buildMessages.js';
import type {
  ChatServiceBackend,
  ChatServiceBackendCapabilities,
  ChatServiceBackendOptions,
  ChatServiceFactoryInput,
} from './types.js';

const DEFAULT_MAX_TOOL_ROUNDS = 6;
const CAPABILITY_KEYS = new Set([
  'approvals',
  'detailedEvents',
  'interruption',
  'sessionResume',
  'streaming',
  'text',
  'tools',
]);

interface ProviderToolRegistry {
  readonly definitions: ToolDefinition[];
  readonly byProviderName: ReadonlyMap<string, AgentBackendTool>;
}

interface PendingToolResult {
  readonly resolve: (result: AgentBackendToolResult) => void;
  readonly reject: (error: unknown) => void;
}

interface ActiveChatTurn {
  readonly controller: AbortController;
  readonly queue: AsyncEventQueue<AgentBackendEvent>;
  readonly pendingToolResults: Map<string, PendingToolResult>;
  completion: Promise<void>;
  externalSignal?: AbortSignal;
  externalAbortListener?: () => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

class ChatServiceBackendRuntime implements ChatServiceBackend {
  readonly kind = 'chat' as const;
  readonly name: string;
  readonly backendCapabilities: Readonly<ChatServiceBackendCapabilities>;

  private readonly provider?: string;
  private readonly createChatService: ChatServiceBackendOptions['createChatService'];
  private readonly maxToolRounds: number;

  constructor(options: ChatServiceBackendOptions) {
    const issues = validateOptions(options);
    if (issues.length > 0) {
      throw new AgentConfigurationError(
        'ChatService backend options are invalid.',
        issues
      );
    }
    this.provider = options.provider;
    this.createChatService = options.createChatService;
    this.maxToolRounds = options.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;
    this.backendCapabilities = Object.freeze(
      options.backendCapabilities
        ? { ...options.backendCapabilities }
        : resolveProviderCapabilities(options.provider as string)
    );
    this.name = this.provider
      ? `chat-service:${this.provider}`
      : 'chat-service';
  }

  async startSession(
    input: AgentBackendSessionInput
  ): Promise<AgentBackendSession> {
    if (input.backendSessionId !== undefined) {
      throw new AgentBackendProtocolError(
        'ChatService backend does not support Session resume.'
      );
    }
    if (!this.backendCapabilities.tools && input.tools.length > 0) {
      throw new AgentBackendProtocolError(
        'ChatService backend received Tools while Tool support is disabled.'
      );
    }

    const toolRegistry = createProviderToolRegistry(input.tools);
    const factoryInput: ChatServiceFactoryInput = {
      tools: this.backendCapabilities.tools ? toolRegistry.definitions : [],
      session: Object.freeze({
        agentId: input.agentId,
        sessionId: input.sessionId,
        purpose: input.purpose,
        audience: input.audience,
        inputTrust: input.inputTrust,
      }),
    };

    let chatService: ChatService;
    try {
      chatService = await this.createChatService(factoryInput);
    } catch (error) {
      throw new AgentBackendError(
        'ChatService factory failed to create a Session service.',
        { cause: error }
      );
    }
    assertChatService(chatService);
    if (this.provider && chatService.provider !== this.provider) {
      throw new AgentBackendProtocolError(
        `ChatService factory returned provider "${chatService.provider}" instead of "${this.provider}".`
      );
    }

    return new ChatServiceBackendSession({
      input,
      chatService,
      backendCapabilities: this.backendCapabilities,
      toolRegistry,
      maxToolRounds: this.maxToolRounds,
    });
  }
}

interface ChatServiceBackendSessionOptions {
  readonly input: AgentBackendSessionInput;
  readonly chatService: ChatService;
  readonly backendCapabilities: Readonly<ChatServiceBackendCapabilities>;
  readonly toolRegistry: ProviderToolRegistry;
  readonly maxToolRounds: number;
}

class ChatServiceBackendSession implements AgentBackendSession {
  readonly id: string;

  private readonly inputTrust: AgentBackendSessionInput['inputTrust'];
  private readonly chatService: ChatService;
  private readonly backendCapabilities: Readonly<ChatServiceBackendCapabilities>;
  private readonly toolRegistry: ProviderToolRegistry;
  private readonly maxToolRounds: number;
  private history: Message[];
  private activeTurn?: ActiveChatTurn;
  private closed = false;
  private closePromise?: Promise<void>;

  constructor(options: ChatServiceBackendSessionOptions) {
    this.id = options.input.sessionId;
    this.inputTrust = options.input.inputTrust;
    this.chatService = options.chatService;
    this.backendCapabilities = options.backendCapabilities;
    this.toolRegistry = options.toolRegistry;
    this.maxToolRounds = options.maxToolRounds;
    this.history = buildChatSessionMessages(options.input);
  }

  runStream(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): AsyncIterable<AgentBackendEvent> {
    if (this.closed) throw new AgentSessionClosedError();
    if (this.activeTurn) throw new AgentTurnInProgressError();

    const controller = new AbortController();
    const queue = new AsyncEventQueue<AgentBackendEvent>(() => {
      const activeTurn = this.activeTurn;
      if (!activeTurn || activeTurn.controller !== controller) return;
      this.abortTurn(
        activeTurn,
        new AgentInterruptedError(
          'The ChatService event consumer stopped before Turn completion.'
        )
      );
    });
    const turn: ActiveChatTurn = {
      controller,
      queue,
      pendingToolResults: new Map(),
      completion: Promise.resolve(),
    };
    this.activeTurn = turn;
    this.configureCancellation(turn, options);
    const execution = this.executeTurn(turn, input);
    turn.completion = execution
      .then(
        () => queue.close(),
        (error) => queue.fail(error)
      )
      .finally(() => {
        this.clearCancellation(turn);
        if (this.activeTurn === turn) this.activeTurn = undefined;
      });
    return queue;
  }

  async submitToolResult(result: AgentBackendToolResult): Promise<void> {
    const turn = this.activeTurn;
    if (!turn || turn.controller.signal.aborted) {
      throw new AgentBackendProtocolError(
        'ChatService backend has no active Tool request.'
      );
    }
    const pending = turn.pendingToolResults.get(result.toolCallId);
    if (!pending) {
      throw new AgentBackendProtocolError(
        `ChatService backend has no pending Tool call "${result.toolCallId}".`
      );
    }
    turn.pendingToolResults.delete(result.toolCallId);
    pending.resolve(result);
  }

  async interrupt(): Promise<void> {
    if (this.closed) throw new AgentSessionClosedError();
    const turn = this.activeTurn;
    if (!turn) return;
    this.abortTurn(turn, new AgentInterruptedError());
    await turn.completion;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    const turn = this.activeTurn;
    if (turn) {
      this.abortTurn(
        turn,
        new AgentInterruptedError(
          'The ChatService Session closed during an active Turn.'
        )
      );
    }
    this.closePromise = turn ? turn.completion : Promise.resolve();
    return this.closePromise;
  }

  private async executeTurn(
    turn: ActiveChatTurn,
    input: AgentRunInput
  ): Promise<void> {
    let messages = [
      ...this.history,
      ...buildChatTurnMessages(input, this.inputTrust),
    ];
    let toolRounds = 0;
    let usage: AgentUsage | undefined;

    while (true) {
      const completion = await this.runChatCompletion(turn, messages);
      assertToolChatCompletion(completion);
      usage = mergeAgentUsage(usage, toAgentUsage(completion.usage));

      if (completion.stop_reason === 'end') {
        if (getToolUses(completion).length > 0) {
          throw new AgentBackendProtocolError(
            'ChatService returned Tool calls with an end stop reason.'
          );
        }
        const message = extractCompletionText(completion);
        const assistantMessage = completion.assistant_message
          ? ({ ...completion.assistant_message } as Message)
          : ({ role: 'assistant', content: message } as Message);
        messages = [...messages, assistantMessage];
        this.history = messages;
        turn.queue.push({ type: 'message.completed', text: message });
        turn.queue.push({
          type: 'completed',
          message,
          usage,
          metadata: {
            provider: this.chatService.provider,
            model: this.chatService.getModel(),
            toolRounds,
          },
        });
        return;
      }

      if (!this.backendCapabilities.tools) {
        throw new AgentBackendProtocolError(
          'ChatService requested a Tool while Tool support is disabled.'
        );
      }
      if (toolRounds >= this.maxToolRounds) {
        throw new AgentBackendError(
          `ChatService Tool loop exceeded ${this.maxToolRounds} rounds.`,
          { details: { maxToolRounds: this.maxToolRounds } }
        );
      }
      const toolUses = getToolUses(completion);
      if (toolUses.length === 0) {
        throw new AgentBackendProtocolError(
          'ChatService returned a Tool stop reason without Tool calls.'
        );
      }

      const toolResults: ToolResultBlock[] = [];
      for (const toolUse of toolUses) {
        const tool = this.toolRegistry.byProviderName.get(toolUse.name);
        if (!tool) {
          throw new AgentBackendProtocolError(
            `ChatService requested unknown Tool "${toolUse.name}".`
          );
        }
        const result = await this.requestToolResult(turn, toolUse, tool);
        toolResults.push(toToolResultBlock(result));
      }
      messages = buildToolContinuationMessages({
        provider: this.chatService.provider,
        messages,
        completion,
        toolResults,
      });
      toolRounds += 1;
    }
  }

  private async runChatCompletion(
    turn: ActiveChatTurn,
    messages: Message[]
  ): Promise<ToolChatCompletion> {
    if (turn.controller.signal.aborted) {
      throw turn.controller.signal.reason;
    }
    let callbackError: AgentBackendProtocolError | undefined;
    let acceptDeltas = true;
    const onPartialResponse = this.backendCapabilities.streaming
      ? (text: string) => {
          if (!acceptDeltas || turn.controller.signal.aborted) return;
          if (typeof text !== 'string') {
            callbackError = new AgentBackendProtocolError(
              'ChatService emitted a non-string partial response.'
            );
            return;
          }
          if (text) turn.queue.push({ type: 'message.delta', text });
        }
      : () => undefined;

    try {
      const completion = await raceWithAbort(
        this.chatService.chatOnce(
          messages,
          this.backendCapabilities.streaming,
          onPartialResponse
        ),
        turn.controller.signal
      );
      acceptDeltas = false;
      if (callbackError) throw callbackError;
      return completion;
    } catch (error) {
      acceptDeltas = false;
      if (turn.controller.signal.aborted) {
        throw turn.controller.signal.reason;
      }
      if (
        error instanceof AgentBackendError ||
        error instanceof AgentBackendProtocolError
      ) {
        throw error;
      }
      throw new AgentBackendError(
        `ChatService provider "${this.chatService.provider}" failed during completion.`,
        { cause: error }
      );
    }
  }

  private requestToolResult(
    turn: ActiveChatTurn,
    toolUse: ToolUseBlock,
    tool: AgentBackendTool
  ): Promise<AgentBackendToolResult> {
    if (turn.pendingToolResults.has(toolUse.id)) {
      return Promise.reject(
        new AgentBackendProtocolError(
          `ChatService reused Tool call ID "${toolUse.id}".`
        )
      );
    }
    const pending = new Promise<AgentBackendToolResult>((resolve, reject) => {
      turn.pendingToolResults.set(toolUse.id, { resolve, reject });
    });
    turn.queue.push({
      type: 'tool.requested',
      toolCallId: toolUse.id,
      toolName: tool.definition.name,
      arguments: toolUse.input ?? {},
    });
    return raceWithAbort(pending, turn.controller.signal).finally(() => {
      turn.pendingToolResults.delete(toolUse.id);
    });
  }

  private configureCancellation(
    turn: ActiveChatTurn,
    options: AgentRunOptions | undefined
  ): void {
    if (options?.signal) {
      const externalSignal = options.signal;
      const listener = () =>
        this.abortTurn(
          turn,
          externalSignal.reason instanceof Error
            ? externalSignal.reason
            : new AgentInterruptedError(
                'The ChatService Turn was aborted by the caller.'
              )
        );
      turn.externalSignal = externalSignal;
      turn.externalAbortListener = listener;
      if (externalSignal.aborted) listener();
      else externalSignal.addEventListener('abort', listener, { once: true });
    }
    if (options?.timeoutMs !== undefined) {
      turn.timeoutId = setTimeout(
        () => this.abortTurn(turn, new AgentTimeoutError()),
        options.timeoutMs
      );
    }
  }

  private clearCancellation(turn: ActiveChatTurn): void {
    if (turn.timeoutId !== undefined) clearTimeout(turn.timeoutId);
    if (turn.externalSignal && turn.externalAbortListener) {
      turn.externalSignal.removeEventListener(
        'abort',
        turn.externalAbortListener
      );
    }
  }

  private abortTurn(turn: ActiveChatTurn, reason: unknown): void {
    if (turn.controller.signal.aborted) return;
    turn.controller.abort(reason);
    for (const pending of turn.pendingToolResults.values()) {
      pending.reject(reason);
    }
    turn.pendingToolResults.clear();
  }
}

export function createChatServiceBackend(
  options: ChatServiceBackendOptions
): ChatServiceBackend {
  return new ChatServiceBackendRuntime(options);
}

function validateOptions(options: ChatServiceBackendOptions): string[] {
  const issues: string[] = [];
  if (
    typeof options !== 'object' ||
    options === null ||
    Array.isArray(options)
  ) {
    return ['options must be an object'];
  }
  if (typeof options.createChatService !== 'function') {
    issues.push('createChatService must be a function');
  }
  if (
    options.provider !== undefined &&
    (typeof options.provider !== 'string' || !options.provider.trim())
  ) {
    issues.push('provider must be a non-empty string');
  }
  if (!options.backendCapabilities && !options.provider) {
    issues.push('backendCapabilities or provider must be supplied');
  }
  if (options.backendCapabilities) {
    validateCapabilities(options.backendCapabilities, issues);
    const providerCapabilities = options.provider
      ? getChatBackendProviderCapabilities(options.provider)
      : undefined;
    if (
      providerCapabilities &&
      options.backendCapabilities.tools &&
      !providerCapabilities.tools
    ) {
      issues.push(
        `backendCapabilities.tools cannot enable Tools for provider "${options.provider}"`
      );
    }
    if (
      providerCapabilities &&
      options.backendCapabilities.streaming &&
      !providerCapabilities.streaming
    ) {
      issues.push(
        `backendCapabilities.streaming cannot enable streaming for provider "${options.provider}"`
      );
    }
  }
  if (
    options.maxToolRounds !== undefined &&
    (!Number.isInteger(options.maxToolRounds) || options.maxToolRounds <= 0)
  ) {
    issues.push('maxToolRounds must be a positive integer');
  }
  return issues;
}

function validateCapabilities(
  backendCapabilities: ChatServiceBackendCapabilities,
  issues: string[]
): void {
  if (
    typeof backendCapabilities !== 'object' ||
    backendCapabilities === null ||
    Array.isArray(backendCapabilities)
  ) {
    issues.push('backendCapabilities must be an object');
    return;
  }
  for (const key of Object.keys(backendCapabilities)) {
    if (!CAPABILITY_KEYS.has(key)) {
      issues.push(`backendCapabilities contains unsupported option "${key}"`);
    }
  }
  for (const key of CAPABILITY_KEYS) {
    if (
      typeof backendCapabilities[
        key as keyof ChatServiceBackendCapabilities
      ] !== 'boolean'
    ) {
      issues.push(`backendCapabilities.${key} must be a boolean`);
    }
  }
  if (backendCapabilities.text !== true) {
    issues.push('backendCapabilities.text must be true');
  }
  if (backendCapabilities.sessionResume !== false) {
    issues.push('backendCapabilities.sessionResume must be false');
  }
  if (backendCapabilities.approvals !== false) {
    issues.push('backendCapabilities.approvals must be false');
  }
}

function resolveProviderCapabilities(
  provider: string
): ChatServiceBackendCapabilities {
  const providerCapabilities = getChatBackendProviderCapabilities(provider);
  if (!providerCapabilities) {
    throw new AgentConfigurationError(
      'ChatService backend provider capabilities were not found.',
      [
        `Provider "${provider}" is not registered; supply explicit backendCapabilities for custom providers`,
      ]
    );
  }
  return {
    text: true,
    streaming: providerCapabilities.streaming,
    tools: providerCapabilities.tools,
    interruption: false,
    sessionResume: false,
    approvals: false,
    detailedEvents: providerCapabilities.tools,
  };
}

function assertChatService(value: unknown): asserts value is ChatService {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Partial<ChatService>)
      : undefined;
  if (
    !candidate ||
    typeof candidate.provider !== 'string' ||
    !candidate.provider.trim() ||
    typeof candidate.getModel !== 'function' ||
    typeof candidate.chatOnce !== 'function'
  ) {
    throw new AgentBackendProtocolError(
      'ChatService factory returned an invalid service.'
    );
  }
}

function createProviderToolRegistry(
  tools: readonly AgentBackendTool[]
): ProviderToolRegistry {
  const usedNames = new Set<string>();
  const byProviderName = new Map<string, AgentBackendTool>();
  const definitions = tools.map((tool) => {
    const name = createProviderSafeToolName(tool.id, usedNames);
    const parameters = tool.definition.parameters;
    if (parameters.type !== 'object') {
      throw new AgentBackendProtocolError(
        `Agent Tool "${tool.id}" must use an object parameters schema.`
      );
    }
    usedNames.add(name);
    byProviderName.set(name, tool);
    return {
      name,
      description: tool.definition.description,
      parameters: parameters as ToolDefinition['parameters'],
    };
  });
  return { definitions, byProviderName };
}

function createProviderSafeToolName(
  logicalId: string,
  usedNames: ReadonlySet<string>
): string {
  const normalized = logicalId
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '');
  const base = normalized || 'tool';
  let candidate = base.slice(0, 64);
  if (!usedNames.has(candidate)) return candidate;

  const hash = stableHash(logicalId);
  candidate = `${base.slice(0, 55)}_${hash}`;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    const counter = `_${suffix}`;
    candidate = `${base.slice(0, 64 - counter.length)}${counter}`;
    suffix += 1;
  }
  return candidate;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function assertToolChatCompletion(
  value: unknown
): asserts value is ToolChatCompletion {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Partial<ToolChatCompletion>)
      : undefined;
  if (
    !candidate ||
    !Array.isArray(candidate.blocks) ||
    (candidate.stop_reason !== 'end' && candidate.stop_reason !== 'tool_use')
  ) {
    throw new AgentBackendProtocolError(
      'ChatService returned a malformed completion.'
    );
  }
  for (const block of candidate.blocks) {
    if (typeof block !== 'object' || block === null || !('type' in block)) {
      throw new AgentBackendProtocolError(
        'ChatService returned a malformed completion block.'
      );
    }
    if (block.type === 'text' && typeof block.text === 'string') continue;
    if (
      block.type === 'tool_result' &&
      typeof block.tool_use_id === 'string' &&
      typeof block.content === 'string'
    ) {
      continue;
    }
    if (
      block.type === 'tool_use' &&
      typeof block.id === 'string' &&
      block.id.trim() &&
      typeof block.name === 'string' &&
      block.name.trim()
    ) {
      continue;
    }
    throw new AgentBackendProtocolError(
      'ChatService returned a malformed completion block.'
    );
  }
}

function getToolUses(completion: ToolChatCompletion): ToolUseBlock[] {
  return completion.blocks.filter(
    (block): block is ToolUseBlock => block.type === 'tool_use'
  );
}

function extractCompletionText(completion: ToolChatCompletion): string {
  return completion.blocks
    .map((block) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'tool_result') return block.content;
      return '';
    })
    .join('');
}

function toToolResultBlock(result: AgentBackendToolResult): ToolResultBlock {
  if (result.type === 'success') {
    return {
      type: 'tool_result',
      tool_use_id: result.toolCallId,
      content: serializeChatData(result.output ?? null, 'Agent Tool result'),
    };
  }
  return {
    type: 'tool_result',
    tool_use_id: result.toolCallId,
    content: serializeChatData(
      { error: toSerializableEventError(result.error) },
      'Agent Tool error'
    ),
  };
}

function toSerializableEventError(error: AgentEventError): JsonValue {
  const details = sanitizeJsonRecord(error.details);
  return {
    name: error.name,
    code: error.code,
    message: error.message,
    ...(details ? { details } : {}),
  };
}

function toAgentUsage(
  usage: ToolChatCompletion['usage']
): AgentUsage | undefined {
  if (!usage) return undefined;
  const inputTokens = firstFiniteNumber(
    usage.inputTokens,
    usage.input_tokens,
    usage.prompt_tokens
  );
  const outputTokens = firstFiniteNumber(
    usage.outputTokens,
    usage.output_tokens,
    usage.completion_tokens
  );
  const totalTokens = firstFiniteNumber(usage.totalTokens, usage.total_tokens);
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined;
  }
  return { inputTokens, outputTokens, totalTokens };
}

function mergeAgentUsage(
  accumulated: AgentUsage | undefined,
  current: AgentUsage | undefined
): AgentUsage | undefined {
  if (!accumulated) return current;
  if (!current) return accumulated;
  return {
    inputTokens: sumDefined(accumulated.inputTokens, current.inputTokens),
    outputTokens: sumDefined(accumulated.outputTokens, current.outputTokens),
    totalTokens: sumDefined(accumulated.totalTokens, current.totalTokens),
  };
}

function sumDefined(
  left: number | undefined,
  right: number | undefined
): number | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return left + right;
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  return values.find(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value)
  );
}

function raceWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  if (signal.aborted) {
    void promise.catch(() => undefined);
    return Promise.reject(signal.reason);
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (result) => {
        signal.removeEventListener('abort', onAbort);
        resolve(result);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}
