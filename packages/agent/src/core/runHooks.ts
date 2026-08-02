import { AgentHookError } from '../errors.js';
import type { AgentHook, AgentHookPhase } from '../types.js';

export async function runHooks(
  hooks: readonly AgentHook[],
  phase: AgentHookPhase,
  value: unknown,
  context: {
    readonly agentId: string;
    readonly sessionId: string;
    readonly turnId: string;
    readonly signal: AbortSignal;
  }
): Promise<unknown> {
  let current = value;
  for (const hook of hooks) {
    if (hook.phase !== phase) continue;
    try {
      current = await hook.run({ ...context, value: current });
    } catch (error) {
      if (hook.onError === 'skip') continue;
      throw new AgentHookError(
        `Agent hook "${hook.id}" failed during "${phase}".`,
        { cause: error, details: { hookId: hook.id, phase } }
      );
    }
  }
  return current;
}
