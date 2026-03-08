import { describe, expect, it } from "vitest";
import { CommandPolicy } from "../../src/domain/policy/commandPolicy.js";
import { SafeProcessRunner } from "../../src/infra/process/SafeProcessRunner.js";
import { withTempWorkspace } from "../helpers/tempWorkspace.js";

describe("SafeProcessRunner safety", () => {
  it("times out long-running command", async () => {
    await withTempWorkspace(async (workspace) => {
      const runner = new SafeProcessRunner(workspace, new CommandPolicy());
      const result = await runner.run({
        command: "node",
        args: ["-e", "setTimeout(() => console.log('late'), 2000)"],
        timeoutMs: 20,
      });

      expect(result.exitCode).toBe(-1);
      expect(result.stderr).toContain("timed out");
    });
  });

  it("truncates oversized command output", async () => {
    await withTempWorkspace(async (workspace) => {
      const runner = new SafeProcessRunner(workspace, new CommandPolicy());
      const result = await runner.run({
        command: "node",
        args: ["-e", "process.stdout.write('x'.repeat(300000))"],
      });

      expect(result.truncated).toBe(true);
      expect(result.stderr).toContain("Output truncated");
    });
  });

  it("blocks forbidden trampoline args", async () => {
    await withTempWorkspace(async (workspace) => {
      const runner = new SafeProcessRunner(workspace, new CommandPolicy());
      await expect(
        runner.run({
          command: "node",
          args: ["--command", "console.log('x')"],
        }),
      ).rejects.toThrow("forbidden patterns");
    });
  });
});
