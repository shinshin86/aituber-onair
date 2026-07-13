import type { ChatService, Message } from '@aituber-onair/chat';
import type { ChatRewriteModelOptions, RewriteModel } from '../core/types.js';

export function createChatRewriteModel(
  options: ChatRewriteModelOptions
): RewriteModel {
  // Load @aituber-onair/chat lazily so importing this package never pulls it
  // in unless the chat-provider option is actually used (a pre-created
  // ChatService instance needs no factory at all).
  let servicePromise: Promise<ChatService> | undefined;
  const resolveService = (): Promise<ChatService> => {
    if ('service' in options) {
      return Promise.resolve(options.service);
    }

    servicePromise ??= import('@aituber-onair/chat').then(
      ({ ChatServiceFactory }) =>
        ChatServiceFactory.createChatService(
          options.provider,
          options.options as never
        )
    );

    return servicePromise;
  };

  return {
    async generate(input) {
      const service = await resolveService();
      const messages: Message[] = [
        {
          role: 'system',
          content: input.system,
        },
        {
          role: 'user',
          content: input.prompt,
        },
      ];
      const completion = await service.chatOnce(
        messages,
        false,
        () => undefined,
        options.maxTokens
      );
      const text = completion.blocks
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();

      if (!text) {
        throw new Error('Noise chat rewrite returned an empty response.');
      }

      return text;
    },
  };
}
