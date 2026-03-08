import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import type { ChatResponseLength } from "@aituber-onair/core";
import { AgentError } from "../domain/errors.js";
import { type AgentConfig, RESPONSE_LENGTHS } from "./schema.js";

loadEnv();

function parseNumber(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function parseResponseLength(raw: string | undefined): ChatResponseLength {
  const value = raw?.trim() || "medium";
  if ((RESPONSE_LENGTHS as readonly string[]).includes(value)) {
    return value as ChatResponseLength;
  }
  throw new AgentError("E_CONFIG", `Invalid AGENT_RESPONSE_LENGTH: ${value}`);
}

function parseProvider(raw: string | undefined): "openai" {
  const value = raw?.trim() || "openai";
  if (value !== "openai") {
    throw new AgentError(
      "E_CONFIG",
      "This example supports only AGENT_PROVIDER=openai.",
    );
  }
  return "openai";
}

function parseGpt5Preference(
  raw: string | undefined,
  model: string | undefined,
): "chat" | "responses" | "auto" | undefined {
  const value = raw?.trim();
  if (!value) {
    return model?.startsWith("gpt-5") ? "responses" : undefined;
  }

  if (value === "chat" || value === "responses" || value === "auto") {
    return value;
  }

  throw new AgentError(
    "E_CONFIG",
    "AGENT_OPENAI_GPT5_ENDPOINT_PREFERENCE must be chat, responses, or auto.",
  );
}

export function loadConfigFromEnv(cwd: string): AgentConfig {
  const provider = parseProvider(process.env.AGENT_PROVIDER);
  const model = process.env.AGENT_MODEL?.trim() || undefined;
  const apiKey = process.env.AGENT_API_KEY?.trim() || "";

  if (!apiKey) {
    throw new AgentError("E_CONFIG", "AGENT_API_KEY is required.");
  }

  const workdirEnv = process.env.AGENT_WORKDIR?.trim() || ".";
  return {
    provider,
    workdir: resolve(cwd, workdirEnv),
    apiKey,
    model,
    responseLength: parseResponseLength(process.env.AGENT_RESPONSE_LENGTH),
    maxHops: Math.max(1, parseNumber(process.env.AGENT_MAX_HOPS, 10)),
    assistantTimeoutMs: Math.max(
      1_000,
      parseNumber(process.env.AGENT_ASSISTANT_TIMEOUT_MS, 120_000),
    ),
    maxIdenticalToolCalls: Math.max(
      1,
      parseNumber(process.env.AGENT_MAX_IDENTICAL_TOOL_CALLS, 2),
    ),
    maxConsecutiveToolFailures: Math.max(
      1,
      parseNumber(process.env.AGENT_MAX_CONSECUTIVE_TOOL_FAILURES, 3),
    ),
    historyMaxMessages: Math.max(
      8,
      parseNumber(process.env.AGENT_HISTORY_MAX_MESSAGES, 24),
    ),
    historyKeepRecent: Math.max(
      2,
      parseNumber(process.env.AGENT_HISTORY_KEEP_RECENT, 8),
    ),
    historyMaxSummaryChars: Math.max(
      200,
      parseNumber(process.env.AGENT_HISTORY_MAX_SUMMARY, 1200),
    ),
    recoverableRetries: Math.max(
      0,
      parseNumber(process.env.AGENT_RECOVERABLE_RETRIES, 2),
    ),
    recoveryRetryBackoffMs: Math.max(
      0,
      parseNumber(process.env.AGENT_RECOVERY_RETRY_BACKOFF_MS, 200),
    ),
    openaiEndpoint: process.env.AGENT_OPENAI_ENDPOINT?.trim() || undefined,
    gpt5EndpointPreference: parseGpt5Preference(
      process.env.AGENT_OPENAI_GPT5_ENDPOINT_PREFERENCE,
      model,
    ),
  };
}
