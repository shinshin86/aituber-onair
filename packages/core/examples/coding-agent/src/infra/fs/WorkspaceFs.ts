import {
  access,
  appendFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { applyPatch as applyUnifiedPatch } from "diff";
import { minimatch } from "minimatch";
import type { PathPolicy } from "../../domain/policy/pathPolicy.js";
import type { SecretPolicy } from "../../domain/policy/secretPolicy.js";
import {
  MAX_READ_BYTES,
  MAX_WRITE_BYTES,
  truncateUtf8,
} from "../../domain/policy/outputPolicy.js";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "old",
]);

export interface ReadTextOutput {
  content: string;
  truncated: boolean;
}

export interface WriteTextInput {
  path: string;
  content: string;
  mode: "create" | "overwrite" | "append";
}

export interface WriteTextOutput {
  bytesWritten: number;
  changeSummary: string;
}

export interface PatchOutput {
  appliedHunks: number;
}

export interface SearchMatch {
  path: string;
  line: number;
  text: string;
}

export class WorkspaceFs {
  constructor(
    private readonly pathPolicy: PathPolicy,
    private readonly secretPolicy: SecretPolicy,
  ) {}

  async readText(path: string): Promise<ReadTextOutput> {
    const resolved = await this.pathPolicy.resolveInSandbox(path);
    this.secretPolicy.assertReadable(resolved.relativePath);

    const raw = await readFile(resolved.absolutePath);
    if (raw.includes(0)) {
      throw new Error("Binary file is not supported");
    }

    const content = raw.toString("utf8");
    return truncateUtf8(content, MAX_READ_BYTES);
  }

  async listFiles(
    glob: string | undefined,
    maxItems: number,
  ): Promise<string[]> {
    const files: string[] = [];
    await this.walk(this.pathPolicy.getWorkdir(), "", files, maxItems, glob);
    return files;
  }

  async writeText(input: WriteTextInput): Promise<WriteTextOutput> {
    const size = Buffer.byteLength(input.content, "utf8");
    if (size > MAX_WRITE_BYTES) {
      throw new Error(
        `Write rejected: size limit exceeded (${MAX_WRITE_BYTES} bytes)`,
      );
    }

    if (input.content.includes("\u0000")) {
      throw new Error("Binary content is not allowed");
    }

    const resolved = await this.pathPolicy.resolveInSandbox(input.path);
    this.secretPolicy.assertWritable(resolved.relativePath);

    await mkdir(dirname(resolved.absolutePath), { recursive: true });

    let beforeBytes = 0;
    try {
      const before = await readFile(resolved.absolutePath, "utf8");
      beforeBytes = Buffer.byteLength(before, "utf8");
    } catch {
      beforeBytes = 0;
    }

    if (input.mode === "create") {
      try {
        await access(resolved.absolutePath);
        throw new Error("Target file already exists");
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Target file already exists"
        ) {
          throw error;
        }
        const code = (error as NodeJS.ErrnoException).code;
        if (code && code !== "ENOENT") {
          throw error;
        }
      }
      await writeFile(resolved.absolutePath, input.content, "utf8");
    }

    if (input.mode === "overwrite") {
      await writeFile(resolved.absolutePath, input.content, "utf8");
    }

    if (input.mode === "append") {
      await appendFile(resolved.absolutePath, input.content, "utf8");
    }

    const after = await readFile(resolved.absolutePath, "utf8");
    const afterBytes = Buffer.byteLength(after, "utf8");

    return {
      bytesWritten: size,
      changeSummary: `size ${beforeBytes} -> ${afterBytes} bytes (${input.mode})`,
    };
  }

  async applyPatch(path: string, patch: string): Promise<PatchOutput> {
    const resolved = await this.pathPolicy.resolveInSandbox(path);
    this.secretPolicy.assertWritable(resolved.relativePath);

    const original = await readFile(resolved.absolutePath, "utf8");
    const next = applyUnifiedPatch(original, patch);

    if (next === false) {
      throw new Error("Patch could not be applied");
    }

    await writeFile(resolved.absolutePath, next, "utf8");
    const appliedHunks = (patch.match(/^@@/gm) || []).length;
    return { appliedHunks };
  }

  async searchText(
    query: string,
    paths: string[] | undefined,
    maxMatches: number,
  ): Promise<SearchMatch[]> {
    const targets =
      paths && paths.length > 0
        ? await Promise.all(
            paths.map(async (path) => {
              const resolved = await this.pathPolicy.resolveInSandbox(path);
              return resolved.relativePath;
            }),
          )
        : await this.listFiles(undefined, 1_000);

    const matches: SearchMatch[] = [];

    for (const relativePath of targets) {
      if (matches.length >= maxMatches) {
        break;
      }

      if (this.secretPolicy.isSensitivePath(relativePath)) {
        continue;
      }

      const absolutePath = resolve(this.pathPolicy.getWorkdir(), relativePath);
      const raw = await readFile(absolutePath).catch(() => undefined);
      if (!raw || raw.includes(0)) {
        continue;
      }

      const lines = raw.toString("utf8").split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (matches.length >= maxMatches) {
          break;
        }
        const line = lines[index] || "";
        if (!line.includes(query)) {
          continue;
        }

        matches.push({
          path: relativePath,
          line: index + 1,
          text: line.slice(0, 300),
        });
      }
    }

    return matches;
  }

  private async walk(
    absoluteDir: string,
    relativeDir: string,
    output: string[],
    maxItems: number,
    glob: string | undefined,
  ): Promise<void> {
    if (output.length >= maxItems) {
      return;
    }

    const entries = await readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      if (output.length >= maxItems) {
        return;
      }

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        const nextRelativeDir = relativeDir
          ? `${relativeDir}/${entry.name}`
          : entry.name;
        const nextAbsoluteDir = resolve(absoluteDir, entry.name);
        await this.walk(
          nextAbsoluteDir,
          nextRelativeDir,
          output,
          maxItems,
          glob,
        );
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const relativePath = relativeDir
        ? `${relativeDir}/${entry.name}`
        : entry.name;

      if (this.secretPolicy.isSensitivePath(relativePath)) {
        continue;
      }

      if (glob && !minimatch(relativePath, glob, { dot: true })) {
        continue;
      }

      output.push(relativePath);
    }
  }
}
