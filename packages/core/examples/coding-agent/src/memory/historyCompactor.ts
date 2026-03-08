import type { Message } from "@aituber-onair/core";

interface CompactOptions {
  maxMessages: number;
  keepRecent: number;
  maxSummaryChars: number;
}

export function compactHistory(
  history: Message[],
  options: CompactOptions,
): Message[] {
  if (history.length <= options.maxMessages) {
    return history;
  }

  const recent = history.slice(-options.keepRecent);
  const older = history.slice(0, -options.keepRecent);

  const summary = older
    .map((message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      const trimmed = content.replace(/\s+/g, " ").trim();
      return `${message.role}: ${trimmed}`;
    })
    .join(" | ")
    .slice(0, options.maxSummaryChars);

  const summaryMessage: Message = {
    role: "system",
    content: `Summary of previous context: ${summary}`,
  };

  return [summaryMessage, ...recent];
}
