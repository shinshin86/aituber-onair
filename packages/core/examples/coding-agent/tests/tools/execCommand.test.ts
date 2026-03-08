import { describe, expect, it } from "vitest";
import { CommandPolicy } from "../../src/domain/policy/commandPolicy.js";
import { SafeProcessRunner } from "../../src/infra/process/SafeProcessRunner.js";
import { createExecCommandCommand } from "../../src/tools/commands/execCommandCommand.js";
import { withTempWorkspace } from "../helpers/tempWorkspace.js";

describe("exec_command", () => {
  it("runs allowed commands", async () => {
    await withTempWorkspace(async (workspace) => {
      const runner = new SafeProcessRunner(workspace, new CommandPolicy());
      const command = createExecCommandCommand(runner);
      const result = await command.execute({
        command: "node",
        args: ["--version"],
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim().startsWith("v")).toBe(true);
    });
  });

  it("rejects non-allowlisted commands", async () => {
    await withTempWorkspace(async (workspace) => {
      const runner = new SafeProcessRunner(workspace, new CommandPolicy());
      const command = createExecCommandCommand(runner);
      await expect(
        command.execute({
          command: "chmod",
          args: ["+x", "a.sh"],
        }),
      ).rejects.toThrow("not allowed");
    });
  });
});
