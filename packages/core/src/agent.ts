/**
 * Node.js entry point for Core with Agent SDK chat providers registered.
 */
export * from './index';

export {
  type AgentChatProviderName,
  type AgentChatServiceOptionsByProvider,
  ClaudeAgentSDKChatService,
  type ClaudeAgentSDKChatServiceOptions,
  ClaudeAgentSDKChatServiceProvider,
  type ClaudeAgentSDKLoader,
  CodexSDKChatService,
  type CodexSDKChatServiceOptions,
  CodexSDKChatServiceProvider,
  type CodexSDKLoader,
  CopilotSDKChatService,
  type CopilotSDKChatServiceOptions,
  CopilotSDKChatServiceProvider,
  type CopilotSDKLoader,
  createAgentChatService,
  DEFAULT_CLAUDE_AGENT_SDK_MODEL,
  DEFAULT_CODEX_SDK_MODEL,
  DEFAULT_COPILOT_SDK_MODEL,
  registerAgentChatProviders,
  type RegisterAgentChatProvidersOptions,
} from '@aituber-onair/chat/agent';

import { registerAgentChatProviders } from '@aituber-onair/chat/agent';

registerAgentChatProviders();
