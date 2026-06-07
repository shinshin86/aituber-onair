import type {
  OpenAICompatibleRewriteModelOptions,
  RewriteModel,
} from '../core/types.js';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export function createOpenAICompatibleRewriteModel(
  options: OpenAICompatibleRewriteModelOptions
): RewriteModel {
  return {
    async generate(input) {
      const fetchImpl = options.fetch ?? globalThis.fetch;

      if (!fetchImpl) {
        throw new Error(
          'Noise LLM rewrite requires fetch. Provide options.llm.fetch in this runtime.'
        );
      }

      const baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(
        /\/+$/,
        ''
      );
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
          ...options.headers,
        },
        body: JSON.stringify({
          model: options.model,
          temperature: options.temperature ?? 0.7,
          messages: [
            {
              role: 'system',
              content: input.system,
            },
            {
              role: 'user',
              content: input.prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Noise LLM rewrite failed with ${response.status}: ${await response.text()}`
        );
      }

      const json = (await response.json()) as ChatCompletionResponse;
      const text = json.choices?.[0]?.message?.content?.trim();

      if (!text) {
        throw new Error('Noise LLM rewrite returned an empty response.');
      }

      return text;
    },
  };
}
