import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import {
  ClaudeAgentSDKChatService,
  ClaudeAgentSDKChatServiceOptions,
  ClaudeAgentSDKLoader,
  DEFAULT_CLAUDE_AGENT_SDK_MODEL,
} from './ClaudeAgentSDKChatService';
import { rejectUnsupportedAgentOptions } from './shared';

export class ClaudeAgentSDKChatServiceProvider
  implements ChatServiceProvider<ClaudeAgentSDKChatServiceOptions>
{
  constructor(private loadSDK?: ClaudeAgentSDKLoader) {}

  createChatService(options: ClaudeAgentSDKChatServiceOptions): ChatService {
    rejectUnsupportedAgentOptions(this.getProviderName(), options);
    return new ClaudeAgentSDKChatService(options, this.loadSDK);
  }

  getProviderName(): string {
    return 'claude-agent-sdk';
  }

  getSupportedModels(): string[] {
    return [DEFAULT_CLAUDE_AGENT_SDK_MODEL];
  }

  getDefaultModel(): string {
    return DEFAULT_CLAUDE_AGENT_SDK_MODEL;
  }

  supportsVision(): boolean {
    return false;
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'unsupported';
  }
}
