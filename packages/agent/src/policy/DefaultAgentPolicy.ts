import { AgentPolicyDeniedError } from '../errors.js';
import type {
  AgentPolicy,
  AgentPolicyConfig,
  AgentPolicyContext,
  AgentPolicyDecision,
  AgentToolRisk,
} from '../types.js';

const RISK_ORDER: readonly AgentToolRisk[] = [
  'read',
  'draft',
  'write',
  'external',
  'destructive',
];

export function createPolicy(
  input: AgentPolicy | AgentPolicyConfig | undefined
): AgentPolicy {
  if (input && 'evaluate' in input) {
    const evaluate = input.evaluate.bind(input);
    return { evaluate };
  }
  const config = snapshotConfig(input ?? { defaultDecision: 'deny' });
  return {
    evaluate(context) {
      return evaluateConfig(config, context);
    },
  };
}

export async function evaluatePolicy(
  policy: AgentPolicy,
  context: AgentPolicyContext
): Promise<AgentPolicyDecision> {
  let result: AgentPolicyDecision;
  try {
    result = await policy.evaluate(context);
  } catch (error) {
    throw new AgentPolicyDeniedError(
      `Policy evaluation failed for Agent Tool "${context.tool.id}".`,
      { cause: error }
    );
  }
  if (
    !result ||
    !['allow', 'deny', 'require-approval'].includes(result.decision)
  ) {
    throw new AgentPolicyDeniedError(
      `Policy returned an invalid decision for Agent Tool "${context.tool.id}".`
    );
  }
  if (
    (result.decision === 'deny' || result.decision === 'require-approval') &&
    (typeof result.reason !== 'string' || !result.reason.trim())
  ) {
    throw new AgentPolicyDeniedError(
      `Policy returned a decision without a reason for Agent Tool "${context.tool.id}".`
    );
  }
  if (
    result.decision === 'allow' &&
    result.reason !== undefined &&
    typeof result.reason !== 'string'
  ) {
    throw new AgentPolicyDeniedError(
      `Policy returned an invalid reason for Agent Tool "${context.tool.id}".`
    );
  }
  return result;
}

function evaluateConfig(
  config: AgentPolicyConfig,
  context: AgentPolicyContext
): AgentPolicyDecision {
  const toolId = context.tool.id;
  if (config.denyTools?.includes(toolId)) {
    return {
      decision: 'deny',
      reason: `Tool "${toolId}" is denied by policy.`,
    };
  }
  if (requiresApproval(config, context)) {
    return {
      decision: 'require-approval',
      reason: `Tool "${toolId}" requires host approval.`,
    };
  }
  if (config.allowTools?.includes(toolId)) return { decision: 'allow' };
  if (config.defaultDecision === 'allow') return { decision: 'allow' };
  return {
    decision: 'deny',
    reason: `Tool "${toolId}" is denied by the default policy.`,
  };
}

function requiresApproval(
  config: AgentPolicyConfig,
  context: AgentPolicyContext
): boolean {
  const rule = config.requireApproval;
  if (!rule) return false;
  if (rule.tools?.includes(context.tool.id)) return true;
  if (!rule.riskAtLeast) return false;
  return (
    RISK_ORDER.indexOf(context.tool.risk) >=
    RISK_ORDER.indexOf(rule.riskAtLeast)
  );
}

function snapshotConfig(config: AgentPolicyConfig): AgentPolicyConfig {
  return Object.freeze({
    defaultDecision: config.defaultDecision,
    allowTools: config.allowTools
      ? Object.freeze([...config.allowTools])
      : undefined,
    denyTools: config.denyTools
      ? Object.freeze([...config.denyTools])
      : undefined,
    requireApproval: config.requireApproval
      ? Object.freeze({
          riskAtLeast: config.requireApproval.riskAtLeast,
          tools: config.requireApproval.tools
            ? Object.freeze([...config.requireApproval.tools])
            : undefined,
        })
      : undefined,
  });
}
