import { ChatService } from '../../ChatService';
import {
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import {
  CursorSDKChatService,
  CursorSDKChatServiceOptions,
  CursorSDKLoader,
  DEFAULT_CURSOR_SDK_MODEL,
} from './CursorSDKChatService';
import { rejectUnsupportedAgentOptions } from './shared';

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
