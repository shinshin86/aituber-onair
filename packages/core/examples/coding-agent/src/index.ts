import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfigFromEnv } from "./config/loadConfig.js";
import { AgentError, toErrorMessage } from "./domain/errors.js";
import { CommandPolicy } from "./domain/policy/commandPolicy.js";
import { PathPolicy } from "./domain/policy/pathPolicy.js";
import { SecretPolicy } from "./domain/policy/secretPolicy.js";
import { AgentSession } from "./app/AgentSession.js";
import { ToolLoopGuard } from "./app/ToolLoopGuard.js";
import { TurnController } from "./app/TurnController.js";
import { CoreProviderAdapter } from "./infra/core/CoreProviderAdapter.js";
import { WorkspaceFs } from "./infra/fs/WorkspaceFs.js";
import { AuditLogger } from "./infra/logging/AuditLogger.js";
import { SafeProcessRunner } from "./infra/process/SafeProcessRunner.js";
import { ToolRegistry } from "./tools/ToolRegistry.js";
import type { ToolCommand } from "./tools/types.js";
import { createApplyPatchCommand } from "./tools/commands/applyPatchCommand.js";
import { createExecCommandCommand } from "./tools/commands/execCommandCommand.js";
import { createListFilesCommand } from "./tools/commands/listFilesCommand.js";
import { createReadFileCommand } from "./tools/commands/readFileCommand.js";
import { createSearchTextCommand } from "./tools/commands/searchTextCommand.js";
import { createWriteFileCommand } from "./tools/commands/writeFileCommand.js";

function printUsage(): void {
  console.log("Usage: node dist/index.js [workdir]");
  console.log("   or: node dist/index.js --workdir <path>");
}

function resolveWorkdirFromArgs(argv: string[]): string | undefined {
  if (argv.length === 0) {
    return undefined;
  }

  if (argv[0] === "--help" || argv[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  if (argv[0] === "--workdir") {
    const value = argv[1];
    if (!value) {
      throw new AgentError("E_CONFIG", "Missing value for --workdir");
    }
    return resolve(process.cwd(), value);
  }

  if (argv[0].startsWith("--")) {
    throw new AgentError("E_CONFIG", `Unknown option: ${argv[0]}`);
  }

  return resolve(process.cwd(), argv[0]);
}

function assertDirectory(path: string): void {
  if (!existsSync(path)) {
    throw new AgentError("E_CONFIG", `Workdir does not exist: ${path}`);
  }

  const stat = statSync(path);
  if (!stat.isDirectory()) {
    throw new AgentError("E_CONFIG", `Workdir is not a directory: ${path}`);
  }
}

async function main(): Promise<void> {
  const workdirOverride = resolveWorkdirFromArgs(process.argv.slice(2));
  if (workdirOverride) {
    assertDirectory(workdirOverride);
    process.env.AGENT_WORKDIR = workdirOverride;
  }

  const config = loadConfigFromEnv(process.cwd());

  const logger = new AuditLogger();
  const pathPolicy = new PathPolicy(config.workdir);
  await pathPolicy.assertWorkdirExists();

  const secretPolicy = new SecretPolicy();
  const commandPolicy = new CommandPolicy();
  const workspaceFs = new WorkspaceFs(pathPolicy, secretPolicy);
  const processRunner = new SafeProcessRunner(config.workdir, commandPolicy);

  const loopGuard = new ToolLoopGuard(
    config.maxIdenticalToolCalls,
    config.maxConsecutiveToolFailures,
  );

  const commands: ToolCommand<unknown>[] = [
    createReadFileCommand(workspaceFs),
    createListFilesCommand(workspaceFs),
    createWriteFileCommand(workspaceFs),
    createApplyPatchCommand(workspaceFs),
    createExecCommandCommand(processRunner),
    createSearchTextCommand(workspaceFs),
  ];

  const tools = new ToolRegistry(loopGuard).buildTools(commands);
  const adapter = new CoreProviderAdapter(config, tools, logger, commandPolicy);
  const turnController = new TurnController(config, adapter, loopGuard, logger);
  const session = new AgentSession(config, turnController, logger);

  await session.startRepl();
}

main().catch((error) => {
  console.error(`Failed to start agent: ${toErrorMessage(error)}`);
  printUsage();
  process.exit(1);
});
