import { lstat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export interface ResolvedSandboxPath {
  absolutePath: string;
  relativePath: string;
}

export class PathPolicy {
  constructor(private readonly workdir: string) {}

  getWorkdir(): string {
    return this.workdir;
  }

  async assertWorkdirExists(): Promise<void> {
    await lstat(this.workdir);
  }

  async resolveInSandbox(inputPath: string): Promise<ResolvedSandboxPath> {
    if (!inputPath || !inputPath.trim()) {
      throw new Error("Path is required");
    }

    const normalizedInput = inputPath.trim();
    const candidate = isAbsolute(normalizedInput)
      ? resolve(normalizedInput)
      : resolve(this.workdir, normalizedInput);

    const rel = relative(this.workdir, candidate);
    const outOfSandbox =
      rel === ".." || rel.startsWith(`..${sep}`) || rel.startsWith("../");

    if (outOfSandbox) {
      throw new Error("Path access denied: outside workspace sandbox");
    }

    await this.assertNoSymlinkTraversal(candidate);

    const relativePath = relative(this.workdir, candidate)
      .replaceAll("\\\\", "/")
      .replace(/^\.$/, "");

    return {
      absolutePath: candidate,
      relativePath,
    };
  }

  private async assertNoSymlinkTraversal(targetPath: string): Promise<void> {
    let current = this.workdir;
    const rel = relative(this.workdir, targetPath);
    if (!rel || rel === ".") {
      return;
    }

    const segments = rel.split(/[\\/]/).filter(Boolean);
    for (const segment of segments) {
      current = resolve(current, segment);
      try {
        const stat = await lstat(current);
        if (stat.isSymbolicLink()) {
          throw new Error("Path access denied: symlink traversal is blocked");
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          break;
        }
        throw error;
      }
    }
  }
}
