import { ChatService } from '../../ChatService.js';
import {
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider.js';
import {
  CopilotSDKChatService,
  CopilotSDKChatServiceOptions,
  CopilotSDKLoader,
  DEFAULT_COPILOT_SDK_MODEL,
} from './CopilotSDKChatService.js';
import { rejectUnsupportedAgentOptions } from './shared.js';

export class CopilotSDKChatServiceProvider
  implements ChatServiceProvider<CopilotSDKChatServiceOptions>
{
  constructor(private loadSDK?: CopilotSDKLoader) {}

  createChatService(options: CopilotSDKChatServiceOptions): ChatService {
    rejectUnsupportedAgentOptions(this.getProviderName(), options);
    return new CopilotSDKChatService(options, this.loadSDK);
  }

  getProviderName(): string {
    return 'copilot-sdk';
  }

  getSupportedModels(): string[] {
    return [DEFAULT_COPILOT_SDK_MODEL];
  }

  getDefaultModel(): string {
    return DEFAULT_COPILOT_SDK_MODEL;
  }

  supportsVision(): boolean {
    return false;
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'unsupported';
  }
}
