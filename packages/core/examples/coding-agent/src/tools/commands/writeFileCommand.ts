import type { JSONSchemaType } from "ajv";
import type { WorkspaceFs } from "../../infra/fs/WorkspaceFs.js";
import { createInputValidator } from "../validator.js";
import { type ToolCommand, toToolParameters } from "../types.js";

interface WriteFileInput {
  path: string;
  content: string;
  mode: "create" | "overwrite" | "append";
}

export interface WriteFileOutput {
  ok: boolean;
  bytesWritten: number;
  changeSummary?: string;
  error?: string;
}

const schema: JSONSchemaType<WriteFileInput> = {
  type: "object",
  properties: {
    path: { type: "string", minLength: 1 },
    content: { type: "string" },
    mode: { type: "string", enum: ["create", "overwrite", "append"] },
  },
  required: ["path", "content", "mode"],
  additionalProperties: false,
};

export function createWriteFileCommand(
  fs: WorkspaceFs,
): ToolCommand<WriteFileOutput> {
  const validate = createInputValidator<WriteFileInput>(schema, "write_file");

  return {
    definition: {
      name: "write_file",
      description: "Create, overwrite, or append a text file in workspace.",
      parameters: toToolParameters(schema),
    },
    execute: async (input) => {
      const payload = validate(input);
      const result = await fs.writeText(payload);
      return {
        ok: true,
        bytesWritten: result.bytesWritten,
        changeSummary: result.changeSummary,
      };
    },
    onError: (message) => ({
      ok: false,
      bytesWritten: 0,
      error: message,
    }),
    isError: (output) => {
      const data = output as WriteFileOutput;
      return Boolean(data.error) || !data.ok;
    },
  };
}
