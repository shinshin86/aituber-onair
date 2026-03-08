import type { JSONSchemaType } from "ajv";
import type { WorkspaceFs } from "../../infra/fs/WorkspaceFs.js";
import { createInputValidator } from "../validator.js";
import { type ToolCommand, toToolParameters } from "../types.js";

interface ReadFileInput {
  path: string;
}

export interface ReadFileOutput {
  content: string;
  truncated: boolean;
  error?: string;
}

const schema: JSONSchemaType<ReadFileInput> = {
  type: "object",
  properties: {
    path: { type: "string", minLength: 1 },
  },
  required: ["path"],
  additionalProperties: false,
};

export function createReadFileCommand(
  fs: WorkspaceFs,
): ToolCommand<ReadFileOutput> {
  const validate = createInputValidator<ReadFileInput>(schema, "read_file");

  return {
    definition: {
      name: "read_file",
      description: "Read a text file from the workspace sandbox.",
      parameters: toToolParameters(schema),
    },
    execute: async (input) => {
      const payload = validate(input);
      return fs.readText(payload.path);
    },
    onError: (message) => ({
      content: "",
      truncated: false,
      error: message,
    }),
    isError: (output) => {
      const data = output as ReadFileOutput;
      return Boolean(data.error);
    },
  };
}
