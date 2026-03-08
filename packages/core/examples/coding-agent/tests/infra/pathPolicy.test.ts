import { mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PathPolicy } from "../../src/domain/policy/pathPolicy.js";
import { withTempWorkspace } from "../helpers/tempWorkspace.js";

describe("PathPolicy", () => {
  it("resolves workspace-relative paths", async () => {
    await withTempWorkspace(async (workspace) => {
      const policy = new PathPolicy(workspace);
      const resolved = await policy.resolveInSandbox("src/a.txt");
      expect(resolved.relativePath).toBe("src/a.txt");
    });
  });

  it("blocks outside workspace paths", async () => {
    await withTempWorkspace(async (workspace) => {
      const policy = new PathPolicy(workspace);
      await expect(policy.resolveInSandbox("../outside.txt")).rejects.toThrow(
        "outside workspace",
      );
      await expect(
        policy.resolveInSandbox(join(tmpdir(), "outside.txt")),
      ).rejects.toThrow("outside workspace");
    });
  });

  it("rejects empty path", async () => {
    await withTempWorkspace(async (workspace) => {
      const policy = new PathPolicy(workspace);
      await expect(policy.resolveInSandbox("   ")).rejects.toThrow(
        "Path is required",
      );
    });
  });

  it("blocks symlink traversal", async () => {
    await withTempWorkspace(async (workspace) => {
      const outside = join(tmpdir(), `coding-agent-outside-${Date.now()}`);
      await mkdir(outside, { recursive: true });
      await writeFile(join(outside, "a.txt"), "x", "utf8");
      await symlink(outside, join(workspace, "link"));

      const policy = new PathPolicy(workspace);
      await expect(policy.resolveInSandbox("link/a.txt")).rejects.toThrow(
        "symlink traversal",
      );
    });
  });
});
