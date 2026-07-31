import type { ChatService, ToolDefinition } from '@aituber-onair/chat';
import type {
  AgentBackend,
  AgentBackendCapabilities,
  AgentBackendSessionDescriptor,
} from './types.js';

export interface ChatServiceBackendCapabilities
  extends AgentBackendCapabilities {
  readonly text: true;
}

export interface ChatServiceFactoryInput {
  /**
   * Only definitions visible to this Session. Logical Tool IDs have already
   * been converted to provider-safe model names.
   */
  readonly tools: ToolDefinition[];
  readonly session: Readonly<AgentBackendSessionDescriptor>;
}

export interface ChatServiceBackendOptions {
  readonly capabilities: ChatServiceBackendCapabilities;
  readonly createChatService: (
    input: ChatServiceFactoryInput
  ) => ChatService | Promise<ChatService>;
}

/**
 * Runtime implementation is introduced in the Chat backend phase.
 * This contract fixes its dependency direction and capability surface.
 */
export interface ChatServiceBackend extends AgentBackend {
  readonly kind: 'chat';
  readonly capabilities: Readonly<ChatServiceBackendCapabilities>;
}
