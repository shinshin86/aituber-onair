import { describe, expect, it } from 'vitest';
import {
  ANALYZE_LIVE_COMMENTS_TOOL,
  COMMENT_INTELLIGENCE_AGENT_TOOLS,
} from '../src/index.js';

describe('agent tool definitions', () => {
  it('exposes a JSON-schema tool for analyzing live comments', () => {
    expect(ANALYZE_LIVE_COMMENTS_TOOL.name).toBe('analyze_live_comments');
    const params = ANALYZE_LIVE_COMMENTS_TOOL.parameters as {
      type: string;
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(params.type).toBe('object');
    expect(params.required).toContain('comments');
    expect(params.properties).toHaveProperty('comments');
    expect(params.properties).toHaveProperty('streamState');
  });

  it('warns against following untrusted comment instructions', () => {
    expect(ANALYZE_LIVE_COMMENTS_TOOL.description.toLowerCase()).toContain(
      'untrusted'
    );
  });

  it('lists the tool in the aggregate export', () => {
    expect(COMMENT_INTELLIGENCE_AGENT_TOOLS).toContainEqual(
      ANALYZE_LIVE_COMMENTS_TOOL
    );
  });
});
