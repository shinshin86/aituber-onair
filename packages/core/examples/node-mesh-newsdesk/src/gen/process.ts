import { type SpawnOptions, spawn } from 'node:child_process';

export interface CommandResult {
  stdout: string;
  stderr: string;
}

/** Run a command to completion and capture its output. */
export function runCommand(
  command: string,
  args: string[],
  options: SpawnOptions = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `${command} ${args.join(' ')} failed with code ${code}\n${stderr || stdout}`,
          ),
        );
      }
    });
  });
}
