const ALLOWED_COMMANDS = [
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
] as const;

const READ_ONLY_GIT_SUBCOMMANDS = [
  "status",
  "diff",
  "log",
  "show",
  "rev-parse",
  "branch",
  "ls-files",
  "grep",
] as const;

const FORBIDDEN_ARG_PATTERNS = [/\|\s*sh/, /\|\s*bash/, /^-c$/, /^--command$/];

const ALLOWED_COMMAND_SET: ReadonlySet<string> = new Set(ALLOWED_COMMANDS);
const READ_ONLY_GIT_SUBCOMMANDS_SET: ReadonlySet<string> = new Set(
  READ_ONLY_GIT_SUBCOMMANDS,
);

export class CommandPolicy {
  assertAllowed(command: string, args: string[]): void {
    if (!command) {
      throw new Error("Command is required");
    }

    if (!ALLOWED_COMMAND_SET.has(command)) {
      throw new Error(`Command '${command}' is not allowed`);
    }

    if (
      args.some((arg) =>
        FORBIDDEN_ARG_PATTERNS.some((pattern) => pattern.test(arg)),
      )
    ) {
      throw new Error("Command arguments contain forbidden patterns");
    }

    if (command === "git") {
      const subcommand = args[0];
      if (!subcommand || !READ_ONLY_GIT_SUBCOMMANDS_SET.has(subcommand)) {
        throw new Error("Only read-only git subcommands are allowed");
      }
    }
  }

  getAllowedCommands(): readonly string[] {
    return ALLOWED_COMMANDS;
  }

  getReadOnlyGitSubcommands(): readonly string[] {
    return READ_ONLY_GIT_SUBCOMMANDS;
  }

  buildPromptSection(): string {
    return [
      `Allowed commands: ${ALLOWED_COMMANDS.join(", ")}`,
      "All other commands are denied.",
      `Git allowed subcommands: ${READ_ONLY_GIT_SUBCOMMANDS.join(", ")}`,
      "Never use shell trampoline patterns such as -c or --command.",
    ].join("\n");
  }
}
