import type { ChatService, ToolDefinition } from '@aituber-onair/chat';
import type {
  AgentBackend,
  AgentBackendCapabilities,
  AgentBackendSessionDescriptor,
} from '../../types.js';

export interface ChatServiceBackendCapabilities
  extends AgentBackendCapabilities {
  readonly text: true;
  readonly sessionResume: false;
  readonly approvals: false;
}

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

export interface ChatServiceBackend extends AgentBackend {
  readonly kind: 'chat';
  readonly backendCapabilities: Readonly<ChatServiceBackendCapabilities>;
}
