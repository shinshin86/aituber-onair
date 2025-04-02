import { Message } from '../../../../types';
import { Summarizer } from '../../../../core/MemoryManager';
import {
  ENDPOINT_CLAUDE_API,
  MODEL_CLAUDE_3_HAIKU,
} from '../../../../constants';
import { DEFAULT_SUMMARY_PROMPT_TEMPLATE } from '../../../../constants';

/**
 * Implementation of summarization functionality using Claude
 */
export class ClaudeSummarizer implements Summarizer {
  private apiKey: string;
  private model: string;
  private defaultPromptTemplate: string;

  /**
   * Constructor
   * @param apiKey Anthropic API key
   * @param model Name of the model to use
   * @param defaultPromptTemplate Default prompt template for summarization
   */
  constructor(
    apiKey: string,
    model: string = MODEL_CLAUDE_3_HAIKU,
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

      // API request
      const response = await fetch(ENDPOINT_CLAUDE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: `${systemPrompt}\n\n${conversationText}`,
            },
          ],
          max_tokens: maxLength,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Claude API error: ${errorData.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();
      return data.content?.[0]?.text || '';
    } catch (error) {
      console.error('Error in summarize:', error);
      // Error fallback - simple summary
      return `${messages.length} messages. Latest topic: ${
        messages[messages.length - 1]?.content.substring(0, 50) || 'none'
      }...`;
    }
  }
}
