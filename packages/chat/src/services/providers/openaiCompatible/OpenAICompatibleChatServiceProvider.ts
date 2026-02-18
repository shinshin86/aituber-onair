import { ChatService } from '../../ChatService';
import { OpenAICompatibleChatServiceOptions } from '../ChatServiceProvider';
import { OpenAIChatServiceProvider } from '../openai/OpenAIChatServiceProvider';
import { OpenAIChatService } from '../openai/OpenAIChatService';

/**
 * OpenAI-compatible provider implementation.
 *
 * This provider targets self-hosted/3rd-party OpenAI-compatible endpoints.
 * To avoid accidental usage of OpenAI default endpoints, endpoint/model are
 * validated explicitly.
 */
export class OpenAICompatibleChatServiceProvider extends OpenAIChatServiceProvider {
  createChatService(options: OpenAICompatibleChatServiceOptions): ChatService {
    this.validateRequiredOptions(options);
    return new OpenAIChatService(
      options.apiKey,
      options.model,
      options.visionModel ?? options.model,
      options.tools,
      options.endpoint,
      [],
      options.responseLength,
      options.verbosity,
      options.reasoning_effort,
      options.enableReasoningSummary,
      this.getProviderName(),
      false,
    );
  }

  getProviderName(): string {
    return 'openai-compatible';
  }

  /**
   * Model list depends on each compatible server implementation.
   */
  getSupportedModels(): string[] {
    return [];
  }

  supportsVision(): boolean {
    return false;
  }

  private validateRequiredOptions(
    options: OpenAICompatibleChatServiceOptions,
  ): void {
    if ((options as { mcpServers?: unknown }).mcpServers !== undefined) {
      throw new Error(
        'openai-compatible provider does not support mcpServers.',
      );
    }

    const endpoint = options.endpoint?.trim();
    if (!endpoint) {
      throw new Error(
        'openai-compatible provider requires endpoint (full URL).',
      );
    }

    let endpointUrl: URL;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      throw new Error(
        'openai-compatible provider requires endpoint to be a full URL.',
      );
    }

    if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
      throw new Error(
        'openai-compatible provider requires endpoint to be a full URL.',
      );
    }

    if (!options.model?.trim()) {
      throw new Error('openai-compatible provider requires model.');
    }
  }
}
