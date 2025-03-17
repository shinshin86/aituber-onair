import { ChatService } from './ChatService';
import { Message, MessageWithVision } from '../../types';
import {
  ENDPOINT_GEMINI_API,
  MODEL_GEMINI_2_0_FLASH_LITE,
  GEMINI_VISION_SUPPORTED_MODELS
} from '../../constants';

/**
 * Gemini implementation of ChatService
 */
export class GeminiChatService implements ChatService {
  private apiKey: string;
  private model: string;
  private visionModel: string;
  /** Provider name */
  readonly provider: string = 'gemini';

  /**
   * Constructor
   * @param apiKey Google API key
   * @param model Name of the model to use
   * @param visionModel Name of the vision model
   */
  constructor(
    apiKey: string,
    model: string = MODEL_GEMINI_2_0_FLASH_LITE,
    visionModel: string = MODEL_GEMINI_2_0_FLASH_LITE,
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
      // Convert messages to Gemini format
      const geminiMessages = this.convertMessagesToGeminiFormat(messages);

      // Create the endpoint URL with API key
      const apiUrl = `${ENDPOINT_GEMINI_API}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;

      // Request to Gemini API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gemini API error: ${errorData.error?.message || response.statusText}`,
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
        try {
          // Parse the chunk as JSON
          const data = JSON.parse(chunk);
          
          // Extract text from Gemini response format
          if (data.candidates && data.candidates.length > 0) {
            const content = data.candidates[0].content;
            if (content && content.parts && content.parts.length > 0) {
              const text = content.parts[0].text || '';
              if (text) {
                fullText += text;
                onPartialResponse(text);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing stream:', e);
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
      if (!GEMINI_VISION_SUPPORTED_MODELS.includes(this.visionModel)) {
        throw new Error(`Model ${this.visionModel} does not support vision capabilities.`);
      }

      // Convert messages to Gemini vision format
      const geminiMessages = this.convertVisionMessagesToGeminiFormat(messages);

      // Create the endpoint URL with API key
      const apiUrl = `${ENDPOINT_GEMINI_API}/models/${this.visionModel}:streamGenerateContent?key=${this.apiKey}`;

      // Request to Gemini API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gemini API error: ${errorData.error?.message || response.statusText}`,
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
        try {
          // Parse the chunk as JSON
          const data = JSON.parse(chunk);
          
          // Extract text from Gemini response format
          if (data.candidates && data.candidates.length > 0) {
            const content = data.candidates[0].content;
            if (content && content.parts && content.parts.length > 0) {
              const text = content.parts[0].text || '';
              if (text) {
                fullText += text;
                onPartialResponse(text);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing stream:', e);
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
   * Convert AITuber OnAir messages to Gemini format
   * @param messages Array of messages
   * @returns Gemini formatted messages
   */
  private convertMessagesToGeminiFormat(messages: Message[]): any[] {
    const geminiMessages = [];
    let currentRole = null;
    let currentParts = [];

    for (const msg of messages) {
      // Map AITuber OnAir roles to Gemini roles
      const role = this.mapRoleToGemini(msg.role);

      // If role changes, start a new message
      if (role !== currentRole && currentParts.length > 0) {
        geminiMessages.push({
          role: currentRole,
          parts: [...currentParts],
        });
        currentParts = [];
      }

      currentRole = role;
      currentParts.push({ text: msg.content });
    }

    // Add the last message
    if (currentRole && currentParts.length > 0) {
      geminiMessages.push({
        role: currentRole,
        parts: [...currentParts],
      });
    }

    return geminiMessages;
  }

  /**
   * Convert AITuber OnAir vision messages to Gemini format
   * @param messages Array of vision messages
   * @returns Gemini formatted vision messages
   */
  private convertVisionMessagesToGeminiFormat(messages: MessageWithVision[]): any[] {
    const geminiMessages = [];
    let currentRole = null;
    let currentParts = [];

    for (const msg of messages) {
      // Map AITuber OnAir roles to Gemini roles
      const role = this.mapRoleToGemini(msg.role);

      // If role changes, start a new message
      if (role !== currentRole && currentParts.length > 0) {
        geminiMessages.push({
          role: currentRole,
          parts: [...currentParts],
        });
        currentParts = [];
      }

      currentRole = role;

      // If the message has content blocks, process them
      if (typeof msg.content === 'string') {
        currentParts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        // Process each content block (text or image)
        for (const block of msg.content) {
          if (block.type === 'text') {
            currentParts.push({ text: block.text });
          } else if (block.type === 'image_url') {
            // Convert image_url to Gemini format
            // Fetch the image data if URL is provided
            currentParts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: block.image_url.url // In real implementation, this would be base64 encoded data
              },
            });
          }
        }
      }
    }

    // Add the last message
    if (currentRole && currentParts.length > 0) {
      geminiMessages.push({
        role: currentRole,
        parts: [...currentParts],
      });
    }

    return geminiMessages;
  }

  /**
   * Map AITuber OnAir roles to Gemini roles
   * @param role AITuber OnAir role
   * @returns Gemini role
   */
  private mapRoleToGemini(role: string): string {
    switch (role) {
      case 'system':
        return 'model'; // Gemini uses 'model' for system messages
      case 'user':
        return 'user';
      case 'assistant':
        return 'model';
      default:
        return 'user';
    }
  }
} 