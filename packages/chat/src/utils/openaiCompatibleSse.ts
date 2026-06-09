import { ToolChatBlock, ToolChatCompletion } from '../types';
import type { JsonParseErrorHandler } from './safeJsonParse';
import { safeParseToolCallInput } from './safeJsonParse';
import { StreamTextAccumulator } from './streamTextAccumulator';

type SseParseOptions = {
  onJsonError?: JsonParseErrorHandler;
  appendTextBlock?: (blocks: ToolChatBlock[], text: string) => void;
};

const parseJsonPayload = (
  payload: string,
  onJsonError?: (payload: string, error: unknown) => void,
): any | undefined => {
  try {
    return JSON.parse(payload);
  } catch (error) {
    if (onJsonError) {
      onJsonError(payload, error);
      return undefined;
    }
    throw error;
  }
};

const extractTextContent = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((chunk) => {
      if (typeof chunk === 'string') {
        return chunk;
      }
      if (
        chunk &&
        typeof chunk === 'object' &&
        (chunk as { type?: unknown }).type === 'text' &&
        typeof (chunk as { text?: unknown }).text === 'string'
      ) {
        return (chunk as { text: string }).text;
      }
      return '';
    })
    .join('');
};

const forEachSsePayload = async (
  res: Response,
  onPayload: (payload: string) => void,
): Promise<void> => {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Response body is null.');
  }

  const dec = new TextDecoder();
  let buf = '';
  let shouldStop = false;

  while (!shouldStop) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith(':')) continue;
      if (!trimmedLine.startsWith('data:')) continue;

      const payload = trimmedLine.slice(5).trim();
      if (payload === '[DONE]') {
        shouldStop = true;
        break;
      }

      onPayload(payload);
    }
  }
};

export async function parseOpenAICompatibleTextStream(
  res: Response,
  onPartial: (text: string) => void,
  options: SseParseOptions = {},
): Promise<string> {
  let full = '';

  await forEachSsePayload(res, (payload) => {
    const json = parseJsonPayload(payload, options.onJsonError);
    if (!json) return;

    const content = extractTextContent(json.choices?.[0]?.delta?.content);
    if (content) {
      onPartial(content);
      full += content;
    }
  });

  return full;
}

export async function parseOpenAICompatibleToolStream(
  res: Response,
  onPartial: (text: string) => void,
  options: SseParseOptions = {},
): Promise<ToolChatCompletion> {
  const textBlocks: ToolChatBlock[] = [];
  const toolCallsMap = new Map<number, any>();
  let finishReason: string | undefined;
  let usage: Record<string, any> | undefined;
  const appendTextBlock =
    options.appendTextBlock ?? StreamTextAccumulator.append;

  await forEachSsePayload(res, (payload) => {
    const json = parseJsonPayload(payload, options.onJsonError);
    if (!json) return;

    const choice = json.choices?.[0];
    if (typeof choice?.finish_reason === 'string') {
      finishReason = choice.finish_reason;
    }
    if (json.usage) {
      usage = json.usage;
    }

    const delta = choice?.delta;

    const content = extractTextContent(delta?.content);
    if (content) {
      onPartial(content);
      appendTextBlock(textBlocks, content);
    }

    if (delta?.tool_calls) {
      delta.tool_calls.forEach((c: any) => {
        const entry = toolCallsMap.get(c.index) ?? {
          id: c.id,
          name: c.function?.name,
          args: '',
        };
        entry.args += c.function?.arguments || '';
        toolCallsMap.set(c.index, entry);
      });
    }
  });

  const toolBlocks: ToolChatBlock[] = Array.from(toolCallsMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([_, e]) => ({
      type: 'tool_use',
      id: e.id,
      name: e.name,
      input: safeParseToolCallInput(e.args, options.onJsonError),
    }));

  const blocks = [...textBlocks, ...toolBlocks];

  return {
    blocks,
    stop_reason: toolBlocks.length ? 'tool_use' : 'end',
    truncated: finishReason === 'length',
    finish_reason: finishReason,
    usage,
  };
}

export function parseOpenAICompatibleOneShot(
  data: any,
  options: SseParseOptions = {},
): ToolChatCompletion {
  const choice = data?.choices?.[0];
  const blocks: ToolChatBlock[] = [];

  if (choice?.message?.tool_calls?.length) {
    choice.message.tool_calls.forEach((c: any) =>
      blocks.push({
        type: 'tool_use',
        id: c.id,
        name: c.function?.name,
        input: safeParseToolCallInput(
          c.function?.arguments,
          options.onJsonError,
        ),
      }),
    );
  } else {
    const content = extractTextContent(choice?.message?.content);
    if (content) {
      blocks.push({ type: 'text', text: content });
    }
  }

  return {
    blocks,
    stop_reason:
      choice?.finish_reason === 'tool_calls' ||
      blocks.some((b) => b.type === 'tool_use')
        ? 'tool_use'
        : 'end',
    truncated: choice?.finish_reason === 'length',
    finish_reason: choice?.finish_reason,
    usage: data?.usage,
  };
}
