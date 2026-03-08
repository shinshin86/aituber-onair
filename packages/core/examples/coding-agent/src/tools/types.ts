import type {
  AITuberOnAirCoreOptions,
  ToolDefinition,
} from "@aituber-onair/core";

export type CoreTool = NonNullable<AITuberOnAirCoreOptions["tools"]>[number];

export interface ToolCommand<TOutput> {
  definition: ToolDefinition;
  execute: (input: unknown) => Promise<TOutput>;
  onError: (message: string) => TOutput;
  isError: (output: unknown) => boolean;
}

export function toToolParameters(
  schema: Record<string, unknown>,
): ToolDefinition["parameters"] {
  return schema as unknown as ToolDefinition["parameters"];
}
