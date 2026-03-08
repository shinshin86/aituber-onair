import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";

interface CliResult {
  exitCode: number;
  output: string;
}

async function runCli(args: string[]): Promise<CliResult> {
  const child = spawn(process.execPath, ["dist/index.js", ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk: Buffer | Uint8Array) => {
    output += Buffer.from(chunk).toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer | Uint8Array) => {
    output += Buffer.from(chunk).toString("utf8");
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      resolve(code ?? 1);
    });
  });

  return { exitCode, output };
}

describe("coding-agent cli args", () => {
  it("fails on unknown option with usage", async () => {
    const result = await runCli(["--unknown"]);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("Unknown option");
    expect(result.output).toContain("Usage: node dist/index.js [workdir]");
  });

  it("fails when --workdir has no value", async () => {
    const result = await runCli(["--workdir"]);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("Missing value for --workdir");
    expect(result.output).toContain("Usage: node dist/index.js [workdir]");
  });
});
