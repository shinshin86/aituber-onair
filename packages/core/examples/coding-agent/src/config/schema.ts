import type { ChatResponseLength } from "@aituber-onair/core";

export const RESPONSE_LENGTHS = [
  "veryShort",
  "short",
  "medium",
  "long",
  "veryLong",
  "deep",
] as const;

export type Gpt5EndpointPreference = "chat" | "responses" | "auto";

export interface AgentConfig {
  provider: "openai";
  workdir: string;
  apiKey: string;
  model?: string;
  responseLength: ChatResponseLength;
  maxHops: number;
  assistantTimeoutMs: number;
  maxIdenticalToolCalls: number;
  maxConsecutiveToolFailures: number;
  historyMaxMessages: number;
  historyKeepRecent: number;
  historyMaxSummaryChars: number;
  recoverableRetries: number;
  recoveryRetryBackoffMs: number;
  openaiEndpoint?: string;
  gpt5EndpointPreference?: Gpt5EndpointPreference;
}
