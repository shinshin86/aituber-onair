import { mkdir, readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PathPolicy } from "../../src/domain/policy/pathPolicy.js";
import { SecretPolicy } from "../../src/domain/policy/secretPolicy.js";
import { WorkspaceFs } from "../../src/infra/fs/WorkspaceFs.js";
import { createApplyPatchCommand } from "../../src/tools/commands/applyPatchCommand.js";
import { createListFilesCommand } from "../../src/tools/commands/listFilesCommand.js";
import { createReadFileCommand } from "../../src/tools/commands/readFileCommand.js";
import { createSearchTextCommand } from "../../src/tools/commands/searchTextCommand.js";
import { createWriteFileCommand } from "../../src/tools/commands/writeFileCommand.js";
import { withTempWorkspace } from "../helpers/tempWorkspace.js";

describe("tools read/list/write/apply/search", () => {
  it("reads and lists files", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      await mkdir(`${workspace}/src`, { recursive: true });
      await writeFile(`${workspace}/src/a.txt`, "hello\nworld\n", "utf8");

      const list = createListFilesCommand(fs);
      const read = createReadFileCommand(fs);

      const listed = await list.execute({ glob: "**/*.txt", maxItems: 20 });
      const content = await read.execute({ path: "src/a.txt" });

      expect(listed.files).toContain("src/a.txt");
      expect(content.content).toContain("hello");
    });
  });

  it("writes and patches files", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      const write = createWriteFileCommand(fs);
      const patch = createApplyPatchCommand(fs);

      const wrote = await write.execute({
        path: "a.txt",
        content: "one\ntwo\nthree\n",
        mode: "create",
      });
      expect(wrote.ok).toBe(true);

      const patched = await patch.execute({
        path: "a.txt",
        patch: "@@ -1,3 +1,3 @@\n one\n-two\n+TWO\n three\n",
      });

      const after = await readFile(`${workspace}/a.txt`, "utf8");
      expect(patched.ok).toBe(true);
      expect(after).toContain("TWO");
    });
  });

  it("searches text lines", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      await writeFile(`${workspace}/x.txt`, "alpha\nbeta\nalpha-two\n", "utf8");

      const search = createSearchTextCommand(fs);
      const result = await search.execute({ query: "alpha", maxMatches: 10 });

      expect(result.matches).toHaveLength(2);
    });
  });

  it("returns creation hint when workspace is empty", async () => {
    await withTempWorkspace(async (workspace) => {
      const fs = new WorkspaceFs(new PathPolicy(workspace), new SecretPolicy());
      const list = createListFilesCommand(fs);

      const result = await list.execute({});
      expect(result.files).toEqual([]);
      expect(result.hint).toContain("create");
    });
  });
});
