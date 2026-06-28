/**
 * Provider-agnostic tool definition for AI agents.
 *
 * A plain JSON-Schema descriptor (no SDK dependency) describing the input to
 * `ManneriDetector.reviewDraft(messages, draft)`. An agent can register this as
 * a self-review tool that checks whether a drafted reply repeats earlier turns
 * before sending it.
 */

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const REVIEW_DRAFT_REPETITION_TOOL: AgentToolDefinition = {
  name: 'review_draft_repetition',
  description:
    'Check whether a drafted assistant reply repeats recent conversation patterns. Returns whether the draft should be rewritten and an optional diversification suggestion.',
  parameters: {
    type: 'object',
    properties: {
      messages: {
        type: 'array',
        description: 'Recent conversation history before the draft.',
        items: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['system', 'user', 'assistant', 'tool'],
            },
            content: { type: 'string' },
            timestamp: { type: 'number' },
          },
          required: ['role', 'content'],
        },
      },
      draft: {
        type: 'string',
        description: 'The drafted assistant reply to review before sending.',
      },
    },
    required: ['messages', 'draft'],
  },
};

export const MANNERI_AGENT_TOOLS: AgentToolDefinition[] = [
  REVIEW_DRAFT_REPETITION_TOOL,
];
