import type { AgentToolSpec } from '../types.js';

/**
 * Adds generic inference to a structurally compatible Agent Tool definition.
 * Runtime validation still occurs when the Tool is registered with an Agent.
 */
export function defineAgentTool<TInput = unknown, TOutput = unknown>(
  tool: AgentToolSpec<TInput, TOutput>
): AgentToolSpec<TInput, TOutput> {
  return tool;
}
