import { ChatService } from '../../ChatService';
import { ChatServiceFactory } from '../../ChatServiceFactory';
import { ClaudeAgentSDKChatServiceProvider } from './ClaudeAgentSDKChatServiceProvider';
import { CodexSDKChatServiceProvider } from './CodexSDKChatServiceProvider';
import { CopilotSDKChatServiceProvider } from './CopilotSDKChatServiceProvider';
import { CursorSDKChatServiceProvider } from './CursorSDKChatServiceProvider';
import {
  ClaudeAgentSDKChatServiceOptions,
  ClaudeAgentSDKLoader,
} from './ClaudeAgentSDKChatService';
import {
  CodexSDKChatServiceOptions,
  CodexSDKLoader,
} from './CodexSDKChatService';
import {
  CopilotSDKChatServiceOptions,
  CopilotSDKLoader,
} from './CopilotSDKChatService';
import {
  CursorSDKChatServiceOptions,
  CursorSDKLoader,
} from './CursorSDKChatService';

export {
  ClaudeAgentSDKChatService,
  DEFAULT_CLAUDE_AGENT_SDK_MODEL,
  type ClaudeAgentSDKChatServiceOptions,
  type ClaudeAgentSDKLoader,
} from './ClaudeAgentSDKChatService';
export { ClaudeAgentSDKChatServiceProvider } from './ClaudeAgentSDKChatServiceProvider';
export {
  CodexSDKChatService,
  DEFAULT_CODEX_SDK_MODEL,
  type CodexSDKChatServiceOptions,
  type CodexSDKLoader,
} from './CodexSDKChatService';
export { CodexSDKChatServiceProvider } from './CodexSDKChatServiceProvider';
export {
  CopilotSDKChatService,
  DEFAULT_COPILOT_SDK_MODEL,
  type CopilotSDKChatServiceOptions,
  type CopilotSDKLoader,
} from './CopilotSDKChatService';
export { CopilotSDKChatServiceProvider } from './CopilotSDKChatServiceProvider';
export {
  CursorSDKChatService,
  DEFAULT_CURSOR_SDK_MODEL,
  type CursorSDKChatServiceOptions,
  type CursorSDKLoader,
} from './CursorSDKChatService';
export { CursorSDKChatServiceProvider } from './CursorSDKChatServiceProvider';

export type AgentChatProviderName =
  | 'codex-sdk'
  | 'claude-agent-sdk'
  | 'copilot-sdk'
  | 'cursor-sdk';

export type AgentChatServiceOptionsByProvider = {
  'codex-sdk': CodexSDKChatServiceOptions;
  'claude-agent-sdk': ClaudeAgentSDKChatServiceOptions;
  'copilot-sdk': CopilotSDKChatServiceOptions;
  'cursor-sdk': CursorSDKChatServiceOptions;
};

export type RegisterAgentChatProvidersOptions = {
  codexSDKLoader?: CodexSDKLoader;
  claudeAgentSDKLoader?: ClaudeAgentSDKLoader;
  copilotSDKLoader?: CopilotSDKLoader;
  cursorSDKLoader?: CursorSDKLoader;
};

export function registerAgentChatProviders(
  options: RegisterAgentChatProvidersOptions = {},
): void {
  ChatServiceFactory.registerProvider(
    new CodexSDKChatServiceProvider(options.codexSDKLoader),
  );
  ChatServiceFactory.registerProvider(
    new ClaudeAgentSDKChatServiceProvider(options.claudeAgentSDKLoader),
  );
  ChatServiceFactory.registerProvider(
    new CopilotSDKChatServiceProvider(options.copilotSDKLoader),
  );
  ChatServiceFactory.registerProvider(
    new CursorSDKChatServiceProvider(options.cursorSDKLoader),
  );
}

export function createAgentChatService<TProvider extends AgentChatProviderName>(
  providerName: TProvider,
  options: AgentChatServiceOptionsByProvider[TProvider],
): ChatService {
  return ChatServiceFactory.createChatService(
    providerName as any,
    options as Record<string, unknown> as any,
  );
}
