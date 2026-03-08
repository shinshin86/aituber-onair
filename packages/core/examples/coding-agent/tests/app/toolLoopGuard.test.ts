import { describe, expect, it } from "vitest";
import { ToolLoopGuard } from "../../src/app/ToolLoopGuard.js";

describe("ToolLoopGuard", () => {
  it("stops repeated identical calls", () => {
    const guard = new ToolLoopGuard(2, 3);

    guard.beforeCall("read_file", { path: "a.txt" });
    guard.afterCall("read_file", { content: "ok" }, false);
    guard.beforeCall("read_file", { path: "a.txt" });
    guard.afterCall("read_file", { content: "ok" }, false);

    expect(() => guard.beforeCall("read_file", { path: "a.txt" })).toThrow(
      "Repeated identical",
    );
  });

  it("stops after too many failures", () => {
    const guard = new ToolLoopGuard(5, 2);

    guard.beforeCall("exec_command", { command: "node", args: ["-v"] });
    guard.afterCall(
      "exec_command",
      { exitCode: 126, stderr: "failed", truncated: false },
      true,
    );
    guard.beforeCall("exec_command", { command: "node", args: ["-v"] });
    guard.afterCall(
      "exec_command",
      { exitCode: 126, stderr: "failed", truncated: false },
      true,
    );

    expect(() =>
      guard.beforeCall("exec_command", { command: "node", args: ["-v"] }),
    ).toThrow("Too many consecutive");
  });

  it("returns soft error for repeated empty list_files", () => {
    const guard = new ToolLoopGuard(10, 3, 2);

    guard.beforeCall("list_files", {});
    guard.afterCall("list_files", { files: [] }, false);
    guard.beforeCall("list_files", { glob: "*" });
    guard.afterCall("list_files", { files: [] }, false);

    expect(() => {
      guard.beforeCall("list_files", { glob: "**/*" });
      guard.afterCall("list_files", { files: [] }, false);
    }).toThrow("Stalled on empty list_files");
  });
});
