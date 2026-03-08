import { describe, expect, it } from "vitest";
import { CommandPolicy } from "../../src/domain/policy/commandPolicy.js";

describe("CommandPolicy", () => {
  const policy = new CommandPolicy();

  it("keeps strict allowlist", () => {
    expect(policy.getAllowedCommands()).toEqual([
      "node",
      "npm",
      "pnpm",
      "git",
      "ls",
      "cat",
      "sed",
      "grep",
      "rg",
      "find",
      "mkdir",
      "cp",
      "mv",
    ]);
  });

  it("allows only allowlisted commands", () => {
    expect(() => policy.assertAllowed("node", ["--version"])).not.toThrow();
    expect(() => policy.assertAllowed("git", ["status"])).not.toThrow();
    expect(() => policy.assertAllowed("rm", ["-rf", "."])).toThrow(
      "not allowed",
    );
  });

  it("rejects dangerous argument patterns", () => {
    expect(() => policy.assertAllowed("node", ["-c", "x"])).toThrow(
      "forbidden patterns",
    );
    expect(() => policy.assertAllowed("node", ["echo", "a | sh"])).toThrow(
      "forbidden patterns",
    );
  });

  it("allows only readonly git subcommands", () => {
    expect(() => policy.assertAllowed("git", ["diff"])).not.toThrow();
    expect(() => policy.assertAllowed("git", ["push"])).toThrow("read-only");
  });
});
