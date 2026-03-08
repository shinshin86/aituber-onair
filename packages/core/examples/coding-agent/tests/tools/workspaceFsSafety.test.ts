import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MAX_READ_BYTES,
  MAX_WRITE_BYTES,
} from "../../src/domain/policy/outputPolicy.js";
import { PathPolicy } from "../../src/domain/policy/pathPolicy.js";
import { SecretPolicy } from "../../src/domain/policy/secretPolicy.js";
import { WorkspaceFs } from "../../src/infra/fs/WorkspaceFs.js";
import { withTempWorkspace } from "../helpers/tempWorkspace.js";

describe("WorkspaceFs safety", () => {
  it("blocks sensitive path read/write", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      await writeFile(`${workspace}/.env`, "SECRET=value", "utf8");

      await expect(fs.readText(".env")).rejects.toThrow("sensitive");
      await expect(
        fs.writeText({
          path: ".env",
          content: "UPDATED=true",
          mode: "overwrite",
        }),
      ).rejects.toThrow("sensitive");
    });
  });

  it("truncates long reads", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      const large = "a".repeat(MAX_READ_BYTES + 2048);
      await writeFile(`${workspace}/large.txt`, large, "utf8");

      const result = await fs.readText("large.txt");
      expect(result.truncated).toBe(true);
      expect(result.content).toContain("...truncated...");
    });
  });

  it("rejects oversized writes", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      const large = "x".repeat(MAX_WRITE_BYTES + 1);

      await expect(
        fs.writeText({
          path: "too-large.txt",
          content: large,
          mode: "create",
        }),
      ).rejects.toThrow("size limit exceeded");
    });
  });

  it("rejects create mode when file already exists", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      await writeFile(`${workspace}/a.txt`, "one\n", "utf8");

      await expect(
        fs.writeText({
          path: "a.txt",
          content: "two\n",
          mode: "create",
        }),
      ).rejects.toThrow("already exists");
    });
  });

  it("rejects invalid patch application", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      await writeFile(`${workspace}/a.txt`, "hello\n", "utf8");

      await expect(
        fs.applyPatch("a.txt", "@@ -1,1 +1,1 @@\n-nope\n+YES\n"),
      ).rejects.toThrow("Patch could not be applied");
    });
  });

  it("omits ignored directories and sensitive files from list", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      await mkdir(`${workspace}/src`, { recursive: true });
      await mkdir(`${workspace}/node_modules/pkg`, { recursive: true });
      await mkdir(`${workspace}/dist`, { recursive: true });
      await mkdir(`${workspace}/.git`, { recursive: true });

      await writeFile(`${workspace}/src/ok.txt`, "ok", "utf8");
      await writeFile(`${workspace}/node_modules/pkg/a.txt`, "skip", "utf8");
      await writeFile(`${workspace}/dist/out.txt`, "skip", "utf8");
      await writeFile(`${workspace}/.env`, "SECRET=1", "utf8");

      const files = await fs.listFiles("**/*.txt", 50);
      expect(files).toContain("src/ok.txt");
      expect(files).not.toContain("node_modules/pkg/a.txt");
      expect(files).not.toContain("dist/out.txt");
      expect(files).not.toContain(".env");
    });
  });

  it("enforces maxMatches in search", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      await writeFile(
        `${workspace}/multi.txt`,
        "alpha\nalpha\nalpha\nalpha\n",
        "utf8",
      );

      const matches = await fs.searchText("alpha", undefined, 2);
      expect(matches).toHaveLength(2);
    });
  });
});
