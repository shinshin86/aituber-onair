import { ChatService } from './ChatService';
import { Message, MessageWithVision } from '../../types';
import { ENDPOINT_OPENAI_CHAT_COMPLETIONS_API, MODEL_GPT_4O_MINI } from '../../constants';

/**
 * OpenAI implementation of ChatService
 */
export class OpenAIChatService implements ChatService {
  private apiKey: string;
  private model: string;
  private visionModel: string;
  /** Provider name */
  readonly provider: string = 'openai';

  /**
   * Constructor
   * @param apiKey OpenAI API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   */
  constructor(
    apiKey: string,
    model: string = MODEL_GPT_4O_MINI,
    visionModel: string = MODEL_GPT_4O_MINI,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.visionModel = visionModel;
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
      // Convert messages to API request format
      const apiMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Request to OpenAI API
      const response = await fetch(ENDPOINT_OPENAI_CHAT_COMPLETIONS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: apiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${errorData.error?.message || response.statusText}`,
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
        const lines = chunk
          .split('\n')
          .filter(
            (line) => line.trim() !== '' && line.trim() !== 'data: [DONE]',
          );

        for (const line of lines) {
          try {
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6); // Remove 'data: ' prefix
            if (jsonStr === '[DONE]') continue;

            const json = JSON.parse(jsonStr);
            const content = json.choices[0]?.delta?.content || '';

            if (content) {
              fullText += content;
              onPartialResponse(content);
            }
          } catch (e) {
            console.error('Error parsing stream:', e);
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
   */
  async processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void> {
    try {
      const response = await fetch(ENDPOINT_OPENAI_CHAT_COMPLETIONS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.visionModel,
          messages: messages,
          max_tokens: 1000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${errorData.error?.message || response.statusText}`,
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
        const lines = chunk
          .split('\n')
          .filter(
            (line) => line.trim() !== '' && line.trim() !== 'data: [DONE]',
          );

        for (const line of lines) {
          try {
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6); // Remove 'data: ' prefix
            if (jsonStr === '[DONE]') continue;

            const json = JSON.parse(jsonStr);
            const content = json.choices[0]?.delta?.content || '';

            if (content) {
              fullText += content;
              onPartialResponse(content);
            }
          } catch (e) {
            console.error('Error parsing stream:', e);
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
}
