import { describe, expect, it } from "vitest";
import { loadConfigFromEnv } from "../../src/config/loadConfig.js";

describe("loadConfigFromEnv", () => {
  it("loads minimal config", () => {
    process.env.AGENT_PROVIDER = "openai";
    process.env.AGENT_API_KEY = "dummy";
    process.env.AGENT_WORKDIR = ".";

    const config = loadConfigFromEnv(process.cwd());
    expect(config.provider).toBe("openai");
    expect(config.apiKey).toBe("dummy");
  });

  it("defaults GPT-5 endpoint preference to responses", () => {
    process.env.AGENT_PROVIDER = "openai";
    process.env.AGENT_API_KEY = "dummy";
    process.env.AGENT_WORKDIR = ".";
    process.env.AGENT_MODEL = "gpt-5.4";

    const config = loadConfigFromEnv(process.cwd());
    expect(config.gpt5EndpointPreference).toBe("responses");
  });

  it("rejects invalid response length", () => {
    process.env.AGENT_PROVIDER = "openai";
    process.env.AGENT_API_KEY = "dummy";
    process.env.AGENT_WORKDIR = ".";
    process.env.AGENT_RESPONSE_LENGTH = "ultra";

    expect(() => loadConfigFromEnv(process.cwd())).toThrow(
      "Invalid AGENT_RESPONSE_LENGTH",
    );
  });

  it("rejects invalid GPT-5 endpoint preference", () => {
    process.env.AGENT_PROVIDER = "openai";
    process.env.AGENT_API_KEY = "dummy";
    process.env.AGENT_WORKDIR = ".";
    process.env.AGENT_OPENAI_GPT5_ENDPOINT_PREFERENCE = "invalid";

    expect(() => loadConfigFromEnv(process.cwd())).toThrow(
      "AGENT_OPENAI_GPT5_ENDPOINT_PREFERENCE",
    );
  });

  it("requires AGENT_API_KEY", () => {
    process.env.AGENT_PROVIDER = "openai";
    process.env.AGENT_WORKDIR = ".";

    expect(() => loadConfigFromEnv(process.cwd())).toThrow(
      "AGENT_API_KEY is required",
    );
  });

  it("rejects unsupported providers", () => {
    process.env.AGENT_PROVIDER = "claude";
    process.env.AGENT_API_KEY = "dummy";
    process.env.AGENT_WORKDIR = ".";

    expect(() => loadConfigFromEnv(process.cwd())).toThrow("supports only");
  });
});
