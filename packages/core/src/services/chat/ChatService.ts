import { Message, MessageWithVision } from '../../types';
import { ToolChatCompletion } from '../../types/toolChat';

/**
 * Chat service interface
 * Abstracts interaction with AI models
 */
export interface ChatService {
  /**
   * Get the model name
   * @returns Model name
   */
  getModel(): string;

  /**
   * Get the vision model name
   * @returns Vision model name
   */
  getVisionModel(): string;

  /**
   * Process chat messages
   * @param messages Array of messages to send
   * @param onPartialResponse Callback to receive each part of streaming response
   * @param onCompleteResponse Callback to execute when response is complete
   */
  processChat(
    messages: Message[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void>;

  /**
   * Process chat messages with images
   * @param messages Array of messages to send (including images)
   * @param onPartialResponse Callback to receive each part of streaming response
   * @param onCompleteResponse Callback to execute when response is complete
   */
  processVisionChat(
    messages: MessageWithVision[],
    onPartialResponse: (text: string) => void,
    onCompleteResponse: (text: string) => Promise<void>,
  ): Promise<void>;

  /**
   * Process chat messages with tools
   * @param messages Array of messages to send
   * @param stream Whether to use streaming
   * @param onPartialResponse Callback for partial responses
   * @param maxTokens Maximum tokens for response (optional)
   * @returns Tool chat completion
   */
  chatOnce(
    messages: Message[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number,
  ): Promise<ToolChatCompletion>;

  /**
   * Process chat messages with tools and images
   * @param messages Array of messages to send (including images)
   * @param stream Whether to use streaming
   * @param onPartialResponse Callback for partial responses
   * @param maxTokens Maximum tokens for response (optional)
   * @returns Tool chat completion
   */
  visionChatOnce(
    messages: MessageWithVision[],
    stream: boolean,
    onPartialResponse: (text: string) => void,
    maxTokens?: number,
  ): Promise<ToolChatCompletion>;
}
