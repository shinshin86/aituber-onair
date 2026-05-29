import type { Message, MessageWithVision } from '../../../types';

export function convertMessagesToClaudeFormat(messages: Message[]): any[] {
  return messages.map((msg) => ({
    role: mapRoleToClaude(msg.role),
    content: msg.content,
  }));
}

export function convertVisionMessagesToClaudeFormat(
  messages: MessageWithVision[],
): any[] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return {
        role: mapRoleToClaude(msg.role),
        content: [
          {
            type: 'text',
            text: msg.content,
          },
        ],
      };
    }

    if (Array.isArray(msg.content)) {
      const content = msg.content
        .map((block) => {
          if (block.type === 'image_url') {
            if (block.image_url.url.startsWith('data:')) {
              const m = block.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
              if (m) {
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: m[1],
                    data: m[2],
                  },
                };
              }
              return null;
            }

            return {
              type: 'image',
              source: {
                type: 'url',
                url: block.image_url.url,
                media_type: getMimeTypeFromUrl(block.image_url.url),
              },
            };
          }
          return block;
        })
        .filter((b) => b);

      return {
        role: mapRoleToClaude(msg.role),
        content,
      };
    }

    return {
      role: mapRoleToClaude(msg.role),
      content: [],
    };
  });
}

export function mapRoleToClaude(role: string): string {
  switch (role) {
    case 'system':
      return 'system';
    case 'user':
      return 'user';
    case 'assistant':
      return 'assistant';
    default:
      return 'user';
  }
}

export function getMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}
