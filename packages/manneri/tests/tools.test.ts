import { describe, expect, it } from 'vitest';
import {
  MANNERI_AGENT_TOOLS,
  REVIEW_DRAFT_REPETITION_TOOL,
} from '../src/index.js';

describe('manneri agent tool definitions', () => {
  it('exposes a JSON-schema tool for draft repetition review', () => {
    expect(REVIEW_DRAFT_REPETITION_TOOL.name).toBe('review_draft_repetition');
    const params = REVIEW_DRAFT_REPETITION_TOOL.parameters as {
      type: string;
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(params.type).toBe('object');
    expect(params.required).toEqual(['messages', 'draft']);
    expect(params.properties).toHaveProperty('messages');
    expect(params.properties).toHaveProperty('draft');
  });

  it('lists the tool in the aggregate export', () => {
    expect(MANNERI_AGENT_TOOLS).toContainEqual(REVIEW_DRAFT_REPETITION_TOOL);
  });
});
