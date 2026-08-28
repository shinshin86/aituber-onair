/** Creates a managed Agent from a host-owned definition and backend. */
export { createAgent } from './core/AgentRuntime.js';
/** Preserves generic Tool input/output inference while registering a structural Tool spec. */
export { defineAgentTool } from './tools/defineAgentTool.js';
/** Typed errors shared by the base runtime and optional backends. */
export * from './errors.js';
/** Public Agent, Session, Tool, policy, hook, event, and backend contracts. */
export type * from './types.js';
