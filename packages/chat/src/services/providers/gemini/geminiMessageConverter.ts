import { Message, MessageWithVision } from '../../../types';
import { ChatServiceHttpClient } from '../../../utils/chatServiceHttpClient';

type GeminiMessage = {
  role: string | null;
  parts: any[];
};

type ConverterOptions = {
  callIdMap?: Map<string, string>;
};

type VisionConverterOptions = ConverterOptions & {
  imageFetcher?: (url: string) => Promise<Response>;
  blobToBase64?: (blob: Blob) => Promise<string>;
};

export function mapRoleToGemini(role: string): string {
  switch (role) {
    case 'system':
      return 'model';
    case 'user':
      return 'user';
    case 'assistant':
      return 'model';
    default:
      return 'user';
  }
}

export function convertMessagesToGeminiFormat(
  messages: Message[],
  options: ConverterOptions = {},
): GeminiMessage[] {
  const gemini: GeminiMessage[] = [];
  let currentRole: string | null = null;
  let currentParts: any[] = [];

  const pushCurrent = () => {
    if (currentRole && currentParts.length) {
      gemini.push({ role: currentRole, parts: [...currentParts] });
      currentParts = [];
    }
  };

  for (const msg of messages) {
    const role = mapRoleToGemini(msg.role);

    if ((msg as any).tool_calls) {
      pushCurrent();
      for (const call of (msg as any).tool_calls) {
        options.callIdMap?.set(call.id, call.function.name);
        gemini.push({
          role: 'model',
          parts: [
            {
              functionCall: {
                name: call.function.name,
                args: JSON.parse(call.function.arguments || '{}'),
              },
            },
          ],
        });
      }
      continue;
    }

    if (msg.role === 'tool') {
      pushCurrent();
      const funcName =
        (msg as any).name ??
        options.callIdMap?.get((msg as any).tool_call_id) ??
        'result';
      gemini.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: funcName,
              response: normalizeToolResult(safeJsonParse(msg.content)),
            },
          },
        ],
      });
      continue;
    }

    if (role !== currentRole) pushCurrent();
    currentRole = role;
    currentParts.push({ text: msg.content });
  }

  pushCurrent();
  return gemini;
}

export async function convertVisionMessagesToGeminiFormat(
  messages: MessageWithVision[],
  options: VisionConverterOptions = {},
): Promise<GeminiMessage[]> {
  const imageFetcher = options.imageFetcher ?? ChatServiceHttpClient.get;
  const encodeBlob = options.blobToBase64 ?? blobToBase64;
  const geminiMessages: GeminiMessage[] = [];
  let currentRole: string | null = null;
  let currentParts: any[] = [];

  for (const msg of messages) {
    const role = mapRoleToGemini(msg.role);

    if ((msg as any).tool_calls) {
      for (const call of (msg as any).tool_calls) {
        geminiMessages.push({
          role: 'model',
          parts: [
            {
              functionCall: {
                name: call.function.name,
                args: JSON.parse(call.function.arguments || '{}'),
              },
            },
          ],
        });
      }
      continue;
    }

    if (msg.role === 'tool') {
      const funcName =
        (msg as any).name ??
        options.callIdMap?.get((msg as any).tool_call_id) ??
        'result';
      geminiMessages.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: funcName,
              response: normalizeToolResult(
                safeJsonParse(msg.content as string),
              ),
            },
          },
        ],
      });
      continue;
    }

    if (role !== currentRole && currentParts.length > 0) {
      geminiMessages.push({
        role: currentRole,
        parts: [...currentParts],
      });
      currentParts = [];
    }

    currentRole = role;

    if (typeof msg.content === 'string') {
      currentParts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text') {
          currentParts.push({ text: block.text });
        } else if (block.type === 'image_url') {
          try {
            const imageResponse = await imageFetcher(block.image_url.url);
            const imageBlob = await imageResponse.blob();
            const base64Data = await encodeBlob(imageBlob);

            currentParts.push({
              inlineData: {
                mimeType: imageBlob.type || 'image/jpeg',
                data: base64Data.split(',')[1],
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

  if (currentRole && currentParts.length > 0) {
    geminiMessages.push({
      role: currentRole,
      parts: [...currentParts],
    });
  }

  return geminiMessages;
}

function safeJsonParse(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function normalizeToolResult(val: any) {
  if (val === null) return { content: null };
  if (typeof val === 'object') return val;
  return { content: val };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
