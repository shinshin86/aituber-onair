import { ChatService } from '../../ChatService';
import { ChatServiceFactory } from '../../ChatServiceFactory';
import { CodexSDKChatServiceProvider } from './CodexSDKChatServiceProvider';
import { CopilotSDKChatServiceProvider } from './CopilotSDKChatServiceProvider';
import {
  CodexSDKChatServiceOptions,
  CodexSDKLoader,
} from './CodexSDKChatService';
import {
  CopilotSDKChatServiceOptions,
  CopilotSDKLoader,
} from './CopilotSDKChatService';

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

export type AgentChatProviderName = 'copilot-sdk' | 'codex-sdk';

export type AgentChatServiceOptionsByProvider = {
  'copilot-sdk': CopilotSDKChatServiceOptions;
  'codex-sdk': CodexSDKChatServiceOptions;
};

export type RegisterAgentChatProvidersOptions = {
  copilotSDKLoader?: CopilotSDKLoader;
  codexSDKLoader?: CodexSDKLoader;
};

export function registerAgentChatProviders(
  options: RegisterAgentChatProvidersOptions = {},
): void {
  ChatServiceFactory.registerProvider(
    new CopilotSDKChatServiceProvider(options.copilotSDKLoader),
  );
  ChatServiceFactory.registerProvider(
    new CodexSDKChatServiceProvider(options.codexSDKLoader),
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
