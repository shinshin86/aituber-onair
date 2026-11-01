import type { Message, MessageWithVision } from '../types';

/** Keep Sarashina's encrypted state out of other providers' message payloads. */
export function stripSarashinaReasoning(
  messages: (Message | MessageWithVision)[],
): (Message | MessageWithVision)[] {
  return messages.map(({ reasoning: _reasoning, ...message }) => message);
}
