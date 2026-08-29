import { AgentHookError } from '../errors.js';
import type {
  AgentHook,
  AgentHookContext,
  AgentHookPhase,
  AgentHookValueMap,
} from '../types.js';

interface RuntimeAgentHook {
  readonly id: string;
  readonly phase: AgentHookPhase;
  readonly onError: 'fail-turn' | 'skip';
  run(context: AgentHookContext<unknown>): Promise<unknown> | unknown;
}

export async function runHooks<TPhase extends AgentHookPhase>(
  hooks: readonly AgentHook[],
  phase: TPhase,
  value: AgentHookValueMap[TPhase]['input'],
  context: {
    readonly agentId: string;
    readonly sessionId: string;
    readonly turnId: string;
    readonly signal: AbortSignal;
  }
): Promise<AgentHookValueMap[TPhase]['output']> {
  let current: unknown = value;
  for (const hook of hooks) {
    if (hook.phase !== phase) continue;
    const runtimeHook = hook as RuntimeAgentHook;
    try {
      current = await runtimeHook.run({ ...context, value: current });
    } catch (error) {
      if (runtimeHook.onError === 'skip') continue;
      throw new AgentHookError(
        `Agent hook "${runtimeHook.id}" failed during "${phase}".`,
        { cause: error, details: { hookId: runtimeHook.id, phase } }
      );
    }
  }
  return current as AgentHookValueMap[TPhase]['output'];
}
