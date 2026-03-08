import { describe, expect, it } from "vitest";
import {
  isRecoverableToolArgumentParseError,
  runWithRecoverableRetry,
} from "../../src/app/recoverableRetry.js";

describe("recoverable retry", () => {
  it("retries recoverable parse errors", async () => {
    let calls = 0;

    const result = await runWithRecoverableRetry("do task", {
      maxRetries: 2,
      retryDelayMs: 0,
      run: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("Unterminated string in JSON at position 10");
        }
        return "ok";
      },
      createSnapshot: () => ({ v: 1 }),
      restoreSnapshot: () => undefined,
      resetLoopGuard: () => undefined,
    });

    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("detects recoverable parse errors", () => {
    expect(
      isRecoverableToolArgumentParseError(
        "Unexpected token } in JSON at position 14",
      ),
    ).toBe(true);
    expect(isRecoverableToolArgumentParseError("permission denied")).toBe(
      false,
    );
  });
});
