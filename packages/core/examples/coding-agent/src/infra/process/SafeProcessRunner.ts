import { spawn } from "node:child_process";
import type { CommandPolicy } from "../../domain/policy/commandPolicy.js";
import {
  DEFAULT_COMMAND_TIMEOUT_MS,
  MAX_COMMAND_OUTPUT_BYTES,
  MAX_COMMAND_TIMEOUT_MS,
} from "../../domain/policy/outputPolicy.js";

export interface CommandRunInput {
  command: string;
  args: string[];
  timeoutMs?: number;
}

export interface CommandRunOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
}

export class SafeProcessRunner {
  constructor(
    private readonly cwd: string,
    private readonly commandPolicy: CommandPolicy,
  ) {}

  async run(input: CommandRunInput): Promise<CommandRunOutput> {
    this.commandPolicy.assertAllowed(input.command, input.args);

    const timeoutMs = Math.min(
      input.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
      MAX_COMMAND_TIMEOUT_MS,
    );

    return new Promise((resolve) => {
      const child = spawn(input.command, input.args, {
        cwd: this.cwd,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let totalBytes = 0;
      let truncated = false;
      let timedOut = false;

      const pushChunk = (
        target: Buffer[],
        chunk: Buffer | Uint8Array,
      ): void => {
        const buffer = Buffer.from(chunk);
        const left = MAX_COMMAND_OUTPUT_BYTES - totalBytes;
        if (left <= 0) {
          truncated = true;
          return;
        }

        if (buffer.length > left) {
          target.push(buffer.subarray(0, left));
          totalBytes += left;
          truncated = true;
          return;
        }

        target.push(buffer);
        totalBytes += buffer.length;
      };

      child.stdout.on("data", (chunk: Buffer | Uint8Array) => {
        pushChunk(stdoutChunks, chunk);
        if (truncated && !timedOut) {
          child.kill("SIGTERM");
        }
      });

      child.stderr.on("data", (chunk: Buffer | Uint8Array) => {
        pushChunk(stderrChunks, chunk);
        if (truncated && !timedOut) {
          child.kill("SIGTERM");
        }
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, timeoutMs);

      child.on("error", (error) => {
        clearTimeout(timer);
        resolve({
          exitCode: 127,
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: `${Buffer.concat(stderrChunks).toString("utf8")}\n${error.message}`,
          truncated,
        });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        const timeoutMsg = timedOut
          ? `\nCommand timed out after ${timeoutMs}ms`
          : "";
        const truncateMsg = truncated
          ? "\nOutput truncated due to size limit"
          : "";

        resolve({
          exitCode: timedOut ? -1 : (code ?? 1),
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: `${Buffer.concat(stderrChunks).toString("utf8")}${timeoutMsg}${truncateMsg}`,
          truncated,
        });
      });
    });
  }
}
