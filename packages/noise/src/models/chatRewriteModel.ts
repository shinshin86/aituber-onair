import { ChatServiceFactory } from '@aituber-onair/chat';
import type { Message } from '@aituber-onair/chat';
import type { ChatRewriteModelOptions, RewriteModel } from '../core/types.js';

export function createChatRewriteModel(
  options: ChatRewriteModelOptions
): RewriteModel {
  const service =
    'service' in options
      ? options.service
      : ChatServiceFactory.createChatService(
          options.provider,
          options.options as never
        );

  return {
    async generate(input) {
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
