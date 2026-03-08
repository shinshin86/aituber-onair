import type { JSONSchemaType } from "ajv";
import type { WorkspaceFs } from "../../infra/fs/WorkspaceFs.js";
import { createInputValidator } from "../validator.js";
import { type ToolCommand, toToolParameters } from "../types.js";

interface ListFilesInput {
  glob?: string;
  maxItems?: number;
}

export interface ListFilesOutput {
  files: string[];
  hint?: string;
  error?: string;
}

const schema: JSONSchemaType<ListFilesInput> = {
  type: "object",
  properties: {
    glob: { type: "string", nullable: true },
    maxItems: { type: "integer", minimum: 1, maximum: 5000, nullable: true },
  },
  required: [],
  additionalProperties: false,
};

export function createListFilesCommand(
  fs: WorkspaceFs,
): ToolCommand<ListFilesOutput> {
  const validate = createInputValidator<ListFilesInput>(schema, "list_files");

  return {
    definition: {
      name: "list_files",
      description:
        "List files under workspace sandbox with optional glob filter.",
      parameters: toToolParameters(schema),
    },
    execute: async (input) => {
      const payload = validate(input || {});
      const files = await fs.listFiles(
        payload.glob ?? undefined,
        payload.maxItems ?? 200,
      );

      if (files.length === 0) {
        return {
          files,
          hint: "Workspace appears empty. If the task is code generation, create a new file with write_file instead of repeating list_files.",
        };
      }

      return {
        files,
      };
    },
    onError: (message) => ({
      files: [],
      error: message,
    }),
    isError: (output) => {
      const data = output as ListFilesOutput;
      return Boolean(data.error);
    },
  };
}
