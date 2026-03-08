import type { JSONSchemaType } from "ajv";
import type { WorkspaceFs } from "../../infra/fs/WorkspaceFs.js";
import { createInputValidator } from "../validator.js";
import { type ToolCommand, toToolParameters } from "../types.js";

interface ApplyPatchInput {
  path: string;
  patch: string;
}

export interface ApplyPatchOutput {
  ok: boolean;
  appliedHunks: number;
  error?: string;
}

const schema: JSONSchemaType<ApplyPatchInput> = {
  type: "object",
  properties: {
    path: { type: "string", minLength: 1 },
    patch: { type: "string", minLength: 1 },
  },
  required: ["path", "patch"],
  additionalProperties: false,
};

export function createApplyPatchCommand(
  fs: WorkspaceFs,
): ToolCommand<ApplyPatchOutput> {
  const validate = createInputValidator<ApplyPatchInput>(schema, "apply_patch");

  return {
    definition: {
      name: "apply_patch",
      description: "Apply unified diff patch to a text file in workspace.",
      parameters: toToolParameters(schema),
    },
    execute: async (input) => {
      const payload = validate(input);
      const result = await fs.applyPatch(payload.path, payload.patch);
      return {
        ok: true,
        appliedHunks: result.appliedHunks,
      };
    },
    onError: (message) => ({
      ok: false,
      appliedHunks: 0,
      error: message,
    }),
    isError: (output) => {
      const data = output as ApplyPatchOutput;
      return Boolean(data.error) || !data.ok;
    },
  };
}
