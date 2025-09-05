import type { ChatService } from '../services/ChatService';
import type { Message } from '../types';
import { StreamTextAccumulator } from './streamTextAccumulator';

/**
 * Run a single non-streaming chat request and return concatenated text.
 * Intended for environments without streaming support (e.g., Google Apps Script).
 */
export async function runOnceText(
  chat: ChatService,
  messages: Message[],
): Promise<string> {
  const { blocks } = await chat.chatOnce(messages, false, () => {});
  return StreamTextAccumulator.getFullText(blocks);
}
