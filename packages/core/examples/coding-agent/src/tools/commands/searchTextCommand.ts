import type { JSONSchemaType } from "ajv";
import type { WorkspaceFs } from "../../infra/fs/WorkspaceFs.js";
import { createInputValidator } from "../validator.js";
import { type ToolCommand, toToolParameters } from "../types.js";

interface SearchTextInput {
  query: string;
  paths?: string[];
  maxMatches?: number;
}

export interface SearchTextOutput {
  matches: Array<{ path: string; line: number; text: string }>;
  error?: string;
}

const schema: JSONSchemaType<SearchTextInput> = {
  type: "object",
  properties: {
    query: { type: "string", minLength: 1 },
    paths: {
      type: "array",
      items: { type: "string", minLength: 1 },
      maxItems: 500,
      nullable: true,
    },
    maxMatches: {
      type: "integer",
      minimum: 1,
      maximum: 1000,
      nullable: true,
    },
  },
  required: ["query"],
  additionalProperties: false,
};

export function createSearchTextCommand(
  fs: WorkspaceFs,
): ToolCommand<SearchTextOutput> {
  const validate = createInputValidator<SearchTextInput>(schema, "search_text");

  return {
    definition: {
      name: "search_text",
      description: "Search text in workspace files and return matching lines.",
      parameters: toToolParameters(schema),
    },
    execute: async (input) => {
      const payload = validate(input);
      return {
        matches: await fs.searchText(
          payload.query,
          payload.paths ?? undefined,
          payload.maxMatches ?? 50,
        ),
      };
    },
    onError: (message) => ({
      matches: [],
      error: message,
    }),
    isError: (output) => {
      const data = output as SearchTextOutput;
      return Boolean(data.error);
    },
  };
}
