import { ChatService } from '../../ChatService';
import { GeminiNanoChatService } from './GeminiNanoChatService';
import {
  GeminiNanoChatServiceOptions,
  ChatServiceProvider,
  VisionSupportLevel,
} from '../ChatServiceProvider';
import { MODEL_GEMINI_NANO } from '../../../constants/geminiNano';

/**
 * Gemini Nano (Chrome built-in AI) provider implementation.
 * No API key required — runs entirely in the browser.
 */
export class GeminiNanoChatServiceProvider
  implements ChatServiceProvider<GeminiNanoChatServiceOptions>
{
  createChatService(options: GeminiNanoChatServiceOptions): ChatService {
    return new GeminiNanoChatService({
      expectedInputLanguages: options.expectedInputLanguages,
      expectedOutputLanguages: options.expectedOutputLanguages,
      responseLength: options.responseLength,
    });
  }

  getProviderName(): string {
    return 'gemini-nano';
  }

  getSupportedModels(): string[] {
    return [MODEL_GEMINI_NANO];
  }

  getDefaultModel(): string {
    return MODEL_GEMINI_NANO;
  }

  supportsVision(): boolean {
    return false;
  }

  getVisionSupportLevel(): VisionSupportLevel {
    return 'unsupported';
  }
}
