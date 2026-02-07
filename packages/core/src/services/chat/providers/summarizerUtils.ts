import { Message } from '@aituber-onair/chat';

type SummaryContext = {
  systemPrompt: string;
  conversationText: string;
};

export const createSummaryContext = (
  messages: Message[],
  maxLength: number,
  defaultPromptTemplate: string,
  customPrompt?: string,
): SummaryContext => {
  const promptTemplate = customPrompt || defaultPromptTemplate;
  const systemPrompt = promptTemplate.replace(
    '{maxLength}',
    maxLength.toString(),
  );
  const conversationText = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  return { systemPrompt, conversationText };
};

export const summarizeWithFallback = async (
  messages: Message[],
  summarize: () => Promise<string>,
): Promise<string> => {
  try {
    return await summarize();
  } catch (error) {
    console.error('Error in summarize:', error);
    return buildSummaryFallback(messages);
  }
};

const buildSummaryFallback = (messages: Message[]): string => {
  return `${messages.length} messages. Latest topic: ${
    messages[messages.length - 1]?.content.substring(0, 50) || 'none'
  }...`;
};
