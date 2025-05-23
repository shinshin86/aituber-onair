import { Message } from '../../../../types';
import { Summarizer } from '../../../../core/MemoryManager';
import {
  ENDPOINT_GEMINI_API,
  MODEL_GEMINI_2_0_FLASH_LITE,
} from '../../../../constants';
import { DEFAULT_SUMMARY_PROMPT_TEMPLATE } from '../../../../constants';

/**
 * Implementation of summarization functionality using Gemini
 */
export class GeminiSummarizer implements Summarizer {
  private apiKey: string;
  private model: string;
  private defaultPromptTemplate: string;

  /**
   * Constructor
   * @param apiKey Google API key
   * @param model Name of the model to use
   * @param defaultPromptTemplate Default prompt template for summarization
   */
  constructor(
    apiKey: string,
    model: string = MODEL_GEMINI_2_0_FLASH_LITE,
    defaultPromptTemplate: string = DEFAULT_SUMMARY_PROMPT_TEMPLATE,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.defaultPromptTemplate = defaultPromptTemplate;
  }

  /**
   * Summarize chat messages
   * @param messages Array of messages to summarize
   * @param maxLength Maximum number of characters (default 256)
   * @param customPrompt Custom prompt template for summarization (optional)
   * @returns Summarized text
   */
  async summarize(
    messages: Message[],
    maxLength: number = 256,
    customPrompt?: string,
  ): Promise<string> {
    try {
      // Create system prompt
      const promptTemplate = customPrompt || this.defaultPromptTemplate;
      const systemPrompt = promptTemplate.replace(
        '{maxLength}',
        maxLength.toString(),
      );

      // Join message content
      const conversationText = messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Create the endpoint URL with API key
      const apiUrl = `${ENDPOINT_GEMINI_API}/models/${this.model}:generateContent?key=${this.apiKey}`;

      // API request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: systemPrompt,
                },
                {
                  text: conversationText,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: maxLength,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gemini API error: ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();

      // Extract response text from Gemini's response format
      if (
        data.candidates &&
        data.candidates.length > 0 &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0
      ) {
        return data.candidates[0].content.parts[0].text || '';
      }

      return '';
    } catch (error) {
      console.error('Error in summarize:', error);
      // Error fallback - simple summary
      return `${messages.length} messages. Latest topic: ${
        messages[messages.length - 1]?.content.substring(0, 50) || 'none'
      }...`;
    }
  }
}
