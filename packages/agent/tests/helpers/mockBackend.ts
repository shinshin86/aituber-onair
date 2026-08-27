import type {
  AgentBackend,
  AgentBackendApprovalResult,
  AgentBackendCapabilities,
  AgentBackendEvent,
  AgentBackendSession,
  AgentBackendSessionInput,
  AgentBackendToolResult,
  AgentRunInput,
  AgentRunOptions,
} from '../../src/types.js';

export const DEFAULT_BACKEND_CAPABILITIES: AgentBackendCapabilities = {
  text: true,
  streaming: true,
  tools: false,
  interruption: true,
  sessionResume: true,
  approvals: false,
  detailedEvents: true,
};

export type MockStreamFactory = (
  input: AgentRunInput,
  options: AgentRunOptions | undefined,
  session: MockBackendSession
) => AsyncIterable<AgentBackendEvent>;

export class MockBackendSession implements AgentBackendSession {
  readonly id: string;
  readonly runInputs: AgentRunInput[] = [];
  readonly runOptions: (AgentRunOptions | undefined)[] = [];
  readonly toolResults: AgentBackendToolResult[] = [];
  readonly approvalResults: AgentBackendApprovalResult[] = [];
  interruptCalls = 0;
  closeCalls = 0;

  constructor(
    id: string,
    private readonly streamFactory: MockStreamFactory
  ) {
    this.id = id;
  }

  runStream(
    input: AgentRunInput,
    options?: AgentRunOptions
  ): AsyncIterable<AgentBackendEvent> {
    this.runInputs.push(input);
    this.runOptions.push(options);
    return this.streamFactory(input, options, this);
  }

  async submitToolResult(result: AgentBackendToolResult): Promise<void> {
    this.toolResults.push(result);
  }

  async submitApprovalResult(
    result: AgentBackendApprovalResult
  ): Promise<void> {
    this.approvalResults.push(result);
  }

  async interrupt(): Promise<void> {
    this.interruptCalls += 1;
  }

  async close(): Promise<void> {
    this.closeCalls += 1;
  }
}

export class MockBackend implements AgentBackend {
  readonly name = 'mock-backend';
  readonly backendCapabilities: Readonly<AgentBackendCapabilities>;
  readonly startInputs: AgentBackendSessionInput[] = [];
  readonly sessions: MockBackendSession[] = [];

  constructor(
    private readonly streamFactory: MockStreamFactory,
    backendCapabilities: Partial<AgentBackendCapabilities> = {}
  ) {
    this.backendCapabilities = {
      ...DEFAULT_BACKEND_CAPABILITIES,
      ...backendCapabilities,
    };
  }

  async startSession(
    input: AgentBackendSessionInput
  ): Promise<AgentBackendSession> {
    this.startInputs.push(input);
    const session = new MockBackendSession(
      input.backendSessionId ?? `backend-${this.sessions.length + 1}`,
      this.streamFactory
    );
    this.sessions.push(session);
    return session;
  }
}

export async function* completedTextStream(
  message = 'Hello from the backend'
): AsyncIterable<AgentBackendEvent> {
  yield { type: 'message.delta', text: message.slice(0, 5) };
  yield { type: 'message.delta', text: message.slice(5) };
  yield { type: 'message.completed', text: message };
  yield {
    type: 'completed',
    message,
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    metadata: { model: 'mock-model' },
  };
}

export function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });
}
