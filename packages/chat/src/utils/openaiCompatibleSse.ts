import { ToolChatBlock, ToolChatCompletion } from '../types';
import { StreamTextAccumulator } from './streamTextAccumulator';

type SseParseOptions = {
  onJsonError?: (payload: string, error: unknown) => void;
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

    const content = json.choices?.[0]?.delta?.content || '';
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
  const appendTextBlock =
    options.appendTextBlock ?? StreamTextAccumulator.append;

  await forEachSsePayload(res, (payload) => {
    const json = parseJsonPayload(payload, options.onJsonError);
    if (!json) return;

    const delta = json.choices?.[0]?.delta;

    if (delta?.content) {
      onPartial(delta.content);
      appendTextBlock(textBlocks, delta.content);
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
      input: JSON.parse(e.args || '{}'),
    }));

  const blocks = [...textBlocks, ...toolBlocks];

  return {
    blocks,
    stop_reason: toolBlocks.length ? 'tool_use' : 'end',
  };
}

export function parseOpenAICompatibleOneShot(data: any): ToolChatCompletion {
  const choice = data?.choices?.[0];
  const blocks: ToolChatBlock[] = [];

  if (choice?.message?.tool_calls?.length) {
    choice.message.tool_calls.forEach((c: any) =>
      blocks.push({
        type: 'tool_use',
        id: c.id,
        name: c.function?.name,
        input: JSON.parse(c.function?.arguments || '{}'),
      }),
    );
  } else if (choice?.message?.content) {
    blocks.push({ type: 'text', text: choice.message.content });
  }

  return {
    blocks,
    stop_reason:
      choice?.finish_reason === 'tool_calls' ||
      blocks.some((b) => b.type === 'tool_use')
        ? 'tool_use'
        : 'end',
  };
}
