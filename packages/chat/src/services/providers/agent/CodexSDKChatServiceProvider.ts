import { ChatService } from '../../ChatService.js';
import {
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider.js';
import {
  CodexSDKChatService,
  CodexSDKChatServiceOptions,
  CodexSDKLoader,
  DEFAULT_CODEX_SDK_MODEL,
} from './CodexSDKChatService.js';
import { rejectUnsupportedAgentOptions } from './shared.js';

export class CodexSDKChatServiceProvider
  implements ChatServiceProvider<CodexSDKChatServiceOptions>
{
  constructor(private loadSDK?: CodexSDKLoader) {}

  createChatService(options: CodexSDKChatServiceOptions): ChatService {
    rejectUnsupportedAgentOptions(this.getProviderName(), options);
    return new CodexSDKChatService(options, this.loadSDK);
  }

  getProviderName(): string {
    return 'codex-sdk';
  }

  getSupportedModels(): string[] {
    return [DEFAULT_CODEX_SDK_MODEL];
  }

  getDefaultModel(): string {
    return DEFAULT_CODEX_SDK_MODEL;
  }

  supportsVision(): boolean {
    return false;
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'unsupported';
  }
}
