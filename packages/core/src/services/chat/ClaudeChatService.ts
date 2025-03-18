import { ChatService } from './ChatService';
import { Message, MessageWithVision } from '../../types';
import {
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_3_HAIKU,
  CLAUDE_VISION_SUPPORTED_MODELS
} from '../../constants';

/**
 * Claude implementation of ChatService
 */
export class ClaudeChatService implements ChatService {
  private apiKey: string;
  private model: string;
  private visionModel: string;
  /** Provider name */
  readonly provider: string = 'claude';

  /**
   * Constructor
   * @param apiKey Anthropic API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   */
  constructor(
    apiKey: string,
    model: string = MODEL_CLAUDE_3_HAIKU,
    visionModel: string = MODEL_CLAUDE_3_HAIKU,
  ) {
    this.apiKey = apiKey;
    this.model = model || MODEL_CLAUDE_3_HAIKU;
    this.visionModel = visionModel || MODEL_CLAUDE_3_HAIKU;
  }

  /**
   * Get the current model name
   * @returns Model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Process chat messages
   * @param messages Array of messages to send
   * @param onPartialResponse Callback to receive each part of streaming response
   * @param onCompleteResponse Callback to execute when response is complete
   */
  async processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    try {
      // Extract system message (if any) and regular messages
      const systemMessage = messages.find(msg => msg.role === 'system');
      const nonSystemMessages = messages.filter(msg => msg.role !== 'system');

      // Convert messages to Claude format
      const claudeMessages = this.convertMessagesToClaudeFormat(nonSystemMessages);

      // Request to Claude API
      const response = await fetch(ENDPOINT_CLAUDE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.model,
          messages: claudeMessages,
          system: systemMessage?.content || '',
          stream: true,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Claude API error: ${errorData.error?.message || response.statusText}`,
        );
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Claude API serves responses as Server-Sent Events (SSE)
        // Each event is prefixed with "event: " and "data: "
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            // Check if this is a data line
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remove 'data: ' prefix
              
              // Ignore [DONE] marker
              if (data === '[DONE]') continue;
              
              const json = JSON.parse(data);
              
              // Extract delta content if available
              if (json.type === 'content_block_delta') {
                const deltaText = json.delta?.text || '';
                if (deltaText) {
                  fullText += deltaText;
                  onPartialResponse(deltaText);
                }
              }
              // Extract full message content if this is a message_start event
              else if (json.type === 'message_start') {
                // Initial message metadata, no text yet
              }
              // Extract content blocks from message
              else if (json.type === 'content_block_start') {
                // Content block metadata, no text yet
              }
              // Message completion
              else if (json.type === 'message_stop') {
                // Message is complete
              }
            }
          } catch (e) {
            console.error('Error parsing Claude stream:', e);
          }
        }
      }

      // Complete response callback
      await onCompleteResponse(fullText);
    } catch (error) {
      console.error('Error in processChat:', error);
      throw error;
    }
  }

  /**
   * Process chat messages with images
   * @param messages Array of messages to send (including images)
   * @param onPartialResponse Callback to receive each part of streaming response
   * @param onCompleteResponse Callback to execute when response is complete
   * @throws Error if the selected model doesn't support vision
   */
  async processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    try {
      // Check if the vision model supports vision capabilities
      if (!CLAUDE_VISION_SUPPORTED_MODELS.includes(this.visionModel)) {
        throw new Error(`Model ${this.visionModel} does not support vision capabilities.`);
      }

      // Extract system message (if any) and regular messages
      const systemMessage = messages.find(msg => msg.role === 'system');
      const nonSystemMessages = messages.filter(msg => msg.role !== 'system');

      // Convert messages to Claude vision format
      const claudeMessages = this.convertVisionMessagesToClaudeFormat(nonSystemMessages);

      // Request to Claude API
      const response = await fetch(ENDPOINT_CLAUDE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.visionModel,
          messages: claudeMessages,
          system: systemMessage?.content || '',
          stream: true,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Claude API error: ${errorData.error?.message || response.statusText}`,
        );
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Claude API serves responses as Server-Sent Events (SSE)
        // Each event is prefixed with "event: " and "data: "
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            // Check if this is a data line
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remove 'data: ' prefix
              
              // Ignore [DONE] marker
              if (data === '[DONE]') continue;
              
              const json = JSON.parse(data);
              
              // Extract delta content if available
              if (json.type === 'content_block_delta') {
                const deltaText = json.delta?.text || '';
                if (deltaText) {
                  fullText += deltaText;
                  onPartialResponse(deltaText);
                }
              }
              // Other event types (handled same as in processChat)
            }
          } catch (e) {
            console.error('Error parsing Claude stream:', e);
          }
        }
      }

      // Complete response callback
      await onCompleteResponse(fullText);
    } catch (error) {
      console.error('Error in processVisionChat:', error);
      throw error;
    }
  }

  /**
   * Convert AITuber OnAir messages to Claude format
   * @param messages Array of messages
   * @returns Claude formatted messages
   */
  private convertMessagesToClaudeFormat(messages: Message[]): any[] {
    return messages.map(msg => {
      return {
        role: this.mapRoleToClaude(msg.role),
        content: msg.content,
      };
    });
  }

  /**
   * Convert AITuber OnAir vision messages to Claude format
   * @param messages Array of vision messages
   * @returns Claude formatted vision messages
   */
  private convertVisionMessagesToClaudeFormat(messages: MessageWithVision[]): any[] {
    return messages.map(msg => {
      // If message content is a string, create a text-only message
      if (typeof msg.content === 'string') {
        return {
          role: this.mapRoleToClaude(msg.role),
          content: [
            {
              type: 'text',
              text: msg.content,
            },
          ],
        };
      } 
      // If message content is an array of blocks, convert each block
      else if (Array.isArray(msg.content)) {
        const content = msg.content.map(block => {
          if (block.type === 'text') {
            return {
              type: 'text',
              text: block.text,
            };
          } else if (block.type === 'image_url') {
            // データURLかどうかをチェック
            if (block.image_url.url.startsWith('data:')) {
              // Data URLからBase64部分を抽出
              const matches = block.image_url.url.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
              if (matches && matches.length >= 3) {
                const mediaType = matches[1];
                const base64Data = matches[2];
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Data
                  }
                };
              }
            }
            
            // 通常のURLの場合
            return {
              type: 'image',
              source: {
                type: 'url',
                url: block.image_url.url,
                media_type: this.getMimeTypeFromUrl(block.image_url.url),
              },
            };
          }
          return null;
        }).filter(item => item !== null);

        return {
          role: this.mapRoleToClaude(msg.role),
          content,
        };
      }

      return {
        role: this.mapRoleToClaude(msg.role),
        content: [],
      };
    });
  }

  /**
   * Map AITuber OnAir roles to Claude roles
   * @param role AITuber OnAir role
   * @returns Claude role
   */
  private mapRoleToClaude(role: string): string {
    switch (role) {
      case 'system':
        // Claude handles system messages separately, but we'll map it anyway
        return 'system';
      case 'user':
        return 'user';
      case 'assistant':
        return 'assistant';
      default:
        return 'user';
    }
  }

  /**
   * Get MIME type from URL
   * @param url Image URL
   * @returns MIME type
   */
  private getMimeTypeFromUrl(url: string): string {
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
} 