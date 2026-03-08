import type { JSONSchemaType } from "ajv";
import type { SafeProcessRunner } from "../../infra/process/SafeProcessRunner.js";
import { MAX_COMMAND_TIMEOUT_MS } from "../../domain/policy/outputPolicy.js";
import { createInputValidator } from "../validator.js";
import { type ToolCommand, toToolParameters } from "../types.js";

interface ExecCommandInput {
  command: string;
  args: string[];
  timeoutMs?: number;
}

export interface ExecCommandOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
  error?: string;
}

const schema: JSONSchemaType<ExecCommandInput> = {
  type: "object",
  properties: {
    command: { type: "string", minLength: 1 },
    args: { type: "array", items: { type: "string" }, maxItems: 100 },
    timeoutMs: {
      type: "integer",
      minimum: 1,
      maximum: MAX_COMMAND_TIMEOUT_MS,
      nullable: true,
    },
  },
  required: ["command", "args"],
  additionalProperties: false,
};

export function createExecCommandCommand(
  runner: SafeProcessRunner,
): ToolCommand<ExecCommandOutput> {
  const validate = createInputValidator<ExecCommandInput>(
    schema,
    "exec_command",
  );

  return {
    definition: {
      name: "exec_command",
      description:
        "Execute an allowlisted command in AGENT_WORKDIR without shell.",
      parameters: toToolParameters(schema),
    },
    execute: async (input) => {
      const payload = validate(input);
      return runner.run(payload);
    },
    onError: (message) => ({
      exitCode: 126,
      stdout: "",
      stderr: message,
      truncated: false,
      error: message,
    }),
    isError: (output) => {
      const data = output as ExecCommandOutput;
      return Boolean(data.error);
    },
  };
}
