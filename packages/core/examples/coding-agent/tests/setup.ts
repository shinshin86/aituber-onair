import { afterEach } from "vitest";

afterEach(() => {
  process.env.AGENT_WORKDIR = "";
  process.env.AGENT_PROVIDER = "";
  process.env.AGENT_API_KEY = "";
  process.env.AGENT_MODEL = "";
  process.env.AGENT_RESPONSE_LENGTH = "";
  process.env.AGENT_OPENAI_ENDPOINT = "";
  process.env.AGENT_OPENAI_GPT5_ENDPOINT_PREFERENCE = "";
  process.env.AGENT_MAX_HOPS = "";
  process.env.AGENT_ASSISTANT_TIMEOUT_MS = "";
  process.env.AGENT_MAX_IDENTICAL_TOOL_CALLS = "";
  process.env.AGENT_MAX_CONSECUTIVE_TOOL_FAILURES = "";
  process.env.AGENT_HISTORY_MAX_MESSAGES = "";
  process.env.AGENT_HISTORY_KEEP_RECENT = "";
  process.env.AGENT_HISTORY_MAX_SUMMARY = "";
  process.env.AGENT_RECOVERABLE_RETRIES = "";
  process.env.AGENT_RECOVERY_RETRY_BACKOFF_MS = "";
});
