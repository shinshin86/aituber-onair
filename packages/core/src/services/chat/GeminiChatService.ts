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

      // get full response
      let responseText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        responseText += chunk;
      }

      // parse response
      try {
        const responseArray = JSON.parse(responseText);
        
        // process each response
        for (const item of responseArray) {
          if (item.candidates && item.candidates.length > 0) {
            const content = item.candidates[0].content;
            if (content && content.parts && content.parts.length > 0) {
              const text = content.parts[0].text || '';
              if (text) {
                fullText += text;
                onPartialResponse(text);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Error parsing Gemini response:', err);
        throw new Error(`Failed to parse Gemini response: ${err.message}`);
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
      const geminiMessages = await this.convertVisionMessagesToGeminiFormat(messages);

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

      // get full response 
      let responseText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        responseText += chunk;
      }

      // parse response
      try {
        const responseArray = JSON.parse(responseText);
        
        // process each response
        for (const item of responseArray) {
          if (item.candidates && item.candidates.length > 0) {
            const content = item.candidates[0].content;
            if (content && content.parts && content.parts.length > 0) {
              const text = content.parts[0].text || '';
              if (text) {
                fullText += text;
                onPartialResponse(text);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Error parsing Gemini response:', err);
        throw new Error(`Failed to parse Gemini response: ${err.message}`);
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
  private async convertVisionMessagesToGeminiFormat(messages: MessageWithVision[]): Promise<any[]> {
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
            try {
              // Fetch the image data from URL
              const imageResponse = await fetch(block.image_url.url);
              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
              }
              
              // Convert image to blob and then to base64
              const imageBlob = await imageResponse.blob();
              const base64Data = await this.blobToBase64(imageBlob);
              
              // Add image data in Gemini format
              currentParts.push({
                inlineData: {
                  mimeType: imageBlob.type || 'image/jpeg',
                  data: base64Data.split(',')[1] // Remove the "data:image/jpeg;base64," prefix
                },
              });
            } catch (error: any) {
              console.error('Error processing image:', error);
              throw new Error(`Failed to process image: ${error.message}`);
            }
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
   * Convert Blob to Base64 string
   * @param blob Image blob
   * @returns Promise with base64 encoded string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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