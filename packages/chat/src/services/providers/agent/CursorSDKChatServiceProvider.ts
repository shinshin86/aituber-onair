import { ChatService } from '../../ChatService.js';
import {
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider.js';
import {
  CursorSDKChatService,
  CursorSDKChatServiceOptions,
  CursorSDKLoader,
  DEFAULT_CURSOR_SDK_MODEL,
} from './CursorSDKChatService.js';
import { rejectUnsupportedAgentOptions } from './shared.js';

/** Creates text-only Cursor SDK chat services. */
export class CursorSDKChatServiceProvider
  implements ChatServiceProvider<CursorSDKChatServiceOptions>
{
  constructor(private loadSDK?: CursorSDKLoader) {}

  createChatService(options: CursorSDKChatServiceOptions): ChatService {
    rejectUnsupportedAgentOptions(this.getProviderName(), options, {
      allowApiKey: true,
    });
    return new CursorSDKChatService(options, this.loadSDK);
  }

  getProviderName(): string {
    return 'cursor-sdk';
  }

  getSupportedModels(): string[] {
    return [DEFAULT_CURSOR_SDK_MODEL];
  }

  getDefaultModel(): string {
    return DEFAULT_CURSOR_SDK_MODEL;
  }

  supportsVision(): boolean {
    return false;
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'unsupported';
  }
}
