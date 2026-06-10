import { ToolChatBlock, ToolChatCompletion } from '../../../types';
import type { JsonParseErrorHandler } from '../../../utils/safeJsonParse';
import { safeParseToolCallInput } from '../../../utils/safeJsonParse';
import { StreamTextAccumulator } from '../../../utils/streamTextAccumulator';

type ResponsesMetadata = {
  responseStatus?: string;
  incompleteDetails?: Record<string, any> | null;
  usage?: Record<string, any>;
};

type ResponsesParseOptions = {
  onJsonError?: JsonParseErrorHandler;
};

/**
 * Parse streaming Responses API output (SSE format).
 */
export async function parseOpenAIResponsesStream(
  res: Response,
  onPartial: (t: string) => void,
  options: ResponsesParseOptions = {},
): Promise<ToolChatCompletion> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();

  const textBlocks: ToolChatBlock[] = [];
  const toolCallsMap = new Map<string, any>();
  let responseStatus: string | undefined;
  let incompleteDetails: Record<string, any> | null | undefined;
  let usage: Record<string, any> | undefined;

  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });

    // Parse SSE format: process event: and data: combinations
    let eventType = '';
    let eventData = '';

    const lines = buf.split('\n');
    buf = lines.pop() || ''; // Keep the last incomplete line

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        eventData = line.slice(5).trim();
      } else if (line === '' && eventType && eventData) {
        try {
          const json = JSON.parse(eventData);
          handleResponsesSSEEvent(
            eventType,
            json,
            onPartial,
            textBlocks,
            toolCallsMap,
            options,
            (metadata) => {
              if (metadata.responseStatus !== undefined) {
                responseStatus = metadata.responseStatus;
              }
              if (metadata.incompleteDetails !== undefined) {
                incompleteDetails = metadata.incompleteDetails;
              }
              if (metadata.usage !== undefined) {
                usage = metadata.usage;
              }
            },
          );
        } catch (error) {
          options.onJsonError?.(eventData, error);
          console.warn('Failed to parse SSE data:', eventData);
        }
        eventType = '';
        eventData = '';
      }
    }
  }

  const toolBlocks: ToolChatBlock[] = Array.from(toolCallsMap.values()).map(
    (tool) => ({
      type: 'tool_use',
      id: tool.id,
      name: tool.name,
      input: tool.input || {},
    }),
  );

  return {
    blocks: [...textBlocks, ...toolBlocks],
    stop_reason: toolBlocks.length ? 'tool_use' : 'end',
    truncated: responseStatus === 'incomplete',
    response_status: responseStatus,
    incomplete_details: incompleteDetails,
    usage,
  };
}

function handleResponsesSSEEvent(
  eventType: string,
  data: any,
  onPartial: (t: string) => void,
  textBlocks: ToolChatBlock[],
  toolCallsMap: Map<string, any>,
  options: ResponsesParseOptions,
  onMetadata: (metadata: ResponsesMetadata) => void,
): void {
  switch (eventType) {
    case 'response.output_item.added':
      if (data.item?.type === 'message' && Array.isArray(data.item.content)) {
        data.item.content.forEach((c: any) => {
          if (c.type === 'output_text' && c.text) {
            onPartial(c.text);
            StreamTextAccumulator.append(textBlocks, c.text);
          }
        });
      } else if (data.item?.type === 'function_call') {
        toolCallsMap.set(data.item.id, {
          id: data.item.id,
          name: data.item.name,
          input: safeParseToolCallInput(
            data.item.arguments,
            options.onJsonError,
          ),
        });
      }
      break;

    case 'response.content_part.added':
      if (
        data.part?.type === 'output_text' &&
        typeof data.part.text === 'string'
      ) {
        onPartial(data.part.text);
        StreamTextAccumulator.append(textBlocks, data.part.text);
      }
      break;

    case 'response.output_text.delta':
    case 'response.content_part.delta': {
      const deltaText =
        typeof data.delta === 'string' ? data.delta : (data.delta?.text ?? '');
      if (deltaText) {
        onPartial(deltaText);
        StreamTextAccumulator.append(textBlocks, deltaText);
      }
      break;
    }

    case 'response.output_text.done':
    case 'response.content_part.done':
    case 'response.reasoning.started':
    case 'response.reasoning.delta':
    case 'response.reasoning.done':
      break;

    case 'response.completed':
      onMetadata(extractResponsesMetadata(data, 'completed'));
      break;

    case 'response.incomplete':
      onMetadata(extractResponsesMetadata(data, 'incomplete'));
      break;

    default:
      break;
  }
}

function extractResponsesMetadata(
  data: any,
  fallbackStatus: 'completed' | 'incomplete',
): {
  responseStatus: string;
  incompleteDetails: Record<string, any> | null;
  usage?: Record<string, any>;
} {
  const response = data?.response ?? data;

  return {
    responseStatus: response?.status ?? fallbackStatus,
    incompleteDetails: response?.incomplete_details ?? null,
    usage: response?.usage,
  };
}

/**
 * Parse non-streaming Responses API output.
 */
export function parseOpenAIResponsesOneShot(
  data: any,
  options: ResponsesParseOptions = {},
): ToolChatCompletion {
  const blocks: ToolChatBlock[] = [];

  if (data.output && Array.isArray(data.output)) {
    data.output.forEach((outputItem: any) => {
      if (outputItem.type === 'message' && outputItem.content) {
        outputItem.content.forEach((content: any) => {
          if (content.type === 'output_text' && content.text) {
            blocks.push({ type: 'text', text: content.text });
          }
        });
      }

      if (outputItem.type === 'function_call') {
        blocks.push({
          type: 'tool_use',
          id: outputItem.id,
          name: outputItem.name,
          input: safeParseToolCallInput(
            outputItem.arguments,
            options.onJsonError,
          ),
        });
      }
    });
  }

  return {
    blocks,
    stop_reason: blocks.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end',
    truncated: data?.status === 'incomplete',
    response_status: data?.status,
    incomplete_details: data?.incomplete_details ?? null,
    usage: data?.usage,
  };
}
