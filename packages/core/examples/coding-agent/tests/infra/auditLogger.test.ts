import { afterEach, describe, expect, it, vi } from "vitest";
import { AuditLogger } from "../../src/infra/logging/AuditLogger.js";

describe("AuditLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs only metadata for tool.use without payload details", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new AuditLogger();

    logger.emit("tool.use", {
      name: "write_file",
      input: {
        path: "secret.txt",
        content: "TOP_SECRET_VALUE",
      },
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain("[TOOL_USE] write_file input_bytes=");
    expect(message).not.toContain("TOP_SECRET_VALUE");
    expect(message).not.toContain("secret.txt");
    expect(message).not.toContain("content");
  });

  it("logs only metadata for tool.result without payload details", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new AuditLogger();

    logger.emit("tool.result", {
      toolUseId: "tool-123",
      output: {
        token: "super-secret-token",
        result: "done",
      },
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain("[TOOL_RESULT] tool-123 output_bytes=");
    expect(message).not.toContain("super-secret-token");
    expect(message).not.toContain("result");
  });

  it("logs retry count only for loop.retry", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = new AuditLogger();

    logger.emit("loop.retry", {
      retryCount: 2,
      reason: "parse error: leaked-secret",
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = warnSpy.mock.calls[0][0] as string;
    expect(message).toBe("[RECOVERY] retry=2");
    expect(message).not.toContain("reason");
    expect(message).not.toContain("leaked-secret");
  });

  it("logs metadata-only audit line for non-tool events", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = new AuditLogger();

    logger.emit("turn.start", {
      input: "please use token=abc123",
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain("[AUDIT] type=turn.start ts=");
    expect(message).toContain("fields=");
    expect(message).toContain("data_bytes=");
    expect(message).not.toContain("abc123");
    expect(message).not.toContain("input");
  });
});
