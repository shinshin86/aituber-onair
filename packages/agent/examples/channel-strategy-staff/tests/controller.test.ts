import { createChatServiceBackend } from '@aituber-onair/agent/chat';
import type { AgentEvent } from '@aituber-onair/agent';
import { describe, expect, it } from 'vitest';
import { createChannelStrategyController } from '../server/controller.js';
import { createDemoChatService } from '../server/demoChatService.js';

describe('channel strategy controller', () => {
  it('exposes the same fixture window to the dashboard as to the Tools', async () => {
    const backend = createChatServiceBackend({
      provider: 'openai',
      createChatService: ({ tools }) => createDemoChatService(tools),
    });
    const controller = await createChannelStrategyController({ backend });
    try {
      const { dashboard } = controller;

      expect(dashboard.days).toBe(90);
      expect(dashboard.streams).toHaveLength(12);
      expect(dashboard.platforms.map((entry) => entry.platform)).toEqual([
        'youtube',
        'twitch',
      ]);
      expect(dashboard.strategies.map((entry) => entry.result)).toEqual([
        'supported',
        'refuted',
        'mixed',
      ]);
      const youtube = dashboard.platforms[0];
      expect(youtube.metrics.followersGained.status).toBe('unavailable');
      expect(
        dashboard.streams[0].publishedAt > dashboard.streams[1].publishedAt
      ).toBe(true);
      expect(
        dashboard.games.filter((game) => game.gameId === 'minecraft')
      ).toHaveLength(2);
    } finally {
      await controller.close();
    }
  });

  it('completes the expected five-Tool path and attaches an Artifact', async () => {
    const backend = createChatServiceBackend({
      provider: 'openai',
      maxToolRounds: 8,
      createChatService: ({ tools }) => createDemoChatService(tools),
    });
    const controller = await createChannelStrategyController({ backend });
    const events: AgentEvent[] = [];
    try {
      const result = await controller.runStrategy((event) =>
        events.push(event)
      );
      const requested = events.filter(
        (event) => event.type === 'tool.requested'
      );

      expect(requested).toHaveLength(5);
      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts[0]).toMatchObject({
        type: 'channel-strategy-proposal',
        version: 1,
        source: { turnId: result.turnId },
      });
      expect(events.some((event) => event.type === 'artifact.created')).toBe(
        true
      );
      expect(events.at(-1)?.type).toBe('turn.completed');
    } finally {
      await controller.close();
    }
  });

  it('documents the Tool-round budget by failing below the expected path', async () => {
    const backend = createChatServiceBackend({
      provider: 'openai',
      maxToolRounds: 4,
      createChatService: ({ tools }) => createDemoChatService(tools),
    });
    const controller = await createChannelStrategyController({ backend });
    try {
      await expect(controller.runStrategy(() => undefined)).rejects.toThrow(
        /exceeded 4 rounds/
      );
    } finally {
      await controller.close();
    }
  });
});
