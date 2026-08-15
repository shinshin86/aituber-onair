import type { AgentToolExecutionContext } from '@aituber-onair/agent';
import { describe, expect, it } from 'vitest';
import { createFixtureCompositeDataSource } from '../src/data/dataSource.js';
import {
  CHANNEL_TOOL_IDS,
  createEvidenceLedger,
  defineChannelTools,
} from '../src/tools.js';

const context: AgentToolExecutionContext = {
  agentId: 'test-agent',
  sessionId: 'test-session',
  turnId: 'test-turn',
  toolCallId: 'test-call',
  signal: new AbortController().signal,
};

describe('channel Tools', () => {
  it('registers exactly five read-only Tools with supported schemas', () => {
    const tools = defineChannelTools(
      createFixtureCompositeDataSource(),
      createEvidenceLedger()
    );

    expect(tools.map((tool) => tool.id)).toEqual(CHANNEL_TOOL_IDS);
    expect(tools.every((tool) => tool.risk === 'read')).toBe(true);
  });

  it('returns platform-by-platform overview without a combined scalar', async () => {
    const tools = defineChannelTools(
      createFixtureCompositeDataSource(),
      createEvidenceLedger()
    );
    const overview = tools.find((tool) => tool.id === 'channel.getOverview');
    if (!overview) throw new Error('Overview Tool is missing.');

    const output = (await overview.execute({}, context)) as {
      readonly byPlatform: Record<string, unknown>;
      readonly comparable: Record<string, unknown>;
      readonly notComparable: readonly string[];
      readonly metrics?: unknown;
    };

    expect(Object.keys(output.byPlatform).sort()).toEqual([
      'twitch',
      'youtube',
    ]);
    expect(output.metrics).toBeUndefined();
    expect(output.notComparable).toContain(
      'youtube.subscribersGained vs twitch.followersGained'
    );
  });
});
