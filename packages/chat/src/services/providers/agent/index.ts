import { ChatService } from '../../ChatService.js';
import { ChatServiceFactory } from '../../ChatServiceFactory.js';
import { ClaudeAgentSDKChatServiceProvider } from './ClaudeAgentSDKChatServiceProvider.js';
import { CodexSDKChatServiceProvider } from './CodexSDKChatServiceProvider.js';
import { CopilotSDKChatServiceProvider } from './CopilotSDKChatServiceProvider.js';
import { CursorSDKChatServiceProvider } from './CursorSDKChatServiceProvider.js';
import {
  ClaudeAgentSDKChatServiceOptions,
  ClaudeAgentSDKLoader,
} from './ClaudeAgentSDKChatService.js';
import {
  CodexSDKChatServiceOptions,
  CodexSDKLoader,
} from './CodexSDKChatService.js';
import {
  CopilotSDKChatServiceOptions,
  CopilotSDKLoader,
} from './CopilotSDKChatService.js';
import {
  CursorSDKChatServiceOptions,
  CursorSDKLoader,
} from './CursorSDKChatService.js';

export {
  ClaudeAgentSDKChatService,
  DEFAULT_CLAUDE_AGENT_SDK_MODEL,
  type ClaudeAgentSDKChatServiceOptions,
  type ClaudeAgentSDKLoader,
} from './ClaudeAgentSDKChatService.js';
export { ClaudeAgentSDKChatServiceProvider } from './ClaudeAgentSDKChatServiceProvider.js';
export {
  CodexSDKChatService,
  DEFAULT_CODEX_SDK_MODEL,
  type CodexSDKChatServiceOptions,
  type CodexSDKLoader,
} from './CodexSDKChatService.js';
export { CodexSDKChatServiceProvider } from './CodexSDKChatServiceProvider.js';
export {
  CopilotSDKChatService,
  DEFAULT_COPILOT_SDK_MODEL,
  type CopilotSDKChatServiceOptions,
  type CopilotSDKLoader,
} from './CopilotSDKChatService.js';
export { CopilotSDKChatServiceProvider } from './CopilotSDKChatServiceProvider.js';
export {
  CursorSDKChatService,
  DEFAULT_CURSOR_SDK_MODEL,
  type CursorSDKChatServiceOptions,
  type CursorSDKLoader,
} from './CursorSDKChatService.js';
export { CursorSDKChatServiceProvider } from './CursorSDKChatServiceProvider.js';

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
