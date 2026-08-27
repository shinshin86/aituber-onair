import type { ChatService, ToolDefinition } from '@aituber-onair/chat';
import type {
  AgentBackend,
  AgentBackendCapabilities,
  AgentBackendSessionDescriptor,
} from '../../types.js';

/** ChatService-specific backend flags; resume and backend approvals are unsupported. */
export interface ChatServiceBackendCapabilities
  extends AgentBackendCapabilities {
  readonly text: true;
  readonly sessionResume: false;
  readonly approvals: false;
}

/** Visible Tool definitions and immutable Session identity passed to the service factory. */
export interface ChatServiceFactoryInput {
  /** Provider-safe definitions visible to this Session only. */
  readonly tools: ToolDefinition[];
  readonly session: Readonly<AgentBackendSessionDescriptor>;
}

interface ChatServiceBackendBaseOptions {
  readonly createChatService: (
    input: ChatServiceFactoryInput
  ) => ChatService | Promise<ChatService>;
  /** Maximum provider Tool rounds in one Turn. Defaults to 6. */
  readonly maxToolRounds?: number;
}

/**
 * ChatService factory, optional provider identity, backend feature flags, and
 * Tool-loop bound. Custom providers must declare `backendCapabilities`.
 */
export type ChatServiceBackendOptions = ChatServiceBackendBaseOptions &
  (
    | {
        /** Used to verify the factory result and resolve fallback capabilities. */
        readonly provider: string;
        readonly backendCapabilities?: ChatServiceBackendCapabilities;
      }
    | {
        readonly provider?: string;
        readonly backendCapabilities: ChatServiceBackendCapabilities;
      }
  );

/** Agent backend backed by `@aituber-onair/chat` with Session-scoped history. */
export interface ChatServiceBackend extends AgentBackend {
  readonly kind: 'chat';
  readonly backendCapabilities: Readonly<ChatServiceBackendCapabilities>;
}
